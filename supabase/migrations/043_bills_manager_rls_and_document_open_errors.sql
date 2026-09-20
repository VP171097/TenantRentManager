-- =====================================================================
-- bills: managers (non-co-owner) have never had INSERT or DELETE
-- policies, and only got UPDATE via migration 041's co-owner fix — so a
-- regular manager with permissions granted could never actually
-- generate, edit, or delete a bill (fn_generate_bill/
-- fn_apply_pending_charges_now/fn_update_bill_charges are plain
-- `language plpgsql` functions, not `security definer`, so they run
-- under the calling manager's own RLS privileges). The UI never gated
-- "Generate Bill"/"Edit Bill"/"Delete Bill" behind a permission check
-- either, so this silently failed for every manager, not just an edge
-- case. Gate on can_edit_tenants, matching rent_revisions' existing
-- pattern for tenant-account-affecting writes.
-- =====================================================================

create policy bills_manager_insert on bills for insert
  with check (fn_manager_has_perm(property_id, 'can_edit_tenants'));

create policy bills_manager_update on bills for update
  using (fn_manager_has_perm(property_id, 'can_edit_tenants'))
  with check (fn_manager_has_perm(property_id, 'can_edit_tenants'));

create policy bills_manager_delete on bills for delete
  using (fn_manager_has_perm(property_id, 'can_edit_tenants'));

-- =====================================================================
-- fn_update_bill_full (full "Edit Bill" flow) recomputes total_due and
-- balance but never recomputes status — so correcting a bill's charges
-- after it was paid (or after a partial payment) can leave a stale PAID
-- badge on a bill that now has money outstanding, or vice versa.
-- fn_update_bill_charges (009) already gets this right; bring
-- fn_update_bill_full in line with the exact same status formula.
-- =====================================================================
create or replace function fn_update_bill_full(
  p_bill_id uuid,
  p_rent_amount numeric,
  p_previous_reading numeric,
  p_current_reading numeric,
  p_rate_per_unit numeric,
  p_is_meter_reset boolean,
  p_other_charges numeric,
  p_late_fee numeric,
  p_notes text default null,
  p_is_billed boolean default true
) returns bills language plpgsql as $$
declare
  v_bill bills;
  v_units numeric;
  v_charge numeric;
  v_total_due numeric;
begin
  select * into v_bill from bills where id = p_bill_id;
  if not found then
    raise exception 'Bill not found';
  end if;

  v_units := case when p_is_meter_reset then greatest(p_current_reading, 0)
                  else greatest(p_current_reading - p_previous_reading, 0) end;
  v_charge := case when p_is_billed then v_units * p_rate_per_unit else 0 end;

  insert into electricity_readings(
    room_id, tenant_id, billing_month, previous_reading, current_reading,
    rate_per_unit, is_meter_reset, is_billed
  ) values (
    v_bill.room_id, v_bill.tenant_id, v_bill.billing_month, p_previous_reading, p_current_reading,
    p_rate_per_unit, p_is_meter_reset, p_is_billed
  )
  on conflict (tenant_id, billing_month) do update set
    previous_reading = excluded.previous_reading,
    current_reading = excluded.current_reading,
    rate_per_unit = excluded.rate_per_unit,
    is_meter_reset = excluded.is_meter_reset,
    is_billed = excluded.is_billed;

  v_total_due := p_rent_amount + v_charge + p_other_charges + p_late_fee + v_bill.previous_balance - v_bill.previous_credit;

  update bills set
    rent_amount = p_rent_amount,
    electricity_units = v_units,
    electricity_charge = v_charge,
    previous_electricity_reading = p_previous_reading,
    current_electricity_reading = p_current_reading,
    other_charges = p_other_charges,
    late_fee = p_late_fee,
    notes = p_notes,
    total_due = v_total_due,
    balance = v_total_due - v_bill.total_paid,
    status = (case
      when (v_total_due - v_bill.total_paid) <= 0 then 'paid'
      when v_bill.total_paid > 0 then 'partial'
      else 'unpaid'
    end)::bill_status_enum
  where id = p_bill_id
  returning * into v_bill;

  return v_bill;
end;
$$;

-- =====================================================================
-- fn_settle_move_out's "existing bill" branch (034) has the same missing
-- status recompute as fn_update_bill_full above: extending an
-- already-paid month's bill with a final electricity charge/deposit
-- deduction updates total_due/balance but leaves status untouched, so a
-- bill that now has money outstanding can still show as "paid".
-- =====================================================================
create or replace function fn_settle_move_out(
  p_tenant_id uuid,
  p_move_out_date date,
  p_final_billing_month date,
  p_final_current_reading numeric,
  p_deposit_deduction numeric default 0,
  p_deduction_reason text default null
) returns bills language plpgsql as $$
declare
  v_tenant tenants;
  v_room_id uuid;
  v_rate numeric;
  v_prev_reading numeric;
  v_bill bills;
  v_existing_bill bills;
  v_deposit_refund numeric;
  v_units numeric;
  v_charge numeric;
  v_total_due numeric;
  v_note text;
begin
  select * into v_tenant from tenants where id = p_tenant_id;
  if not found then raise exception 'Tenant not found'; end if;

  v_room_id := v_tenant.room_id;

  select coalesce(current_reading, 0) into v_prev_reading
    from electricity_readings
    where tenant_id = p_tenant_id and billing_month < p_final_billing_month
    order by billing_month desc limit 1;
  v_prev_reading := coalesce(v_prev_reading, 0);

  v_rate := fn_applicable_electricity_rate(v_room_id, p_final_billing_month);
  if v_rate is null then v_rate := 0; end if;

  insert into electricity_readings(room_id, tenant_id, billing_month, previous_reading, current_reading, rate_per_unit, is_billed)
  values (v_room_id, p_tenant_id, p_final_billing_month, v_prev_reading, p_final_current_reading, v_rate, true)
  on conflict (tenant_id, billing_month) do update
    set current_reading = excluded.current_reading, rate_per_unit = excluded.rate_per_unit, is_billed = true;

  v_deposit_refund := v_tenant.security_deposit - p_deposit_deduction;
  v_note := 'Move-out settlement. ' || coalesce(p_deduction_reason, '');

  select * into v_existing_bill from bills where tenant_id = p_tenant_id and billing_month = p_final_billing_month;

  if found then
    v_units := greatest(p_final_current_reading - v_prev_reading, 0);
    v_charge := v_units * v_rate;
    v_total_due := v_existing_bill.rent_amount + v_charge + (v_existing_bill.other_charges - v_deposit_refund)
      + v_existing_bill.late_fee + v_existing_bill.previous_balance - v_existing_bill.previous_credit;

    update bills set
      electricity_units = v_units,
      electricity_charge = v_charge,
      previous_electricity_reading = v_prev_reading,
      current_electricity_reading = p_final_current_reading,
      other_charges = v_existing_bill.other_charges - v_deposit_refund,
      total_due = v_total_due,
      balance = v_total_due - total_paid,
      status = (case
        when (v_total_due - v_existing_bill.total_paid) <= 0 then 'paid'
        when v_existing_bill.total_paid > 0 then 'partial'
        else 'unpaid'
      end)::bill_status_enum,
      notes = trim(both ' ' from coalesce(v_existing_bill.notes, '') || ' ' || v_note)
    where id = v_existing_bill.id
    returning * into v_bill;
  else
    v_bill := fn_generate_bill(p_tenant_id, p_final_billing_month, -v_deposit_refund, 0);
    if v_bill.notes is null then
      update bills set notes = v_note
      where id = v_bill.id
      returning * into v_bill;
    end if;
  end if;

  update tenants set status = 'moved_out', move_out_date = p_move_out_date, room_id = null
  where id = p_tenant_id;

  update rooms set status = 'vacant' where id = v_room_id;

  return v_bill;
end;
$$;

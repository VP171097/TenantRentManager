-- =====================================================================
-- 034: Fix Move Out silently dropping the final electricity charge and
-- deposit refund when a bill already exists for that month.
-- =====================================================================
-- fn_settle_move_out calls fn_generate_bill, which is intentionally
-- idempotent for the ordinary "click Generate Bill twice" case — if a
-- bill already exists for that tenant/month it just returns it
-- unchanged. But that means: rent bill generated normally at the start
-- of the month, tenant decides to move out 10 days later (rent already
-- paid) — Move Out's final electricity reading and deposit refund/
-- deduction were silently thrown away, since fn_generate_bill just
-- handed back the untouched existing bill.
--
-- This is exactly the "generate an electricity-only bill" ask: when
-- rent for the month is already settled, the move-out settlement should
-- extend that SAME bill with the final electricity reading and deposit
-- adjustment, so the tenant's new balance is purely that delta (usually
-- just electricity), not a whole new rent charge.

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

  -- Does a bill already exist for this month (rent already billed —
  -- and possibly already paid — before the tenant decided to move
  -- out)? If so, extend it in place with the final electricity reading
  -- and deposit adjustment rather than silently no-op'ing.
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

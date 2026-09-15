-- =====================================================================
-- 035: Move-out settlement — visible/editable previous reading, and a
-- choice of what to bill (rent + electricity, rent only, or electricity
-- only).
-- =====================================================================
-- Previously the previous electricity reading was looked up silently
-- server-side with no way to see or correct it, and rent was always
-- included in a freshly-created move-out bill with no way to bill
-- electricity only (e.g. this month's rent was already paid separately)
-- or rent only (e.g. electricity is settled through some other means).

create or replace function fn_settle_move_out(
  p_tenant_id uuid,
  p_move_out_date date,
  p_final_billing_month date,
  p_final_current_reading numeric,
  p_deposit_deduction numeric default 0,
  p_deduction_reason text default null,
  p_previous_reading numeric default null,
  p_bill_rent boolean default true,
  p_bill_electricity boolean default true
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
  v_rent numeric;
  v_other_charges numeric;
  v_total_due numeric;
  v_note text;
begin
  select * into v_tenant from tenants where id = p_tenant_id;
  if not found then raise exception 'Tenant not found'; end if;

  v_room_id := v_tenant.room_id;

  -- Caller-supplied previous reading (shown/editable in the Move-out
  -- dialog) takes precedence; fall back to the auto-lookup only when not
  -- provided.
  if p_previous_reading is not null then
    v_prev_reading := p_previous_reading;
  else
    select coalesce(current_reading, 0) into v_prev_reading
      from electricity_readings
      where tenant_id = p_tenant_id and billing_month < p_final_billing_month
      order by billing_month desc limit 1;
    v_prev_reading := coalesce(v_prev_reading, 0);
  end if;

  v_rate := fn_applicable_electricity_rate(v_room_id, p_final_billing_month);
  if v_rate is null then v_rate := 0; end if;

  v_units := greatest(p_final_current_reading - v_prev_reading, 0);
  v_charge := case when p_bill_electricity then v_units * v_rate else 0 end;

  insert into electricity_readings(room_id, tenant_id, billing_month, previous_reading, current_reading, rate_per_unit, is_billed)
  values (v_room_id, p_tenant_id, p_final_billing_month, v_prev_reading, p_final_current_reading, v_rate, p_bill_electricity)
  on conflict (tenant_id, billing_month) do update
    set previous_reading = excluded.previous_reading,
        current_reading = excluded.current_reading,
        rate_per_unit = excluded.rate_per_unit,
        is_billed = excluded.is_billed;

  v_deposit_refund := v_tenant.security_deposit - p_deposit_deduction;
  v_note := 'Move-out settlement. ' || coalesce(p_deduction_reason, '');

  -- Does a bill already exist for this month (rent already billed —
  -- and possibly already paid — before the tenant decided to move
  -- out)? If so, extend it in place with the final electricity reading
  -- and deposit adjustment (its rent_amount, already billed, is left
  -- untouched regardless of p_bill_rent — that choice only applies to a
  -- freshly-created bill below).
  select * into v_existing_bill from bills where tenant_id = p_tenant_id and billing_month = p_final_billing_month;

  if found then
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
    v_rent := case when p_bill_rent then fn_applicable_rent(p_tenant_id, p_final_billing_month) else 0 end;
    if p_bill_rent and v_rent is null then
      raise exception 'No rent revision found for tenant as of %', p_final_billing_month;
    end if;
    v_rent := coalesce(v_rent, 0);
    v_other_charges := -v_deposit_refund;

    declare
      v_prev_bill bills;
      v_prev_balance numeric := 0;
      v_prev_credit numeric := 0;
    begin
      select * into v_prev_bill from bills
        where tenant_id = p_tenant_id and billing_month < p_final_billing_month
        order by billing_month desc limit 1;
      if found then
        if v_prev_bill.balance > 0 then v_prev_balance := v_prev_bill.balance;
        elsif v_prev_bill.balance < 0 then v_prev_credit := abs(v_prev_bill.balance);
        end if;
      end if;

      v_total_due := v_rent + v_charge + v_other_charges + v_prev_balance - v_prev_credit;

      insert into bills (
        tenant_id, property_id, room_id, billing_month,
        rent_amount, electricity_units, electricity_charge,
        other_charges, late_fee, previous_balance, previous_credit,
        total_due, balance, previous_electricity_reading, current_electricity_reading, notes
      ) values (
        p_tenant_id, v_tenant.property_id, v_tenant.room_id, p_final_billing_month,
        v_rent, v_units, v_charge,
        v_other_charges, 0, v_prev_balance, v_prev_credit,
        v_total_due, v_total_due, v_prev_reading, p_final_current_reading, v_note
      ) returning * into v_bill;
    end;
  end if;

  update tenants set status = 'moved_out', move_out_date = p_move_out_date, room_id = null
  where id = p_tenant_id;

  update rooms set status = 'vacant' where id = v_room_id;

  return v_bill;
end;
$$;

-- =====================================================================
-- 013: Fixes the "regenerate a bill after entering electricity still
-- shows ₹0 electricity" trap (fn_generate_bill is intentionally
-- idempotent — it returns the existing bill unchanged rather than
-- recomputing it) by letting Edit Bill correct ALL correctable fields on
-- an already-generated bill: rent_amount (manual override), the
-- electricity reading inputs (previous/current reading, rate — which
-- also upserts the backing electricity_readings row so the two stay in
-- sync), plus the existing other_charges/late_fee/notes.
--
-- billing_month is NOT editable here (identity field — would collide
-- with the unique tenant+month constraint). previous_balance and
-- previous_credit are NOT editable here — they are derived from the
-- prior month's bill, not this bill's own inputs.
--
-- Same "cast the case-expression to bill_status_enum" fix as 007/009/011.
-- Supersedes fn_update_bill_charges (kept in place, unused, for any other
-- callers) with a new fn_update_bill_full used by the app going forward.
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
  p_notes text default null
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
  v_charge := v_units * p_rate_per_unit;

  -- Keep the electricity_readings row in sync (same upsert-by
  -- tenant_id+billing_month convention as recordElectricityReading).
  insert into electricity_readings(
    room_id, tenant_id, billing_month, previous_reading, current_reading,
    rate_per_unit, is_meter_reset
  ) values (
    v_bill.room_id, v_bill.tenant_id, v_bill.billing_month, p_previous_reading, p_current_reading,
    p_rate_per_unit, p_is_meter_reset
  )
  on conflict (tenant_id, billing_month) do update set
    previous_reading = excluded.previous_reading,
    current_reading = excluded.current_reading,
    rate_per_unit = excluded.rate_per_unit,
    is_meter_reset = excluded.is_meter_reset;

  v_total_due := p_rent_amount + v_charge + p_other_charges + p_late_fee
    + v_bill.previous_balance - v_bill.previous_credit;

  update bills set
    rent_amount = p_rent_amount,
    electricity_units = v_units,
    electricity_charge = v_charge,
    other_charges = p_other_charges,
    late_fee = p_late_fee,
    notes = coalesce(p_notes, notes),
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

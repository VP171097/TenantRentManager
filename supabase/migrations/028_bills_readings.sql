-- Add snapshot columns for electricity readings directly on the bill
alter table bills add column previous_electricity_reading numeric(12,2);
alter table bills add column current_electricity_reading numeric(12,2);

-- Update the generate_bill function to snapshot the readings
create or replace function fn_generate_bill(
  p_tenant_id uuid,
  p_billing_month date,
  p_other_charges numeric default 0,
  p_late_fee numeric default 0
) returns bills language plpgsql as $$
declare
  v_bill bills;
  v_tenant tenants;
  v_rent numeric;
  v_rate numeric;
  v_reading electricity_readings;
  v_units numeric := 0;
  v_charge numeric := 0;
  v_prev_bill bills;
  v_prev_balance numeric := 0;
  v_prev_credit numeric := 0;
  v_total_due numeric;
  v_prev_reading numeric := null;
  v_curr_reading numeric := null;
begin
  select * into v_tenant from tenants where id = p_tenant_id;
  if not found then
    raise exception 'Tenant not found';
  end if;

  -- idempotent: return existing bill if present
  select * into v_bill from bills where tenant_id = p_tenant_id and billing_month = p_billing_month;
  if found then
    return v_bill;
  end if;

  v_rent := fn_applicable_rent(p_tenant_id, p_billing_month);
  if v_rent is null then
    raise exception 'No rent revision found for tenant as of %', p_billing_month;
  end if;

  select * into v_reading from electricity_readings
    where tenant_id = p_tenant_id and billing_month = p_billing_month;
  if found then
    v_units := greatest(v_reading.current_reading - v_reading.previous_reading, 0);
    v_charge := v_units * v_reading.rate_per_unit;
    v_prev_reading := v_reading.previous_reading;
    v_curr_reading := v_reading.current_reading;
  end if;

  select * into v_prev_bill from bills
    where tenant_id = p_tenant_id and billing_month < p_billing_month
    order by billing_month desc limit 1;
  if found then
    if v_prev_bill.balance > 0 then
      v_prev_balance := v_prev_bill.balance;
    elsif v_prev_bill.balance < 0 then
      v_prev_credit := abs(v_prev_bill.balance);
    end if;
  end if;

  v_total_due := v_rent + v_charge + p_other_charges + p_late_fee + v_prev_balance - v_prev_credit;

  insert into bills (
    tenant_id, property_id, room_id, billing_month,
    rent_amount, electricity_units, electricity_charge,
    other_charges, late_fee, previous_balance, previous_credit,
    total_due, balance, previous_electricity_reading, current_electricity_reading
  ) values (
    p_tenant_id, v_tenant.property_id, v_tenant.room_id, p_billing_month,
    v_rent, v_units, v_charge,
    p_other_charges, p_late_fee, v_prev_balance, v_prev_credit,
    v_total_due, v_total_due, v_prev_reading, v_curr_reading
  ) returning * into v_bill;

  return v_bill;
end;
$$;

-- Update fn_update_bill_full to update the snapshot columns
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

  update bills set
    rent_amount = p_rent_amount,
    electricity_units = v_units,
    electricity_charge = v_charge,
    previous_electricity_reading = p_previous_reading,
    current_electricity_reading = p_current_reading,
    other_charges = p_other_charges,
    late_fee = p_late_fee,
    notes = p_notes
  where id = p_bill_id;

  v_total_due := p_rent_amount + v_charge + p_other_charges + p_late_fee + v_bill.previous_balance - v_bill.previous_credit;
  
  update bills set
    total_due = v_total_due,
    balance = v_total_due - total_paid
  where id = p_bill_id
  returning * into v_bill;

  return v_bill;
end;
$$;

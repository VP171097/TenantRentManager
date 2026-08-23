-- =====================================================================
-- Fix: fn_generate_bill's status expression was untyped text, which
-- Postgres refuses to implicitly cast into bill_status_enum on insert
-- ("column status is of type bill_status_enum but expression is of type
-- text"). Cast the case expression explicitly.
-- =====================================================================
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
  v_reading electricity_readings;
  v_units numeric := 0;
  v_charge numeric := 0;
  v_prev_bill bills;
  v_prev_balance numeric := 0;
  v_prev_credit numeric := 0;
  v_total_due numeric;
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

  insert into bills(
    tenant_id, property_id, room_id, billing_month, rent_amount,
    electricity_units, electricity_charge, other_charges, late_fee,
    previous_balance, previous_credit, total_due, total_paid, balance, status
  ) values (
    p_tenant_id, v_tenant.property_id, v_tenant.room_id, p_billing_month, v_rent,
    v_units, v_charge, p_other_charges, p_late_fee,
    v_prev_balance, v_prev_credit, v_total_due, 0, v_total_due,
    (case when v_total_due <= 0 then 'paid' else 'unpaid' end)::bill_status_enum
  )
  on conflict (tenant_id, billing_month) do nothing
  returning * into v_bill;

  if v_bill.id is null then
    -- concurrent insert happened; fetch the winning row
    select * into v_bill from bills where tenant_id = p_tenant_id and billing_month = p_billing_month;
  end if;

  return v_bill;
end;
$$;

-- fn_recalc_bill has the identical untyped-text-into-enum problem, hit as
-- soon as a payment is recorded (the payments_after_change trigger calls it).
create or replace function fn_recalc_bill(p_bill_id uuid) returns void language plpgsql as $$
declare
  v_total_paid numeric;
  v_bill bills;
begin
  select coalesce(sum(amount), 0) into v_total_paid from payments where bill_id = p_bill_id;
  select * into v_bill from bills where id = p_bill_id;
  update bills set
    total_paid = v_total_paid,
    balance = v_bill.total_due - v_total_paid,
    status = (case
      when (v_bill.total_due - v_total_paid) <= 0 then 'paid'
      when v_total_paid > 0 then 'partial'
      else 'unpaid'
    end)::bill_status_enum
  where id = p_bill_id;
end;
$$;

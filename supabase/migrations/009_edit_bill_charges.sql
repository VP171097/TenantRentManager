-- =====================================================================
-- Lets the owner edit a bill's other_charges/late_fee/notes after it has
-- been generated, while keeping total_due/balance/status derived
-- consistently (mirrors fn_recalc_bill's logic) instead of being
-- hand-computed and written directly from the client, which would drift
-- from the payments-trigger-driven total_paid.
--
-- rent_amount, electricity_units/electricity_charge and billing_month are
-- intentionally NOT editable here — they are the historical snapshot the
-- app's billing engine relies on never being overwritten.
--
-- Same "cast the case-expression to bill_status_enum" pattern as 007's fix
-- (Postgres will not implicitly cast text into an enum column).
-- =====================================================================
create or replace function fn_update_bill_charges(
  p_bill_id uuid,
  p_other_charges numeric,
  p_late_fee numeric,
  p_notes text default null
) returns bills language plpgsql as $$
declare
  v_bill bills;
  v_total_due numeric;
begin
  select * into v_bill from bills where id = p_bill_id;
  if not found then
    raise exception 'Bill not found';
  end if;

  v_total_due := v_bill.rent_amount + v_bill.electricity_charge + p_other_charges + p_late_fee
    + v_bill.previous_balance - v_bill.previous_credit;

  update bills set
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

-- =====================================================================
-- 011: fn_recalc_bill also clears the tenant_marked_paid flag whenever it
-- runs (i.e. whenever a real payment is recorded or removed against the
-- bill) — a real payment being recorded is exactly the moment a pending
-- "I've paid" claim gets resolved either way. This is more robust than
-- requiring an extra client-side update call from every payment-recording
-- code path, and avoids extra RLS complexity for managers.
--
-- Same "cast the case-expression to bill_status_enum" fix as 007/009 —
-- reproduced here since this migration replaces the whole function body.
-- =====================================================================
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
    end)::bill_status_enum,
    tenant_marked_paid = false,
    tenant_marked_paid_at = null,
    tenant_marked_paid_note = null
  where id = p_bill_id;
end;
$$;

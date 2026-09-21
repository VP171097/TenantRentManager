-- =====================================================================
-- Capture which payment method a tenant says they used when they tap
-- "I've Paid", so the owner's "Record Payment" form can be prefilled
-- with it instead of always defaulting to Cash.
-- =====================================================================
alter table bills add column if not exists tenant_marked_paid_method text;

create or replace function fn_tenant_mark_paid(p_bill_id uuid, p_note text default null, p_method text default null)
returns bills language plpgsql security definer set search_path = public as $$
declare
  v_bill bills;
begin
  if not exists (
    select 1 from bills b
    join tenants t on t.id = b.tenant_id
    where b.id = p_bill_id and t.profile_id = auth.uid()
  ) then
    raise exception 'Not authorized to mark this bill as paid';
  end if;

  update bills set
    tenant_marked_paid = true,
    tenant_marked_paid_at = now(),
    tenant_marked_paid_note = p_note,
    tenant_marked_paid_method = p_method
  where id = p_bill_id
  returning * into v_bill;

  return v_bill;
end;
$$;

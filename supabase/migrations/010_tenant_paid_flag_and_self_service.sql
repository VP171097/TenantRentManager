-- =====================================================================
-- 010: Tenant "I've paid" flag, tenant self-service profile edit, and
-- tenant self-upload of ID documents.
-- =====================================================================

-- ---------------------------------------------------------------------
-- bills: tenant_marked_paid flag
-- ---------------------------------------------------------------------
alter table bills add column tenant_marked_paid boolean not null default false;
alter table bills add column tenant_marked_paid_at timestamptz;
alter table bills add column tenant_marked_paid_note text;

-- Tenant marks their own bill as paid. SECURITY DEFINER so it can bypass
-- the (intentionally narrow) bills RLS policies, but it does its own
-- authorization check first: the caller must be the tenant who owns this
-- bill. Only the 3 tenant_marked_paid* columns are touched — never
-- balance/status/total_paid, which stay derived from real payments.
create or replace function fn_tenant_mark_paid(p_bill_id uuid, p_note text default null)
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
    tenant_marked_paid_note = p_note
  where id = p_bill_id
  returning * into v_bill;

  return v_bill;
end;
$$;

-- Owner or manager (with can_record_payments on that property) dismisses a
-- tenant's "I've paid" claim without recording a payment (e.g. mistaken
-- claim). SECURITY DEFINER with its own explicit authorization check,
-- mirroring fn_manager_has_perm's permission-check pattern.
create or replace function fn_dismiss_tenant_paid_flag(p_bill_id uuid)
returns bills language plpgsql security definer set search_path = public as $$
declare
  v_bill bills;
  v_authorized boolean;
begin
  select
    exists(select 1 from properties p where p.id = v_b.property_id and p.owner_id = auth.uid())
    or fn_manager_has_perm(v_b.property_id, 'can_record_payments')
  into v_authorized
  from bills v_b where v_b.id = p_bill_id;

  if v_authorized is null then
    raise exception 'Bill not found';
  end if;
  if not v_authorized then
    raise exception 'Not authorized to dismiss this flag';
  end if;

  update bills set
    tenant_marked_paid = false,
    tenant_marked_paid_at = null,
    tenant_marked_paid_note = null
  where id = p_bill_id
  returning * into v_bill;

  return v_bill;
end;
$$;

-- ---------------------------------------------------------------------
-- tenants: self-service profile edit (phone/email only)
-- ---------------------------------------------------------------------
create or replace function fn_tenant_update_own_profile(p_phone text, p_email text)
returns tenants language plpgsql security definer set search_path = public as $$
declare
  v_tenant tenants;
begin
  if not exists (select 1 from tenants where profile_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update tenants set
    phone = coalesce(p_phone, phone),
    email = p_email
  where profile_id = auth.uid()
  returning * into v_tenant;

  return v_tenant;
end;
$$;

-- ---------------------------------------------------------------------
-- tenant_documents: allow tenants to insert their own documents
-- ---------------------------------------------------------------------
create policy tenant_documents_self_insert on tenant_documents for insert
  with check (exists(select 1 from tenants t where t.id = tenant_documents.tenant_id and t.profile_id = auth.uid()));

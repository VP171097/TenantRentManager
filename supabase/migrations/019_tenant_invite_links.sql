-- =====================================================================
-- Tenant self-registration via a shareable invite link. Owner generates a
-- link (any channel — WhatsApp, SMS, email, in person) that lets the
-- tenant set their own password and create their own login, rather than
-- the owner always having to set one for them (create-tenant-login still
-- works too — this is an additional option).
-- =====================================================================

alter table tenants add column if not exists invite_token text unique;
alter table tenants add column if not exists invite_token_expires_at timestamptz;

create index if not exists idx_tenants_invite_token on tenants(invite_token) where invite_token is not null;

-- Owner generates (or regenerates) an invite link for one of their own
-- tenants. SECURITY DEFINER with its own explicit ownership check, same
-- pattern as fn_tenant_mark_paid/fn_dismiss_tenant_paid_flag in 010.
create or replace function fn_generate_tenant_invite(p_tenant_id uuid)
returns tenants language plpgsql security definer set search_path = public as $$
declare
  v_tenant tenants;
begin
  if not exists (select 1 from tenants where id = p_tenant_id and owner_id = auth.uid()) then
    raise exception 'Not authorized to invite this tenant';
  end if;

  update tenants set
    invite_token = encode(gen_random_bytes(24), 'hex'),
    invite_token_expires_at = now() + interval '7 days'
  where id = p_tenant_id
  returning * into v_tenant;

  return v_tenant;
end;
$$;

-- Owner revokes an outstanding invite link (e.g. sent to the wrong person).
create or replace function fn_revoke_tenant_invite(p_tenant_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from tenants where id = p_tenant_id and owner_id = auth.uid()) then
    raise exception 'Not authorized to revoke this invite';
  end if;

  update tenants set invite_token = null, invite_token_expires_at = null
  where id = p_tenant_id;
end;
$$;

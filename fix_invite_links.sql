-- Fix invite link generation to avoid search_path issues with gen_random_bytes
-- Also allows managers to invite tenants (tenant invite only).

-- =========================================================
-- TENANT INVITES
-- =========================================================
create or replace function fn_generate_tenant_invite(p_tenant_id uuid)
returns tenants language plpgsql security definer set search_path = public as $$
declare
  v_tenant tenants;
begin
  if not exists (
    select 1 from tenants t
    where t.id = p_tenant_id 
      and (t.owner_id = auth.uid() or t.owner_id = (select owner_id from profiles where id = auth.uid()))
  ) then
    raise exception 'Not authorized to invite this tenant';
  end if;

  update tenants set
    -- Use pg_catalog's gen_random_uuid to avoid schema path issues with pgcrypto
    invite_token = replace(gen_random_uuid()::text, '-', ''),
    invite_token_expires_at = now() + interval '7 days'
  where id = p_tenant_id
  returning * into v_tenant;

  return v_tenant;
end;
$$;

create or replace function fn_revoke_tenant_invite(p_tenant_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from tenants t
    where t.id = p_tenant_id 
      and (t.owner_id = auth.uid() or t.owner_id = (select owner_id from profiles where id = auth.uid()))
  ) then
    raise exception 'Not authorized to revoke this invite';
  end if;

  update tenants set invite_token = null, invite_token_expires_at = null
  where id = p_tenant_id;
end;
$$;


-- =========================================================
-- MANAGER INVITES
-- =========================================================
create or replace function fn_generate_manager_invite(p_manager_id uuid)
returns managers language plpgsql security definer set search_path = public as $$
declare
  v_manager managers;
begin
  if not exists (select 1 from managers where id = p_manager_id and owner_id = auth.uid()) then
    raise exception 'Not authorized to invite this manager';
  end if;

  update managers set
    -- Use pg_catalog's gen_random_uuid to avoid schema path issues with pgcrypto
    invite_token = replace(gen_random_uuid()::text, '-', ''),
    invite_token_expires_at = now() + interval '7 days'
  where id = p_manager_id
  returning * into v_manager;

  return v_manager;
end;
$$;

create or replace function fn_revoke_manager_invite(p_manager_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from managers where id = p_manager_id and owner_id = auth.uid()) then
    raise exception 'Not authorized to revoke this invite';
  end if;

  update managers set invite_token = null, invite_token_expires_at = null
  where id = p_manager_id;
end;
$$;

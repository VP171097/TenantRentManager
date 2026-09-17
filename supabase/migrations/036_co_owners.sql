-- =====================================================================
-- Co-owners: a manager flagged is_co_owner gets full, automatic access
-- to everything the property owner has — every property (current and
-- future, no per-property permission checkboxes needed), the ability to
-- create/edit/delete properties/rooms/tenants, manage other managers,
-- generate invites, upload branding/documents/maintenance media, etc.
--
-- Implementation: co-owners are still `managers` rows (so they sign in
-- exactly like a manager, tied to owner_id) but are exempted from the
-- per-property manager_permissions system, and granted the same RLS
-- reach as the owner via a new fn_is_owner_or_co_owner() helper used
-- alongside the existing owner-only policies.
-- =====================================================================

alter table managers add column if not exists is_co_owner boolean not null default false;

-- True for the real owner, or for a co-owner belonging to that owner.
create or replace function fn_is_owner_or_co_owner(p_owner_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select
    p_owner_id = auth.uid()
    or exists(
      select 1 from managers m
      where m.profile_id = auth.uid() and m.owner_id = p_owner_id and m.is_co_owner
    )
$$;

-- ---------------------------------------------------------------------
-- Make the existing manager-permission machinery co-owner-aware — this
-- alone covers every table whose manager policies already call these
-- two functions (rooms, tenants, tenant_documents, rent_revisions,
-- electricity_readings, bills, payments, receipts, receipt_counters,
-- expenses, maintenance_requests): a co-owner now passes every flag
-- check on every property owned by their owner, with no
-- manager_permissions rows needed.
-- ---------------------------------------------------------------------
create or replace function fn_manager_has_perm(p_property_id uuid, p_flag text) returns boolean
language plpgsql security definer stable set search_path = public as $$
declare v_manager_id uuid; v_is_co_owner boolean; v_owner_id uuid; v_ok boolean;
begin
  select id, is_co_owner, owner_id into v_manager_id, v_is_co_owner, v_owner_id
  from managers where profile_id = auth.uid();
  if v_manager_id is null then return false; end if;
  if v_is_co_owner then
    return exists(select 1 from properties p where p.id = p_property_id and p.owner_id = v_owner_id);
  end if;
  execute format('select %I from manager_permissions where manager_id = $1 and property_id = $2', p_flag)
    into v_ok using v_manager_id, p_property_id;
  return coalesce(v_ok, false);
end;
$$;

create or replace function fn_can_access_property(p_property_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select
    case fn_my_role()
      when 'owner' then exists(select 1 from properties where id = p_property_id and owner_id = auth.uid())
      when 'manager' then (
        exists(
          select 1 from managers m
          join properties p on p.owner_id = m.owner_id
          where m.profile_id = auth.uid() and m.is_co_owner and p.id = p_property_id
        )
        or exists(
          select 1 from manager_permissions mp
          join managers m on m.id = mp.manager_id
          where m.profile_id = auth.uid() and mp.property_id = p_property_id and mp.can_view_tenants
        )
      )
      else false
    end
$$;

-- ---------------------------------------------------------------------
-- Operations with no manager-permission equivalent at all today (only
-- the owner could do these) — add co-owner-scoped policies alongside
-- the existing owner-only ones, so co-owners get true parity here too.
-- ---------------------------------------------------------------------

-- properties: create/edit/delete (previously owner-only; managers only
-- ever had read access to properties they were given).
create policy properties_co_owner_all on properties for all
  using (fn_is_owner_or_co_owner(owner_id)) with check (fn_is_owner_or_co_owner(owner_id));

-- rooms: delete (create/edit already covered by fn_manager_has_perm
-- above via can_manage_rooms, but delete has never been available to
-- managers).
create policy rooms_co_owner_delete on rooms for delete
  using (exists(select 1 from properties p where p.id = rooms.property_id and fn_is_owner_or_co_owner(p.owner_id)));

-- tenants: delete (create/edit already covered by fn_manager_has_perm).
create policy tenants_co_owner_delete on tenants for delete
  using (fn_is_owner_or_co_owner(owner_id));

-- managers & manager_permissions: co-owners can see/add/edit/remove
-- other managers, same as the owner (but see the guard in application
-- code / edge functions preventing a co-owner from promoting themself
-- or being demoted by another non-owner — enforced at the app layer).
create policy managers_co_owner_all on managers for all
  using (fn_is_owner_or_co_owner(owner_id)) with check (fn_is_owner_or_co_owner(owner_id));

create policy manager_permissions_co_owner_all on manager_permissions for all
  using (exists(select 1 from managers m where m.id = manager_permissions.manager_id and fn_is_owner_or_co_owner(m.owner_id)))
  with check (exists(select 1 from managers m where m.id = manager_permissions.manager_id and fn_is_owner_or_co_owner(m.owner_id)));

-- audit_log / audit_logs: co-owners can see the same audit trail the
-- owner sees.
create policy audit_log_co_owner_all on audit_log for all
  using (fn_is_owner_or_co_owner(owner_id)) with check (fn_is_owner_or_co_owner(owner_id));

create policy audit_logs_co_owner_select on audit_logs for select
  using (fn_is_owner_or_co_owner(owner_id));

-- upi_ids: co-owners can add/edit UPI IDs, not just view them.
create policy upi_ids_co_owner_all on upi_ids for all
  using (fn_is_owner_or_co_owner(owner_id)) with check (fn_is_owner_or_co_owner(owner_id));

-- profiles: let a co-owner (or any manager) see the real owner's own
-- profile row too (branding logo, UPI, etc.) — previously only sibling
-- tenant/manager rows under the same owner_id were visible, not the
-- owner's own row (whose owner_id column is null).
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or owner_id = auth.uid()
    or id = fn_my_owner_id()
    or (fn_my_role() in ('manager','tenant') and owner_id = fn_my_owner_id())
  );

-- ---------------------------------------------------------------------
-- Storage: co-owners can read/write under the real owner's folder
-- prefix in every owner-scoped bucket, same as the owner.
-- ---------------------------------------------------------------------
create policy storage_co_owner_all on storage.objects for all
  using (bucket_id = 'tenant-documents' and fn_is_owner_or_co_owner((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'tenant-documents' and fn_is_owner_or_co_owner((storage.foldername(name))[1]::uuid));

create policy branding_co_owner_write on storage.objects for insert
  with check (bucket_id = 'branding' and fn_is_owner_or_co_owner((storage.foldername(name))[1]::uuid));

create policy branding_co_owner_update on storage.objects for update
  using (bucket_id = 'branding' and fn_is_owner_or_co_owner((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'branding' and fn_is_owner_or_co_owner((storage.foldername(name))[1]::uuid));

create policy branding_co_owner_delete on storage.objects for delete
  using (bucket_id = 'branding' and fn_is_owner_or_co_owner((storage.foldername(name))[1]::uuid));

create policy storage_co_owner_all_maintenance on storage.objects for all
  using (bucket_id = 'maintenance-media' and fn_is_owner_or_co_owner((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'maintenance-media' and fn_is_owner_or_co_owner((storage.foldername(name))[1]::uuid));

-- ---------------------------------------------------------------------
-- Invite/revoke RPCs: let a co-owner generate/revoke tenant and manager
-- invite links too, not just the literal owner.
-- ---------------------------------------------------------------------
create or replace function fn_generate_tenant_invite(p_tenant_id uuid) returns tenants
language plpgsql security definer set search_path = public as $$
declare v_tenant tenants;
begin
  if not exists (select 1 from tenants where id = p_tenant_id and fn_is_owner_or_co_owner(owner_id)) then
    raise exception 'Not authorized';
  end if;
  update tenants
    set invite_token = encode(gen_random_bytes(24), 'hex'),
        invite_token_expires_at = now() + interval '7 days'
    where id = p_tenant_id
    returning * into v_tenant;
  return v_tenant;
end;
$$;

create or replace function fn_revoke_tenant_invite(p_tenant_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from tenants where id = p_tenant_id and fn_is_owner_or_co_owner(owner_id)) then
    raise exception 'Not authorized';
  end if;
  update tenants set invite_token = null, invite_token_expires_at = null where id = p_tenant_id;
end;
$$;

create or replace function fn_generate_manager_invite(p_manager_id uuid) returns managers
language plpgsql security definer set search_path = public as $$
declare v_manager managers;
begin
  if not exists (select 1 from managers where id = p_manager_id and fn_is_owner_or_co_owner(owner_id)) then
    raise exception 'Not authorized';
  end if;
  update managers
    set invite_token = encode(gen_random_bytes(24), 'hex'),
        invite_token_expires_at = now() + interval '7 days'
    where id = p_manager_id
    returning * into v_manager;
  return v_manager;
end;
$$;

create or replace function fn_revoke_manager_invite(p_manager_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from managers where id = p_manager_id and fn_is_owner_or_co_owner(owner_id)) then
    raise exception 'Not authorized';
  end if;
  update managers set invite_token = null, invite_token_expires_at = null where id = p_manager_id;
end;
$$;

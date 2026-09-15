-- =====================================================================
-- Maintenance Media
-- =====================================================================

alter table maintenance_requests add column if not exists images text[] default '{}';
alter table maintenance_requests add column if not exists resolution_images text[] default '{}';
alter table maintenance_requests add column if not exists resolution_notes text;

-- Storage bucket for maintenance media
insert into storage.buckets (id, name, public)
values ('maintenance-media', 'maintenance-media', false)
on conflict (id) do nothing;

-- Owners: full access to files under their own owner_id prefix.
create policy storage_owner_all_maintenance on storage.objects for all
  using (
    bucket_id = 'maintenance-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'maintenance-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Managers: access files under a property they have can_manage_rooms for
create policy storage_manager_all_maintenance on storage.objects for all
  using (
    bucket_id = 'maintenance-media'
    and exists (
      select 1 from managers m
      join manager_permissions mp on mp.manager_id = m.id
      join properties p on p.id = mp.property_id
      where m.profile_id = auth.uid()
        and mp.can_manage_rooms
        and (storage.foldername(name))[1] = p.owner_id::text
        and (storage.foldername(name))[2] = p.id::text
    )
  )
  with check (
    bucket_id = 'maintenance-media'
    and exists (
      select 1 from managers m
      join manager_permissions mp on mp.manager_id = m.id
      join properties p on p.id = mp.property_id
      where m.profile_id = auth.uid()
        and mp.can_manage_rooms
        and (storage.foldername(name))[1] = p.owner_id::text
        and (storage.foldername(name))[2] = p.id::text
    )
  );

-- Tenants: access only their own property's media
-- (A bit broad, but they can only see files in their property. Better: limit to their own tenant_id if stored as {owner_id}/{property_id}/{tenant_id}/{filename})
create policy storage_tenant_select_maintenance on storage.objects for select
  using (
    bucket_id = 'maintenance-media'
    and exists (
      select 1 from tenants t
      where t.profile_id = auth.uid()
        and (storage.foldername(name))[1] = t.owner_id::text
        and (storage.foldername(name))[2] = t.property_id::text
        and (storage.foldername(name))[3] = t.id::text
    )
  );

create policy storage_tenant_insert_maintenance on storage.objects for insert
  with check (
    bucket_id = 'maintenance-media'
    and exists (
      select 1 from tenants t
      where t.profile_id = auth.uid()
        and (storage.foldername(name))[1] = t.owner_id::text
        and (storage.foldername(name))[2] = t.property_id::text
        and (storage.foldername(name))[3] = t.id::text
    )
  );

-- =====================================================================
-- Storage bucket for private tenant documents
-- Path convention: {owner_id}/{property_id}/{tenant_id}/{filename}
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('tenant-documents', 'tenant-documents', false)
on conflict (id) do nothing;

-- Owners: full access to files under their own owner_id prefix.
create policy storage_owner_all on storage.objects for all
  using (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Managers: access files under a property they have can_view_tenants /
-- can_edit_tenants for, scoped to their owner's prefix.
create policy storage_manager_select on storage.objects for select
  using (
    bucket_id = 'tenant-documents'
    and exists (
      select 1 from managers m
      join manager_permissions mp on mp.manager_id = m.id
      join properties p on p.id = mp.property_id
      where m.profile_id = auth.uid()
        and mp.can_view_tenants
        and (storage.foldername(name))[1] = p.owner_id::text
        and (storage.foldername(name))[2] = p.id::text
    )
  );

create policy storage_manager_insert on storage.objects for insert
  with check (
    bucket_id = 'tenant-documents'
    and exists (
      select 1 from managers m
      join manager_permissions mp on mp.manager_id = m.id
      join properties p on p.id = mp.property_id
      where m.profile_id = auth.uid()
        and mp.can_edit_tenants
        and (storage.foldername(name))[1] = p.owner_id::text
        and (storage.foldername(name))[2] = p.id::text
    )
  );

-- Tenants: access only their own folder.
create policy storage_tenant_select on storage.objects for select
  using (
    bucket_id = 'tenant-documents'
    and exists (
      select 1 from tenants t
      where t.profile_id = auth.uid()
        and (storage.foldername(name))[1] = t.owner_id::text
        and (storage.foldername(name))[2] = t.property_id::text
        and (storage.foldername(name))[3] = t.id::text
    )
  );

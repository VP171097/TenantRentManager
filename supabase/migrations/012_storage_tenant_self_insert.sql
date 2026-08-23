-- =====================================================================
-- 012: Allow tenants to upload (INSERT) their own ID documents into
-- storage, mirroring storage_tenant_select's folder-prefix check.
-- =====================================================================
create policy storage_tenant_insert on storage.objects for insert
  with check (
    bucket_id = 'tenant-documents'
    and exists (
      select 1 from tenants t
      where t.profile_id = auth.uid()
        and (storage.foldername(name))[1] = t.owner_id::text
        and (storage.foldername(name))[2] = t.property_id::text
        and (storage.foldername(name))[3] = t.id::text
    )
  );

-- =====================================================================
-- Branding: owner logo + per-property cover image
-- =====================================================================

-- Owner's branding logo (shown in the app header and on generated PDFs).
-- Same shape as upi_id in 008: a plain column on profiles, only meaningful
-- on owner rows.
alter table profiles add column if not exists logo_url text;

-- Optional cover photo per property, shown on the property card/list and
-- the property detail page header banner.
alter table properties add column if not exists cover_image_url text;

-- New public storage bucket for branding images (logos, cover photos).
-- Public read (these are display images shown to tenants too, e.g. bill
-- PDFs and the tenant portal) but writes are scoped to the owner's own
-- folder, same convention as tenant-documents in 003_storage.sql.
-- Path convention: {owner_id}/logo-*  and  {owner_id}/cover-{property_id}-*
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy branding_public_read on storage.objects for select
  using (bucket_id = 'branding');

create policy branding_owner_write on storage.objects for insert
  with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy branding_owner_update on storage.objects for update
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy branding_owner_delete on storage.objects for delete
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

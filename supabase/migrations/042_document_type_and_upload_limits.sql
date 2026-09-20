-- =====================================================================
-- Tenant documents: let the uploader label what the document is (e.g.
-- "Aadhaar Card"), and restrict the storage bucket to sensible file
-- types/sizes instead of accepting anything.
-- =====================================================================

alter table tenant_documents add column if not exists doc_type text;

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'application/pdf'
  ]
where id = 'tenant-documents';

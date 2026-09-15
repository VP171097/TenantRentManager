-- =====================================================================
-- Profile Avatars & Multiple UPI IDs
-- =====================================================================

-- Avatars for tenants and managers
alter table profiles add column if not exists avatar_url text;
alter table tenants add column if not exists avatar_url text;
alter table managers add column if not exists avatar_url text;

-- Storage bucket for avatars (public so everyone can see them)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_select on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_insert on storage.objects for insert
  with check (bucket_id = 'avatars');

create policy avatars_update on storage.objects for update
  using (bucket_id = 'avatars');

create policy avatars_delete on storage.objects for delete
  using (bucket_id = 'avatars');

-- Multiple UPI IDs
create table if not exists upi_ids (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  upi_id text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, upi_id)
);
create index if not exists idx_upi_ids_owner_id on upi_ids(owner_id);

alter table upi_ids enable row level security;

create policy upi_ids_owner_all on upi_ids for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Allow managers to view upi_ids for owners they work for
create policy upi_ids_manager_select on upi_ids for select
  using (exists (
    select 1 from managers m
    where m.profile_id = auth.uid() and m.owner_id = upi_ids.owner_id
  ));

-- Link rooms to a specific UPI ID
alter table rooms add column if not exists upi_id_id uuid references upi_ids(id) on delete set null;

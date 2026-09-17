-- =====================================================================
-- Contact Us form (public site, /contact) — visitors don't have an
-- account, so this is a public, insert-only table: anyone can submit a
-- message, but nobody (beyond the project owner via the Supabase
-- dashboard/SQL editor) can read them back through the app's anon key.
-- No select/update/delete policy is intentional.
-- =====================================================================

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

create policy contact_messages_insert_public on contact_messages for insert
  to anon, authenticated
  with check (
    length(trim(name)) > 0
    and length(trim(message)) > 0
    and length(message) <= 4000
    and (email is not null or phone is not null)
  );

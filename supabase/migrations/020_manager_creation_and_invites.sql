-- =====================================================================
-- Lets the owner actually create managers, which was previously missing
-- entirely — managers.profile_id was NOT NULL, so there was no way to
-- create a manager row before a login existed for them, and no owner
-- flow existed to create that login either.
--
-- New flow (mirrors the tenant login/invite pattern in 004/010/019):
-- 1. Owner adds a manager (name + email/phone) — a bare managers row with
--    profile_id = null, inserted directly (managers_owner_all already
--    permits this).
-- 2. Owner either sets a password directly for them (new create-manager-
--    login Edge Function, mirrors create-tenant-login), OR generates a
--    shareable invite link (fn_generate_manager_invite below + new
--    accept-manager-invite Edge Function, mirrors the tenant invite flow)
--    that the manager opens to set their own password.
-- =====================================================================

alter table managers alter column profile_id drop not null;
alter table managers add column if not exists invite_token text unique;
alter table managers add column if not exists invite_token_expires_at timestamptz;

create index if not exists idx_managers_invite_token on managers(invite_token) where invite_token is not null;

create or replace function fn_generate_manager_invite(p_manager_id uuid)
returns managers language plpgsql security definer set search_path = public as $$
declare
  v_manager managers;
begin
  if not exists (select 1 from managers where id = p_manager_id and owner_id = auth.uid()) then
    raise exception 'Not authorized to invite this manager';
  end if;

  update managers set
    invite_token = encode(gen_random_bytes(24), 'hex'),
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

-- =====================================================================
-- 031: Delete a tenant's login whenever their tenant row is deleted —
-- directly, or cascaded from deleting their room or property.
-- =====================================================================
-- IMPORTANT — manual steps required before/after running this migration
-- (same pattern as migration 018's overdue-reminders cron):
--
-- 1. Two spots below are marked "-- REPLACE ME": your Supabase project's
--    functions URL and a secret used to authorize this trusted
--    server-to-server call. Do NOT commit a real value to source
--    control — this file only ever contains placeholders.
-- 2. Set a new Edge Function secret AUTH_CLEANUP_SECRET (Supabase
--    Dashboard -> Edge Functions -> delete-auth-user -> Secrets, or
--    `supabase secrets set AUTH_CLEANUP_SECRET=<a-long-random-value>`)
--    to the SAME value you paste into the "-- REPLACE ME" X-Cron-Secret
--    spot below.
-- 3. Deploy the new delete-auth-user Edge Function (see the summary for
--    its full file).
-- 4. Confirm pg_net shows as enabled under Database -> Extensions (it
--    should already be, from migration 018 — this migration also
--    "create extension if not exists"s it defensively).
--
-- Deleting a tenant's DB row previously left their Supabase Auth login
-- (and profiles row) orphaned — untouched, with no tenant to link back
-- to — whether the tenant was deleted directly, or via the room/property
-- cascades added in migration 029. This fires for every case uniformly,
-- since it's a trigger on the tenants table itself, not something the
-- app has to remember to call.

create extension if not exists pg_net;

create or replace function fn_tenant_auth_cleanup() returns trigger
language plpgsql as $$
declare
  v_url text := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/delete-auth-user'; -- REPLACE ME
  v_cleanup_secret text := 'REPLACE_WITH_YOUR_AUTH_CLEANUP_SECRET'; -- REPLACE ME (must match the AUTH_CLEANUP_SECRET Edge Function secret)
begin
  if OLD.profile_id is not null then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', v_cleanup_secret
      ),
      body := jsonb_build_object('profileId', OLD.profile_id)
    );
  end if;
  return OLD;
end;
$$;

drop trigger if exists trg_tenant_auth_cleanup on tenants;
create trigger trg_tenant_auth_cleanup after delete on tenants
for each row execute function fn_tenant_auth_cleanup();

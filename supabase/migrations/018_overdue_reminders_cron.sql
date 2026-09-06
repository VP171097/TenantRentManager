-- =====================================================================
-- Automated overdue reminders via pg_cron + pg_net.
--
-- IMPORTANT — manual steps required before/after running this migration:
--
-- 1. Two spots below are marked "-- REPLACE ME": your Supabase project's
--    functions URL and a secret used to authorize this trusted
--    server-to-server call. Do NOT commit a real service-role/secret
--    value to source control — this file only ever contains placeholders.
--    Replace them in the SQL you actually paste into the Supabase SQL
--    Editor, not in this repo file.
-- 2. Set a new Edge Function secret CRON_SECRET (Supabase Dashboard ->
--    Edge Functions -> send-bill -> Secrets, or `supabase secrets set
--    CRON_SECRET=<a-long-random-value>`) to the SAME value you paste
--    into the "-- REPLACE ME" X-Cron-Secret spot below.
-- 3. Redeploy send-bill with the updated code (see the summary for the
--    full file) — it now checks for this header as a trusted bypass
--    path, used ONLY for this cron job, before falling back to normal
--    JWT/caller authorization for every other (human-triggered) call.
-- 4. After running this migration, check Supabase Dashboard -> Database
--    -> Extensions to confirm both pg_cron and pg_net show as enabled —
--    `create extension` can silently no-op depending on plan/permissions,
--    and the toggle there is the reliable fallback.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Finds bills that are unpaid and from a past billing month, and asks
-- send-bill to nudge each tenant (mode: 'reminder'). This function is
-- SECURITY DEFINER-free (runs as whatever role pg_cron uses) and makes an
-- outbound HTTP call per overdue bill via pg_net — no financial writes
-- happen here, it purely triggers the same reminder flow a human clicking
-- "Send Reminder" would.
create or replace function fn_send_overdue_reminders() returns void
language plpgsql as $$
declare
  v_bill record;
  v_url text := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-bill'; -- REPLACE ME
  v_cron_secret text := 'REPLACE_WITH_YOUR_CRON_SECRET'; -- REPLACE ME (must match the CRON_SECRET Edge Function secret)
begin
  for v_bill in
    select id from bills
    where balance > 0
      and billing_month < date_trunc('month', current_date)
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', v_cron_secret
      ),
      body := jsonb_build_object('billId', v_bill.id, 'mode', 'reminder')
    );
  end loop;
end;
$$;

-- Run once daily at 09:00 UTC.
select cron.schedule(
  'send-overdue-reminders-daily',
  '0 9 * * *',
  $$select fn_send_overdue_reminders();$$
);

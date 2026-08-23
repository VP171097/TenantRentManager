-- =====================================================================
-- Fix: fn_applicable_rent compared effective_date <= billing_month, where
-- billing_month is always normalized to the 1st of the month. A tenant's
-- initial rent revision is dated on their actual move-in day (e.g. the
-- 15th), which is AFTER the 1st of that same month — so generating that
-- month's bill incorrectly failed with "no rent revision found".
--
-- Fix: a revision applies to a billing month if it takes effect any time
-- during that month, i.e. effective_date < billing_month + 1 month.
-- =====================================================================
create or replace function fn_applicable_rent(p_tenant_id uuid, p_date date)
returns numeric language sql stable as $$
  select rent_amount from rent_revisions
  where tenant_id = p_tenant_id
    and effective_date < (date_trunc('month', p_date) + interval '1 month')::date
  order by effective_date desc
  limit 1
$$;

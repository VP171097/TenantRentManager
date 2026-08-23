-- =====================================================================
-- Owner UPI settings + tenant-of-owner profile visibility
-- =====================================================================

-- Owner's UPI ID for collecting rent payments via QR code. Stored directly
-- on profiles (least new surface area) — only meaningful on owner rows.
alter table profiles add column if not exists upi_id text;

-- The existing profiles_select policy lets a tenant/manager see profile
-- rows whose owner_id = their own owner_id (i.e. other staff/tenants under
-- the same owner), but NOT the owner's own profile row (whose owner_id is
-- null). Tenants need to read their owner's upi_id for the payment page,
-- so add a policy allowing a tenant/manager to select their own owner's
-- profile row specifically.
create policy profiles_select_own_owner on profiles for select
  using (
    fn_my_role() in ('manager', 'tenant') and id = fn_my_owner_id()
  );

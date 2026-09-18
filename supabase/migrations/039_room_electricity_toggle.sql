-- =====================================================================
-- 039: Per-room electricity opt-out.
--
-- Some rooms/properties don't charge tenants for electricity at all
-- (included in rent, or billed separately outside the app). Previously
-- every room required an electricity rate and every bulk bill-generation
-- run required a meter reading for every active tenant, with no way to
-- say "this room doesn't have electricity." rooms.electricity_enabled
-- (default true, so existing rooms are unaffected) lets an owner turn
-- that off per room; the app then hides electricity fields/readings for
-- that room and fn_generate_bill already produces a correct zero
-- electricity charge when no electricity_readings row exists.
-- =====================================================================

alter table rooms
  add column if not exists electricity_enabled boolean not null default true;

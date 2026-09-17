-- =====================================================================
-- 038: Bring the tracked schema in line with the current application.
--
-- `add_room_electricity.sql` was a standalone, unversioned script.  The
-- Room form and billing flow both require this column, so it belongs in the
-- ordered migration history.  The Expense form also exposes "cleaning",
-- which was missing from the original database constraint.
-- =====================================================================

-- Default preserves existing rooms and permits a room-specific fallback
-- electricity rate when a tenant does not have a rate configured.
alter table rooms
  add column if not exists electricity_rate numeric(10,2) not null default 0
  check (electricity_rate >= 0);

-- Keep the database constraint aligned with the category values accepted by
-- the application's Expense form and TypeScript domain type.
alter table expenses
  drop constraint if exists expenses_category_check;

alter table expenses
  add constraint expenses_category_check
  check (category in ('maintenance', 'repair', 'utility', 'tax', 'insurance', 'other', 'cleaning'));

-- =====================================================================
-- 029: Deleting a room now cascades to everything tied to it
-- =====================================================================
-- Previously tenants.room_id, bills.room_id and tenant_room_history's
-- room references had no delete action (the Postgres default: RESTRICT),
-- so deleting a room with a current or former occupant failed outright —
-- the UI's "Delete Room" confirmation even warned it would be blocked.
--
-- Per owner request: deleting a room should delete the tenant currently
-- assigned to it (and, via the existing tenants.id cascades, all of that
-- tenant's bills/payments/receipts/documents/etc.), plus any bills or
-- room-transfer history rows tied directly to that room.

alter table tenants drop constraint tenants_room_id_fkey;
alter table tenants add constraint tenants_room_id_fkey
  foreign key (room_id) references rooms(id) on delete cascade;

alter table bills drop constraint bills_room_id_fkey;
alter table bills add constraint bills_room_id_fkey
  foreign key (room_id) references rooms(id) on delete cascade;

alter table tenant_room_history drop constraint tenant_room_history_from_room_id_fkey;
alter table tenant_room_history add constraint tenant_room_history_from_room_id_fkey
  foreign key (from_room_id) references rooms(id) on delete cascade;

alter table tenant_room_history drop constraint tenant_room_history_to_room_id_fkey;
alter table tenant_room_history add constraint tenant_room_history_to_room_id_fkey
  foreign key (to_room_id) references rooms(id) on delete cascade;

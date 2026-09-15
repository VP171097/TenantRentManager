-- =====================================================================
-- 033: Deleting a tenant frees their room
-- =====================================================================
-- "Move Out" (fn_settle_move_out) correctly sets the room back to
-- vacant, but "Delete Tenant" never touched the rooms table at all —
-- deleting a tenant directly left their room stuck showing 'occupied'
-- with no tenant in it.
--
-- Fire this on every tenant delete via a trigger (not client code) so it
-- works no matter which path removes the tenant. Harmless no-op if the
-- room itself is also being deleted in the same transaction (migration
-- 029's room-delete cascade) — the UPDATE just affects 0 rows.

create or replace function fn_vacate_room_on_tenant_delete() returns trigger
language plpgsql as $$
begin
  if OLD.room_id is not null then
    update rooms set status = 'vacant' where id = OLD.room_id;
  end if;
  return OLD;
end;
$$;

drop trigger if exists trg_vacate_room_on_tenant_delete on tenants;
create trigger trg_vacate_room_on_tenant_delete after delete on tenants
for each row execute function fn_vacate_room_on_tenant_delete();

-- One-time backfill: fix any room currently stuck 'occupied' with no
-- active tenant actually assigned to it (from a tenant deleted before
-- this trigger existed).
update rooms r set status = 'vacant'
where r.status = 'occupied'
  and not exists (
    select 1 from tenants t
    where t.room_id = r.id and t.status = 'active'
  );

-- =====================================================================
-- 030: Fix audit trigger crashing on payment (and cascaded tenant) deletes
-- =====================================================================
-- fn_audit_log_trigger's DELETE branch for 'payments' self-joined back
-- into the payments table to find the row it was currently deleting:
--   select p.owner_id into v_owner_id from payments pay
--     join tenants t on t.id = pay.tenant_id join properties p on p.id = t.property_id
--     where pay.id = OLD.id;
-- Since this is an AFTER DELETE trigger, that row is already gone by the
-- time the subquery runs, so it always returned no rows, leaving
-- v_owner_id NULL — and the subsequent audit_logs insert then failed its
-- NOT NULL constraint on owner_id, aborting the whole delete. This is
-- what broke "Delete Tenant" (deleting a tenant cascades into deleting
-- their payments, which fired this trigger).
--
-- Fix: resolve the owner from OLD.tenant_id directly (same as the
-- INSERT/UPDATE branch already did, correctly, via NEW.tenant_id) — no
-- need to look the just-deleted payments row back up at all. Also skip
-- the audit insert entirely if an owner still can't be resolved for any
-- other edge case, rather than letting a logging failure block a real
-- delete.

create or replace function fn_audit_log_trigger() returns trigger
language plpgsql security definer as $$
declare
  v_owner_id uuid;
  v_record_id text;
  v_performed_by uuid;
begin
  v_performed_by := auth.uid();

  if TG_OP = 'DELETE' then
    v_record_id := OLD.id::text;
    if TG_TABLE_NAME = 'tenants' or TG_TABLE_NAME = 'properties' then
      v_owner_id := OLD.owner_id;
    elsif TG_TABLE_NAME = 'rooms' then
      select owner_id into v_owner_id from properties where id = OLD.property_id;
    elsif TG_TABLE_NAME = 'bills' then
      select owner_id into v_owner_id from properties where id = OLD.property_id;
    elsif TG_TABLE_NAME = 'payments' then
      select p.owner_id into v_owner_id from tenants t join properties p on p.id = t.property_id where t.id = OLD.tenant_id;
    elsif TG_TABLE_NAME = 'maintenance_requests' then
      select owner_id into v_owner_id from properties where id = OLD.property_id;
    end if;

    if v_owner_id is not null then
      insert into audit_logs (owner_id, action, table_name, record_id, old_data, performed_by)
      values (v_owner_id, TG_OP, TG_TABLE_NAME, v_record_id, row_to_json(OLD)::jsonb, v_performed_by);
    end if;

    return OLD;
  else
    v_record_id := NEW.id::text;
    if TG_TABLE_NAME = 'tenants' or TG_TABLE_NAME = 'properties' then
      v_owner_id := NEW.owner_id;
    elsif TG_TABLE_NAME = 'rooms' then
      select owner_id into v_owner_id from properties where id = NEW.property_id;
    elsif TG_TABLE_NAME = 'bills' then
      select owner_id into v_owner_id from properties where id = NEW.property_id;
    elsif TG_TABLE_NAME = 'payments' then
      select p.owner_id into v_owner_id from tenants t join properties p on p.id = t.property_id where t.id = NEW.tenant_id;
    elsif TG_TABLE_NAME = 'maintenance_requests' then
      select owner_id into v_owner_id from properties where id = NEW.property_id;
    end if;

    if v_owner_id is not null then
      insert into audit_logs (owner_id, action, table_name, record_id, old_data, new_data, performed_by)
      values (
        v_owner_id,
        TG_OP,
        TG_TABLE_NAME,
        v_record_id,
        case when TG_OP = 'UPDATE' then row_to_json(OLD)::jsonb else null end,
        row_to_json(NEW)::jsonb,
        v_performed_by
      );
    end if;

    return NEW;
  end if;
end;
$$;

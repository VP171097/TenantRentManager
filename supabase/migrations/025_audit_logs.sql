-- =====================================================================
-- Audit Logs
-- =====================================================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  record_id text not null,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_owner_id on audit_logs(owner_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at);

alter table audit_logs enable row level security;

create policy audit_logs_owner_select on audit_logs for select
  using (owner_id = auth.uid());

-- Generic trigger function to log changes
create or replace function fn_audit_log_trigger() returns trigger
language plpgsql security definer as $$
declare
  v_owner_id uuid;
  v_record_id text;
  v_performed_by uuid;
begin
  -- Get the current user
  v_performed_by := auth.uid();

  -- If it's a DELETE, we look at OLD, otherwise NEW
  if TG_OP = 'DELETE' then
    v_record_id := OLD.id::text;
    -- Determine owner_id based on the table
    if TG_TABLE_NAME = 'tenants' or TG_TABLE_NAME = 'properties' then
      v_owner_id := OLD.owner_id;
    elsif TG_TABLE_NAME = 'rooms' then
      select owner_id into v_owner_id from properties where id = OLD.property_id;
    elsif TG_TABLE_NAME = 'bills' then
      select owner_id into v_owner_id from properties where id = OLD.property_id;
    elsif TG_TABLE_NAME = 'payments' then
      select p.owner_id into v_owner_id from payments pay join tenants t on t.id = pay.tenant_id join properties p on p.id = t.property_id where pay.id = OLD.id;
    elsif TG_TABLE_NAME = 'maintenance_requests' then
      select owner_id into v_owner_id from properties where id = OLD.property_id;
    end if;

    insert into audit_logs (owner_id, action, table_name, record_id, old_data, performed_by)
    values (v_owner_id, TG_OP, TG_TABLE_NAME, v_record_id, row_to_json(OLD)::jsonb, v_performed_by);
    
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

    return NEW;
  end if;
end;
$$;

-- Apply triggers (Drop first to be safe if re-running)
drop trigger if exists trg_audit_tenants on tenants;
create trigger trg_audit_tenants after insert or update or delete on tenants
for each row execute function fn_audit_log_trigger();

drop trigger if exists trg_audit_rooms on rooms;
create trigger trg_audit_rooms after insert or update or delete on rooms
for each row execute function fn_audit_log_trigger();

drop trigger if exists trg_audit_bills on bills;
create trigger trg_audit_bills after insert or update or delete on bills
for each row execute function fn_audit_log_trigger();

drop trigger if exists trg_audit_payments on payments;
create trigger trg_audit_payments after insert or update or delete on payments
for each row execute function fn_audit_log_trigger();

drop trigger if exists trg_audit_maintenance_requests on maintenance_requests;
create trigger trg_audit_maintenance_requests after insert or update or delete on maintenance_requests
for each row execute function fn_audit_log_trigger();

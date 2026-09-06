-- =====================================================================
-- Maintenance requests: tenants can report a problem (e.g. a leaking tap)
-- which owners/managers triage and resolve. Tenants can only see/insert
-- their own requests; owner and managers with can_manage_rooms (the
-- existing permission for physical-property upkeep, a reasonable fit
-- for "who handles maintenance") can see and update all requests for
-- their properties.
-- =====================================================================

create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_maintenance_requests_tenant_id on maintenance_requests(tenant_id);
create index if not exists idx_maintenance_requests_property_id on maintenance_requests(property_id);
create index if not exists idx_maintenance_requests_status on maintenance_requests(status);

alter table maintenance_requests enable row level security;

-- Owner: full access to requests on their properties.
create policy maintenance_requests_owner_all on maintenance_requests for all
  using (exists(select 1 from properties p where p.id = maintenance_requests.property_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from properties p where p.id = maintenance_requests.property_id and p.owner_id = auth.uid()));

-- Managers with can_manage_rooms: select + update (triage) on their properties.
create policy maintenance_requests_manager_select on maintenance_requests for select
  using (fn_manager_has_perm(property_id, 'can_manage_rooms'));

create policy maintenance_requests_manager_update on maintenance_requests for update
  using (fn_manager_has_perm(property_id, 'can_manage_rooms'))
  with check (fn_manager_has_perm(property_id, 'can_manage_rooms'));

-- Tenant: can insert and see only their own requests.
create policy maintenance_requests_tenant_select on maintenance_requests for select
  using (exists(select 1 from tenants t where t.id = maintenance_requests.tenant_id and t.profile_id = auth.uid()));

create policy maintenance_requests_tenant_insert on maintenance_requests for insert
  with check (exists(select 1 from tenants t where t.id = maintenance_requests.tenant_id and t.profile_id = auth.uid()));

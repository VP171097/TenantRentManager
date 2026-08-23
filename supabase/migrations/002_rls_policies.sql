-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table profiles enable row level security;
alter table properties enable row level security;
alter table rooms enable row level security;
alter table tenants enable row level security;
alter table tenant_documents enable row level security;
alter table rent_revisions enable row level security;
alter table electricity_readings enable row level security;
alter table bills enable row level security;
alter table payments enable row level security;
alter table receipts enable row level security;
alter table receipt_counters enable row level security;
alter table managers enable row level security;
alter table manager_permissions enable row level security;
alter table tenant_room_history enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------
-- Helper functions (security definer, avoid recursive RLS lookups)
-- ---------------------------------------------------------------------
create or replace function fn_my_role() returns role_enum
language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function fn_my_owner_id() returns uuid
language sql security definer stable set search_path = public as $$
  select case
    when role = 'owner' then id
    else owner_id
  end
  from profiles where id = auth.uid()
$$;

create or replace function fn_my_manager_id() returns uuid
language sql security definer stable set search_path = public as $$
  select id from managers where profile_id = auth.uid()
$$;

create or replace function fn_my_tenant_id() returns uuid
language sql security definer stable set search_path = public as $$
  select id from tenants where profile_id = auth.uid()
$$;

-- A manager has a given permission flag on a property.
create or replace function fn_manager_has_perm(p_property_id uuid, p_flag text) returns boolean
language plpgsql security definer stable set search_path = public as $$
declare v_manager_id uuid; v_ok boolean;
begin
  select id into v_manager_id from managers where profile_id = auth.uid();
  if v_manager_id is null then return false; end if;
  execute format('select %I from manager_permissions where manager_id = $1 and property_id = $2', p_flag)
    into v_ok using v_manager_id, p_property_id;
  return coalesce(v_ok, false);
end;
$$;

-- Whether the current user (owner or permitted manager) can access a
-- property tree at all (baseline visibility, e.g. can_view_tenants).
create or replace function fn_can_access_property(p_property_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select
    case fn_my_role()
      when 'owner' then exists(select 1 from properties where id = p_property_id and owner_id = auth.uid())
      when 'manager' then exists(
        select 1 from manager_permissions mp
        join managers m on m.id = mp.manager_id
        where m.profile_id = auth.uid() and mp.property_id = p_property_id and mp.can_view_tenants
      )
      else false
    end
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or owner_id = auth.uid()
    or (fn_my_role() in ('manager','tenant') and owner_id = fn_my_owner_id())
  );

create policy profiles_insert_self on profiles for insert
  with check (id = auth.uid());

create policy profiles_update_self on profiles for update
  using (id = auth.uid());

-- ---------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------
create policy properties_owner_all on properties for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy properties_manager_select on properties for select
  using (
    fn_my_role() = 'manager' and exists(
      select 1 from manager_permissions mp join managers m on m.id = mp.manager_id
      where m.profile_id = auth.uid() and mp.property_id = properties.id
    )
  );

create policy properties_tenant_select on properties for select
  using (
    fn_my_role() = 'tenant' and id in (select property_id from tenants where profile_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------
create policy rooms_owner_all on rooms for all
  using (exists(select 1 from properties p where p.id = rooms.property_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from properties p where p.id = rooms.property_id and p.owner_id = auth.uid()));

create policy rooms_manager_select on rooms for select
  using (fn_can_access_property(property_id));

create policy rooms_manager_write on rooms for insert
  with check (fn_manager_has_perm(property_id, 'can_manage_rooms'));

create policy rooms_manager_update on rooms for update
  using (fn_manager_has_perm(property_id, 'can_manage_rooms'));

create policy rooms_tenant_select on rooms for select
  using (fn_my_role() = 'tenant' and id in (select room_id from tenants where profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------
create policy tenants_owner_all on tenants for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy tenants_manager_select on tenants for select
  using (fn_manager_has_perm(property_id, 'can_view_tenants'));

create policy tenants_manager_write on tenants for insert
  with check (fn_manager_has_perm(property_id, 'can_edit_tenants'));

create policy tenants_manager_update on tenants for update
  using (fn_manager_has_perm(property_id, 'can_edit_tenants'));

create policy tenants_self_select on tenants for select
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- tenant_documents (private; storage object access mirrors this)
-- ---------------------------------------------------------------------
create policy tenant_documents_owner_all on tenant_documents for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy tenant_documents_manager_select on tenant_documents for select
  using (exists(
    select 1 from tenants t where t.id = tenant_documents.tenant_id and fn_manager_has_perm(t.property_id, 'can_view_tenants')
  ));

create policy tenant_documents_self_select on tenant_documents for select
  using (exists(select 1 from tenants t where t.id = tenant_documents.tenant_id and t.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- rent_revisions
-- ---------------------------------------------------------------------
create policy rent_revisions_owner_all on rent_revisions for all
  using (exists(select 1 from tenants t where t.id = rent_revisions.tenant_id and t.owner_id = auth.uid()))
  with check (exists(select 1 from tenants t where t.id = rent_revisions.tenant_id and t.owner_id = auth.uid()));

create policy rent_revisions_manager_select on rent_revisions for select
  using (exists(select 1 from tenants t where t.id = rent_revisions.tenant_id and fn_manager_has_perm(t.property_id, 'can_view_tenants')));

create policy rent_revisions_manager_write on rent_revisions for insert
  with check (exists(select 1 from tenants t where t.id = rent_revisions.tenant_id and fn_manager_has_perm(t.property_id, 'can_edit_rent')));

create policy rent_revisions_self_select on rent_revisions for select
  using (exists(select 1 from tenants t where t.id = rent_revisions.tenant_id and t.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- electricity_readings
-- ---------------------------------------------------------------------
create policy electricity_owner_all on electricity_readings for all
  using (exists(select 1 from tenants t where t.id = electricity_readings.tenant_id and t.owner_id = auth.uid()))
  with check (exists(select 1 from tenants t where t.id = electricity_readings.tenant_id and t.owner_id = auth.uid()));

create policy electricity_manager_select on electricity_readings for select
  using (exists(select 1 from tenants t where t.id = electricity_readings.tenant_id and fn_manager_has_perm(t.property_id, 'can_view_tenants')));

create policy electricity_manager_write on electricity_readings for insert
  with check (exists(select 1 from tenants t where t.id = electricity_readings.tenant_id and fn_manager_has_perm(t.property_id, 'can_enter_electricity')));

create policy electricity_manager_update on electricity_readings for update
  using (exists(select 1 from tenants t where t.id = electricity_readings.tenant_id and fn_manager_has_perm(t.property_id, 'can_enter_electricity')));

create policy electricity_self_select on electricity_readings for select
  using (exists(select 1 from tenants t where t.id = electricity_readings.tenant_id and t.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- bills
-- ---------------------------------------------------------------------
create policy bills_owner_all on bills for all
  using (exists(select 1 from properties p where p.id = bills.property_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from properties p where p.id = bills.property_id and p.owner_id = auth.uid()));

create policy bills_manager_select on bills for select
  using (fn_manager_has_perm(property_id, 'can_view_ledger'));

create policy bills_self_select on bills for select
  using (exists(select 1 from tenants t where t.id = bills.tenant_id and t.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create policy payments_owner_all on payments for all
  using (exists(select 1 from bills b join properties p on p.id = b.property_id where b.id = payments.bill_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from bills b join properties p on p.id = b.property_id where b.id = payments.bill_id and p.owner_id = auth.uid()));

create policy payments_manager_select on payments for select
  using (exists(select 1 from bills b where b.id = payments.bill_id and fn_manager_has_perm(b.property_id, 'can_view_ledger')));

create policy payments_manager_write on payments for insert
  with check (exists(select 1 from bills b where b.id = payments.bill_id and fn_manager_has_perm(b.property_id, 'can_record_payments')));

create policy payments_self_select on payments for select
  using (exists(select 1 from tenants t where t.id = payments.tenant_id and t.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- receipts
-- ---------------------------------------------------------------------
create policy receipts_owner_all on receipts for all
  using (exists(select 1 from properties p where p.id = receipts.property_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from properties p where p.id = receipts.property_id and p.owner_id = auth.uid()));

create policy receipts_manager_select on receipts for select
  using (fn_manager_has_perm(property_id, 'can_generate_receipts'));

create policy receipts_manager_write on receipts for insert
  with check (fn_manager_has_perm(property_id, 'can_generate_receipts'));

create policy receipts_self_select on receipts for select
  using (exists(select 1 from tenants t where t.id = receipts.tenant_id and t.profile_id = auth.uid()));

-- receipt_counters: owner + permitted managers only (internal bookkeeping)
create policy receipt_counters_owner_all on receipt_counters for all
  using (exists(select 1 from properties p where p.id = receipt_counters.property_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from properties p where p.id = receipt_counters.property_id and p.owner_id = auth.uid()));

create policy receipt_counters_manager_write on receipt_counters for all
  using (fn_manager_has_perm(property_id, 'can_generate_receipts'))
  with check (fn_manager_has_perm(property_id, 'can_generate_receipts'));

-- ---------------------------------------------------------------------
-- managers & manager_permissions — owner only
-- ---------------------------------------------------------------------
create policy managers_owner_all on managers for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy managers_self_select on managers for select
  using (profile_id = auth.uid());

create policy manager_permissions_owner_all on manager_permissions for all
  using (exists(select 1 from managers m where m.id = manager_permissions.manager_id and m.owner_id = auth.uid()))
  with check (exists(select 1 from managers m where m.id = manager_permissions.manager_id and m.owner_id = auth.uid()));

create policy manager_permissions_self_select on manager_permissions for select
  using (exists(select 1 from managers m where m.id = manager_permissions.manager_id and m.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- tenant_room_history
-- ---------------------------------------------------------------------
create policy tenant_room_history_owner_all on tenant_room_history for all
  using (exists(select 1 from tenants t where t.id = tenant_room_history.tenant_id and t.owner_id = auth.uid()))
  with check (exists(select 1 from tenants t where t.id = tenant_room_history.tenant_id and t.owner_id = auth.uid()));

create policy tenant_room_history_manager on tenant_room_history for all
  using (exists(select 1 from tenants t where t.id = tenant_room_history.tenant_id and fn_manager_has_perm(t.property_id, 'can_manage_rooms')))
  with check (exists(select 1 from tenants t where t.id = tenant_room_history.tenant_id and fn_manager_has_perm(t.property_id, 'can_manage_rooms')));

create policy tenant_room_history_self_select on tenant_room_history for select
  using (exists(select 1 from tenants t where t.id = tenant_room_history.tenant_id and t.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- audit_log — owner (and managers, read-only) can see; inserts via app
-- using owner_id/actor_id set explicitly
-- ---------------------------------------------------------------------
create policy audit_log_owner_all on audit_log for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy audit_log_manager_select on audit_log for select
  using (fn_my_role() = 'manager' and owner_id = fn_my_owner_id());

create policy audit_log_manager_insert on audit_log for insert
  with check (fn_my_role() = 'manager' and owner_id = fn_my_owner_id());

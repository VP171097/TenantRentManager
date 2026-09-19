-- =====================================================================
-- 041: Close co-owner RLS gaps on financial/operational tables.
--
-- Migration 036 made fn_manager_has_perm/fn_can_access_property
-- co-owner-aware, which transitively fixed every table whose manager
-- policies already covered that operation — but it only added explicit
-- *_co_owner_* policies for operations that previously had NO manager
-- equivalent at all (properties CRUD, rooms/tenants delete, managers,
-- audit, upi_ids, storage). On payments/bills/receipts/rent_revisions/
-- tenant_documents/electricity_readings, managers only ever had
-- select/insert (never update/delete), so a co-owner — despite being
-- meant to have full owner-equivalent access — silently can't edit or
-- delete a payment, correct a bill, remove a stale document, etc.
-- maintenance_requests delete was never available to anyone but the
-- literal owner either.
--
-- Fix: add co-owner-scoped update/delete policies mirroring each
-- table's existing owner_all join path (see 002_rls_policies.sql /
-- 017_maintenance_requests.sql), using fn_is_owner_or_co_owner exactly
-- as 036 did for the tables it covered.
-- =====================================================================

create policy payments_co_owner_update on payments for update
  using (exists(select 1 from bills b join properties p on p.id = b.property_id where b.id = payments.bill_id and fn_is_owner_or_co_owner(p.owner_id)))
  with check (exists(select 1 from bills b join properties p on p.id = b.property_id where b.id = payments.bill_id and fn_is_owner_or_co_owner(p.owner_id)));

create policy payments_co_owner_delete on payments for delete
  using (exists(select 1 from bills b join properties p on p.id = b.property_id where b.id = payments.bill_id and fn_is_owner_or_co_owner(p.owner_id)));

create policy bills_co_owner_update on bills for update
  using (exists(select 1 from properties p where p.id = bills.property_id and fn_is_owner_or_co_owner(p.owner_id)))
  with check (exists(select 1 from properties p where p.id = bills.property_id and fn_is_owner_or_co_owner(p.owner_id)));

create policy bills_co_owner_delete on bills for delete
  using (exists(select 1 from properties p where p.id = bills.property_id and fn_is_owner_or_co_owner(p.owner_id)));

create policy receipts_co_owner_update on receipts for update
  using (exists(select 1 from properties p where p.id = receipts.property_id and fn_is_owner_or_co_owner(p.owner_id)))
  with check (exists(select 1 from properties p where p.id = receipts.property_id and fn_is_owner_or_co_owner(p.owner_id)));

create policy receipts_co_owner_delete on receipts for delete
  using (exists(select 1 from properties p where p.id = receipts.property_id and fn_is_owner_or_co_owner(p.owner_id)));

create policy rent_revisions_co_owner_update on rent_revisions for update
  using (exists(select 1 from tenants t where t.id = rent_revisions.tenant_id and fn_is_owner_or_co_owner(t.owner_id)))
  with check (exists(select 1 from tenants t where t.id = rent_revisions.tenant_id and fn_is_owner_or_co_owner(t.owner_id)));

create policy rent_revisions_co_owner_delete on rent_revisions for delete
  using (exists(select 1 from tenants t where t.id = rent_revisions.tenant_id and fn_is_owner_or_co_owner(t.owner_id)));

create policy tenant_documents_co_owner_insert on tenant_documents for insert
  with check (fn_is_owner_or_co_owner(owner_id));

create policy tenant_documents_co_owner_update on tenant_documents for update
  using (fn_is_owner_or_co_owner(owner_id)) with check (fn_is_owner_or_co_owner(owner_id));

create policy tenant_documents_co_owner_delete on tenant_documents for delete
  using (fn_is_owner_or_co_owner(owner_id));

create policy electricity_co_owner_delete on electricity_readings for delete
  using (exists(select 1 from tenants t where t.id = electricity_readings.tenant_id and fn_is_owner_or_co_owner(t.owner_id)));

create policy maintenance_requests_co_owner_delete on maintenance_requests for delete
  using (exists(select 1 from properties p where p.id = maintenance_requests.property_id and fn_is_owner_or_co_owner(p.owner_id)));

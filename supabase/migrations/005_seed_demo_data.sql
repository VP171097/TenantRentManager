-- =====================================================================
-- Demo/seed data. NOT run automatically by the deploy pipeline — run
-- manually against a dev project after creating an owner account, e.g.:
--   psql "$DATABASE_URL" -v owner_id="'<your-owner-uuid>'" -f 005_seed_demo_data.sql
-- Requires an existing profiles row with role='owner' for :owner_id.
-- =====================================================================

do $$
declare
  v_owner_id uuid;
  v_property_id uuid;
  v_room_101 uuid; v_room_102 uuid; v_room_103 uuid; v_room_204 uuid;
  v_rahul uuid; v_amit uuid; v_neha uuid;
begin
  select id into v_owner_id from profiles where role = 'owner' order by created_at limit 1;
  if v_owner_id is null then
    raise notice 'No owner profile found — create an owner account first, then re-run this seed.';
    return;
  end if;

  insert into properties (owner_id, name, code, address, city)
  values (v_owner_id, 'Krishna Residency', 'KR', '12 MG Road', 'Pune')
  returning id into v_property_id;

  insert into rooms (property_id, room_number, floor, status, base_rent) values
    (v_property_id, '101', '1', 'occupied', 6000) returning id into v_room_101;
  insert into rooms (property_id, room_number, floor, status, base_rent) values
    (v_property_id, '102', '1', 'occupied', 6500) returning id into v_room_102;
  insert into rooms (property_id, room_number, floor, status, base_rent) values
    (v_property_id, '103', '1', 'occupied', 6000) returning id into v_room_103;
  insert into rooms (property_id, room_number, floor, status, base_rent) values
    (v_property_id, '204', '2', 'vacant', 7000) returning id into v_room_204;

  -- Rahul Sharma: fully paid every month
  insert into tenants (owner_id, property_id, room_id, full_name, phone, email, status, move_in_date, security_deposit)
  values (v_owner_id, v_property_id, v_room_101, 'Rahul Sharma', '9876500001', 'rahul@example.com', 'active', '2025-01-01', 12000)
  returning id into v_rahul;
  insert into rent_revisions (tenant_id, effective_date, rent_amount, change_type) values (v_rahul, '2025-01-01', 6000, 'initial');

  -- Amit Kumar: partially paid, has an old outstanding balance, then a rent increase next month
  insert into tenants (owner_id, property_id, room_id, full_name, phone, email, status, move_in_date, security_deposit)
  values (v_owner_id, v_property_id, v_room_102, 'Amit Kumar', '9876500002', 'amit@example.com', 'active', '2025-01-01', 13000)
  returning id into v_amit;
  insert into rent_revisions (tenant_id, effective_date, rent_amount, change_type) values (v_amit, '2025-01-01', 6500, 'initial');
  -- rent increase effective next month (relative to "now" this migration is run)
  insert into rent_revisions (tenant_id, effective_date, rent_amount, change_type, change_value)
  values (v_amit, date_trunc('month', now() + interval '1 month')::date, 7000, 'fixed', 500);

  -- Neha Singh: multiple partial payments, ends up with credit
  insert into tenants (owner_id, property_id, room_id, full_name, phone, email, status, move_in_date, security_deposit)
  values (v_owner_id, v_property_id, v_room_103, 'Neha Singh', '9876500003', 'neha@example.com', 'active', '2025-02-01', 12000)
  returning id into v_neha;
  insert into rent_revisions (tenant_id, effective_date, rent_amount, change_type) values (v_neha, '2025-02-01', 6000, 'initial');

  -- ---- Electricity + bills for the last 3 months, per tenant ----
  -- Rahul: fully paid each month
  perform fn_generate_electricity_and_bill(v_rahul, v_room_101, '2025-05-01'::date, 100, 150, 8);
  perform fn_generate_electricity_and_bill(v_rahul, v_room_101, '2025-06-01'::date, 150, 210, 8);
  perform fn_generate_electricity_and_bill(v_rahul, v_room_101, '2025-07-01'::date, 210, 260, 8);

  -- Amit: partial payments + old outstanding carrying forward
  perform fn_generate_electricity_and_bill(v_amit, v_room_102, '2025-05-01'::date, 80, 140, 8);
  perform fn_generate_electricity_and_bill(v_amit, v_room_102, '2025-06-01'::date, 140, 190, 8);
  perform fn_generate_electricity_and_bill(v_amit, v_room_102, '2025-07-01'::date, 190, 230, 8);

  -- Neha: multiple partial payments leading to credit
  perform fn_generate_electricity_and_bill(v_neha, v_room_103, '2025-05-01'::date, 60, 100, 8);
  perform fn_generate_electricity_and_bill(v_neha, v_room_103, '2025-06-01'::date, 100, 140, 8);
  perform fn_generate_electricity_and_bill(v_neha, v_room_103, '2025-07-01'::date, 140, 170, 8);

  -- Payments
  -- Rahul pays in full each month
  insert into payments (bill_id, tenant_id, amount, payment_date, method)
  select id, v_rahul, total_due, billing_month + interval '3 days', 'upi' from bills where tenant_id = v_rahul;

  -- Amit: month 1 unpaid (creates outstanding), month 2 partial, month 3 partial
  insert into payments (bill_id, tenant_id, amount, payment_date, method)
  select id, v_amit, total_due * 0.4, billing_month + interval '5 days', 'cash'
  from bills where tenant_id = v_amit and billing_month = '2025-06-01';
  insert into payments (bill_id, tenant_id, amount, payment_date, method)
  select id, v_amit, total_due * 0.5, billing_month + interval '5 days', 'cash'
  from bills where tenant_id = v_amit and billing_month = '2025-07-01';

  -- Neha: overpays in month 1 (multiple partials summing above due) -> credit carries forward
  insert into payments (bill_id, tenant_id, amount, payment_date, method)
  select id, v_neha, total_due * 0.6, billing_month + interval '2 days', 'upi'
  from bills where tenant_id = v_neha and billing_month = '2025-05-01';
  insert into payments (bill_id, tenant_id, amount, payment_date, method)
  select id, v_neha, total_due * 0.6, billing_month + interval '10 days', 'cash'
  from bills where tenant_id = v_neha and billing_month = '2025-05-01';
  insert into payments (bill_id, tenant_id, amount, payment_date, method)
  select id, v_neha, total_due, billing_month + interval '4 days', 'upi'
  from bills where tenant_id = v_neha and billing_month = '2025-06-01';
  insert into payments (bill_id, tenant_id, amount, payment_date, method)
  select id, v_neha, total_due, billing_month + interval '4 days', 'upi'
  from bills where tenant_id = v_neha and billing_month = '2025-07-01';

  raise notice 'Seed complete for owner %', v_owner_id;
end $$;

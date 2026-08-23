-- =====================================================================
-- Room Rent Manager — core schema
-- =====================================================================
create extension if not exists "pgcrypto";

create type role_enum as enum ('owner', 'manager', 'tenant');
create type room_status_enum as enum ('vacant', 'occupied');
create type tenant_status_enum as enum ('active', 'moved_out');
create type rent_change_type_enum as enum ('initial', 'fixed', 'percentage');
create type bill_status_enum as enum ('paid', 'partial', 'unpaid', 'overdue');
create type payment_method_enum as enum ('cash', 'upi', 'bank_transfer', 'cheque', 'other');

-- ---------------------------------------------------------------------
-- profiles: 1-1 with auth.users
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_enum not null,
  full_name text not null,
  email text,
  phone text,
  owner_id uuid references profiles(id), -- managers/tenants: owning owner
  created_at timestamptz not null default now()
);
create index idx_profiles_owner_id on profiles(owner_id);

-- ---------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  city text,
  created_at timestamptz not null default now(),
  unique (owner_id, code)
);
create index idx_properties_owner_id on properties(owner_id);

-- ---------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------
create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  room_number text not null,
  floor text,
  status room_status_enum not null default 'vacant',
  base_rent numeric(12,2) not null check (base_rent >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (property_id, room_number)
);
create index idx_rooms_property_id on rooms(property_id);

-- ---------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid references rooms(id),
  profile_id uuid references profiles(id), -- tenant login, nullable
  full_name text not null,
  phone text not null,
  email text,
  status tenant_status_enum not null default 'active',
  move_in_date date not null default current_date,
  move_out_date date,
  security_deposit numeric(12,2) not null default 0 check (security_deposit >= 0),
  created_at timestamptz not null default now()
);
create index idx_tenants_owner_id on tenants(owner_id);
create index idx_tenants_property_id on tenants(property_id);
create index idx_tenants_room_id on tenants(room_id);
create index idx_tenants_profile_id on tenants(profile_id);

-- ---------------------------------------------------------------------
-- tenant_documents
-- ---------------------------------------------------------------------
create table tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  file_path text not null, -- storage path: {owner_id}/{property_id}/{tenant_id}/filename
  file_name text not null,
  uploaded_at timestamptz not null default now(),
  expires_at date
);
create index idx_tenant_documents_tenant_id on tenant_documents(tenant_id);

-- ---------------------------------------------------------------------
-- rent_revisions — never overwritten; bills snapshot the rent that applied
-- ---------------------------------------------------------------------
create table rent_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  effective_date date not null,
  rent_amount numeric(12,2) not null check (rent_amount >= 0),
  change_type rent_change_type_enum not null default 'initial',
  change_value numeric(12,2),
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  unique (tenant_id, effective_date)
);
create index idx_rent_revisions_tenant_id on rent_revisions(tenant_id);

-- ---------------------------------------------------------------------
-- electricity_readings
-- ---------------------------------------------------------------------
create table electricity_readings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  billing_month date not null, -- normalized to first-of-month
  previous_reading numeric(12,2) not null check (previous_reading >= 0),
  current_reading numeric(12,2) not null check (current_reading >= 0),
  rate_per_unit numeric(8,2) not null check (rate_per_unit >= 0),
  is_meter_reset boolean not null default false,
  reset_explanation text,
  created_at timestamptz not null default now(),
  unique (tenant_id, billing_month),
  constraint chk_units_nonneg check (is_meter_reset or current_reading >= previous_reading)
);
create index idx_electricity_readings_room_id on electricity_readings(room_id);
create index idx_electricity_readings_billing_month on electricity_readings(billing_month);

-- ---------------------------------------------------------------------
-- bills — snapshot record, never mutated by later rent/rate changes
-- ---------------------------------------------------------------------
create table bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid not null references rooms(id),
  billing_month date not null,
  rent_amount numeric(12,2) not null,
  electricity_units numeric(12,2) not null default 0,
  electricity_charge numeric(12,2) not null default 0,
  other_charges numeric(12,2) not null default 0,
  late_fee numeric(12,2) not null default 0,
  previous_balance numeric(12,2) not null default 0,
  previous_credit numeric(12,2) not null default 0,
  total_due numeric(12,2) not null,
  total_paid numeric(12,2) not null default 0,
  balance numeric(12,2) not null,
  status bill_status_enum not null default 'unpaid',
  generated_at timestamptz not null default now(),
  notes text,
  unique (tenant_id, billing_month)
);
create index idx_bills_tenant_id on bills(tenant_id);
create index idx_bills_property_id on bills(property_id);
create index idx_bills_billing_month on bills(billing_month);

-- ---------------------------------------------------------------------
-- payments — many per bill
-- ---------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  method payment_method_enum not null default 'cash',
  reference text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_payments_bill_id on payments(bill_id);
create index idx_payments_tenant_id on payments(tenant_id);
create index idx_payments_payment_date on payments(payment_date);

-- ---------------------------------------------------------------------
-- receipts
-- ---------------------------------------------------------------------
create table receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  payment_id uuid not null references payments(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  generated_at timestamptz not null default now()
);
create index idx_receipts_tenant_id on receipts(tenant_id);
create index idx_receipts_property_id on receipts(property_id);

-- per-property receipt sequence counter, keyed by property+year+month
create table receipt_counters (
  property_id uuid not null references properties(id) on delete cascade,
  year int not null,
  month int not null,
  last_seq int not null default 0,
  primary key (property_id, year, month)
);

-- ---------------------------------------------------------------------
-- managers & manager_permissions
-- ---------------------------------------------------------------------
create table managers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  unique (profile_id)
);
create index idx_managers_owner_id on managers(owner_id);

create table manager_permissions (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references managers(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  can_view_tenants boolean not null default true,
  can_edit_tenants boolean not null default false,
  can_enter_electricity boolean not null default false,
  can_record_payments boolean not null default false,
  can_generate_receipts boolean not null default false,
  can_view_ledger boolean not null default false,
  can_edit_rent boolean not null default false,
  can_manage_rooms boolean not null default false,
  unique (manager_id, property_id)
);
create index idx_manager_permissions_manager_id on manager_permissions(manager_id);

-- ---------------------------------------------------------------------
-- tenant_room_history — room transfers
-- ---------------------------------------------------------------------
create table tenant_room_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  from_room_id uuid references rooms(id),
  to_room_id uuid not null references rooms(id),
  transfer_date date not null default current_date,
  reason text,
  created_at timestamptz not null default now()
);
create index idx_tenant_room_history_tenant_id on tenant_room_history(tenant_id);

-- ---------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_log_owner_id on audit_log(owner_id);
create index idx_audit_log_created_at on audit_log(created_at);

-- =====================================================================
-- Functions
-- =====================================================================

-- Applicable rent for a tenant on a given date: latest revision whose
-- effective_date <= date.
create or replace function fn_applicable_rent(p_tenant_id uuid, p_date date)
returns numeric language sql stable as $$
  select rent_amount from rent_revisions
  where tenant_id = p_tenant_id and effective_date <= p_date
  order by effective_date desc
  limit 1
$$;

-- Applicable electricity rate: most recent reading row's rate for the room
-- at/before billing_month (rate can vary per reading entry).
create or replace function fn_applicable_electricity_rate(p_room_id uuid, p_billing_month date)
returns numeric language sql stable as $$
  select rate_per_unit from electricity_readings
  where room_id = p_room_id and billing_month <= p_billing_month
  order by billing_month desc
  limit 1
$$;

-- Current outstanding balance across all of a tenant's bills.
create or replace function fn_tenant_current_balance(p_tenant_id uuid)
returns numeric language sql stable as $$
  select coalesce(sum(balance), 0) from bills where tenant_id = p_tenant_id
$$;

-- Allocates the next receipt sequence number atomically for a property/month.
create or replace function fn_next_receipt_seq(p_property_id uuid, p_year int, p_month int)
returns int language plpgsql as $$
declare v_seq int;
begin
  insert into receipt_counters(property_id, year, month, last_seq)
  values (p_property_id, p_year, p_month, 1)
  on conflict (property_id, year, month)
  do update set last_seq = receipt_counters.last_seq + 1
  returning last_seq into v_seq;
  return v_seq;
end;
$$;

-- Generates (or idempotently returns) a bill for a tenant/month.
-- Relies on the unique(tenant_id, billing_month) constraint for idempotency:
-- if a bill already exists it is returned unchanged rather than duplicated.
create or replace function fn_generate_bill(
  p_tenant_id uuid,
  p_billing_month date,
  p_other_charges numeric default 0,
  p_late_fee numeric default 0
) returns bills language plpgsql as $$
declare
  v_bill bills;
  v_tenant tenants;
  v_rent numeric;
  v_rate numeric;
  v_reading electricity_readings;
  v_units numeric := 0;
  v_charge numeric := 0;
  v_prev_bill bills;
  v_prev_balance numeric := 0;
  v_prev_credit numeric := 0;
  v_total_due numeric;
begin
  select * into v_tenant from tenants where id = p_tenant_id;
  if not found then
    raise exception 'Tenant not found';
  end if;

  -- idempotent: return existing bill if present
  select * into v_bill from bills where tenant_id = p_tenant_id and billing_month = p_billing_month;
  if found then
    return v_bill;
  end if;

  v_rent := fn_applicable_rent(p_tenant_id, p_billing_month);
  if v_rent is null then
    raise exception 'No rent revision found for tenant as of %', p_billing_month;
  end if;

  select * into v_reading from electricity_readings
    where tenant_id = p_tenant_id and billing_month = p_billing_month;
  if found then
    v_units := greatest(v_reading.current_reading - v_reading.previous_reading, 0);
    v_charge := v_units * v_reading.rate_per_unit;
  end if;

  select * into v_prev_bill from bills
    where tenant_id = p_tenant_id and billing_month < p_billing_month
    order by billing_month desc limit 1;
  if found then
    if v_prev_bill.balance > 0 then
      v_prev_balance := v_prev_bill.balance;
    elsif v_prev_bill.balance < 0 then
      v_prev_credit := abs(v_prev_bill.balance);
    end if;
  end if;

  v_total_due := v_rent + v_charge + p_other_charges + p_late_fee + v_prev_balance - v_prev_credit;

  insert into bills(
    tenant_id, property_id, room_id, billing_month, rent_amount,
    electricity_units, electricity_charge, other_charges, late_fee,
    previous_balance, previous_credit, total_due, total_paid, balance, status
  ) values (
    p_tenant_id, v_tenant.property_id, v_tenant.room_id, p_billing_month, v_rent,
    v_units, v_charge, p_other_charges, p_late_fee,
    v_prev_balance, v_prev_credit, v_total_due, 0, v_total_due,
    case when v_total_due <= 0 then 'paid' else 'unpaid' end
  )
  on conflict (tenant_id, billing_month) do nothing
  returning * into v_bill;

  if v_bill.id is null then
    -- concurrent insert happened; fetch the winning row
    select * into v_bill from bills where tenant_id = p_tenant_id and billing_month = p_billing_month;
  end if;

  return v_bill;
end;
$$;

-- Recomputes total_paid/balance/status on a bill from its payments.
create or replace function fn_recalc_bill(p_bill_id uuid) returns void language plpgsql as $$
declare
  v_total_paid numeric;
  v_bill bills;
begin
  select coalesce(sum(amount), 0) into v_total_paid from payments where bill_id = p_bill_id;
  select * into v_bill from bills where id = p_bill_id;
  update bills set
    total_paid = v_total_paid,
    balance = v_bill.total_due - v_total_paid,
    status = case
      when (v_bill.total_due - v_total_paid) <= 0 then 'paid'
      when v_total_paid > 0 then 'partial'
      else 'unpaid'
    end
  where id = p_bill_id;
end;
$$;

create or replace function trg_payments_recalc() returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE') then
    perform fn_recalc_bill(old.bill_id);
    return old;
  else
    perform fn_recalc_bill(new.bill_id);
    return new;
  end if;
end;
$$;

create trigger payments_after_change
after insert or update or delete on payments
for each row execute function trg_payments_recalc();

-- Generates a unique receipt number and inserts the receipt row.
create or replace function fn_generate_receipt(p_payment_id uuid) returns receipts language plpgsql as $$
declare
  v_payment payments;
  v_bill bills;
  v_property properties;
  v_seq int;
  v_year int;
  v_month int;
  v_number text;
  v_receipt receipts;
begin
  select * into v_payment from payments where id = p_payment_id;
  if not found then raise exception 'Payment not found'; end if;

  select * into v_receipt from receipts where payment_id = p_payment_id;
  if found then return v_receipt; end if;

  select * into v_bill from bills where id = v_payment.bill_id;
  select * into v_property from properties where id = v_bill.property_id;

  v_year := extract(year from v_payment.payment_date);
  v_month := extract(month from v_payment.payment_date);
  v_seq := fn_next_receipt_seq(v_property.id, v_year, v_month);
  v_number := upper(v_property.code) || '-' || v_year || '-' || lpad(v_month::text, 2, '0') || '-' || lpad(v_seq::text, 5, '0');

  insert into receipts(receipt_number, payment_id, tenant_id, property_id)
  values (v_number, p_payment_id, v_payment.tenant_id, v_bill.property_id)
  returning * into v_receipt;

  return v_receipt;
end;
$$;

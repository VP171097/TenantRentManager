-- =====================================================================
-- 040: Queue an expense charge when the tenant has no bill yet.
--
-- Previously, charging an expense to a tenant only worked if they
-- already had a bill for the current month — otherwise the charge was
-- silently dropped (fixed in the app layer separately; this migration
-- fixes the underlying gap: there was no way to defer the charge to
-- whenever the tenant's next bill actually gets generated).
--
-- pending_tenant_charges holds unapplied charges. fn_generate_bill now
-- folds any unapplied charges for that tenant into the new bill's
-- other_charges automatically and marks them applied — no app-code
-- polling or separate "apply pending charges" step needed. A new
-- fn_apply_pending_charges_now lets the app fold them into an
-- *already-existing* current-month bill immediately, for the common
-- case where the tenant's bill already exists when the expense is added.
-- =====================================================================

create table if not exists pending_tenant_charges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  expense_id uuid references expenses(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  description text,
  applied_bill_id uuid references bills(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pending_tenant_charges_tenant_unapplied
  on pending_tenant_charges(tenant_id) where applied_bill_id is null;
create index if not exists idx_pending_tenant_charges_owner_id on pending_tenant_charges(owner_id);

alter table pending_tenant_charges enable row level security;

create policy pending_tenant_charges_owner_all on pending_tenant_charges for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy pending_tenant_charges_manager_select on pending_tenant_charges for select
  using (fn_manager_has_perm(property_id, 'can_view_ledger'));

create policy pending_tenant_charges_manager_insert on pending_tenant_charges for insert
  with check (fn_manager_has_perm(property_id, 'can_manage_expenses'));

create policy pending_tenant_charges_manager_delete on pending_tenant_charges for delete
  using (fn_manager_has_perm(property_id, 'can_manage_expenses'));

-- ---------------------------------------------------------------------
-- Fold any unapplied pending charges into a bill that ALREADY exists
-- for this tenant/month — called right after an expense is queued, so
-- a tenant with a current bill sees the charge immediately instead of
-- waiting for their next billing cycle. No-op if no such bill exists
-- yet (the charge just stays pending for fn_generate_bill to pick up).
-- ---------------------------------------------------------------------
create or replace function fn_apply_pending_charges_now(p_tenant_id uuid, p_billing_month date)
returns bills language plpgsql as $$
declare
  v_bill bills;
  v_amount numeric;
  v_notes_add text;
  v_new_notes text;
begin
  select * into v_bill from bills where tenant_id = p_tenant_id and billing_month = p_billing_month;
  if not found then
    return null;
  end if;

  select coalesce(sum(amount), 0), string_agg('+ ' || coalesce(description, 'Additional charge') || ': ' || amount::text, E'\n')
    into v_amount, v_notes_add
  from pending_tenant_charges
  where tenant_id = p_tenant_id and applied_bill_id is null;

  if v_amount is null or v_amount = 0 then
    return v_bill;
  end if;

  v_new_notes := case when v_bill.notes is not null and v_bill.notes <> '' then v_bill.notes || E'\n' || v_notes_add else v_notes_add end;

  update bills set
    other_charges = other_charges + v_amount,
    notes = v_new_notes,
    total_due = total_due + v_amount,
    balance = balance + v_amount,
    status = (case
      when (total_due + v_amount - total_paid) <= 0 then 'paid'
      when total_paid > 0 then 'partial'
      else 'unpaid'
    end)::bill_status_enum
  where id = v_bill.id
  returning * into v_bill;

  update pending_tenant_charges set applied_bill_id = v_bill.id
  where tenant_id = p_tenant_id and applied_bill_id is null;

  return v_bill;
end;
$$;

-- ---------------------------------------------------------------------
-- fn_generate_bill: fold in any still-unapplied pending charges for this
-- tenant when a NEW bill is created (never touches an already-existing
-- bill — the idempotent early-return is unchanged). Based on the actual
-- current definition from migration 032 (electricity single source of
-- truth: reads is_billed/units_consumed/amount off electricity_readings
-- and snapshots previous/current_electricity_reading onto the bill) —
-- NOT the older 001/007 shape, which this migration must not regress to.
-- ---------------------------------------------------------------------
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
  v_reading electricity_readings;
  v_units numeric := 0;
  v_charge numeric := 0;
  v_prev_bill bills;
  v_prev_balance numeric := 0;
  v_prev_credit numeric := 0;
  v_total_due numeric;
  v_prev_reading numeric := null;
  v_curr_reading numeric := null;
  v_pending_amount numeric := 0;
  v_pending_notes text;
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
    v_prev_reading := v_reading.previous_reading;
    v_curr_reading := v_reading.current_reading;
    if v_reading.is_billed then
      v_units := v_reading.units_consumed;
      v_charge := v_reading.amount;
    end if;
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

  -- Fold in any expense charges queued while this tenant had no bill to
  -- attach them to (see pending_tenant_charges, migration 040).
  select coalesce(sum(amount), 0), string_agg('+ ' || coalesce(description, 'Additional charge') || ': ' || amount::text, E'\n')
    into v_pending_amount, v_pending_notes
  from pending_tenant_charges
  where tenant_id = p_tenant_id and applied_bill_id is null;

  v_total_due := v_rent + v_charge + p_other_charges + v_pending_amount + p_late_fee + v_prev_balance - v_prev_credit;

  insert into bills (
    tenant_id, property_id, room_id, billing_month,
    rent_amount, electricity_units, electricity_charge,
    other_charges, late_fee, previous_balance, previous_credit,
    total_due, balance, previous_electricity_reading, current_electricity_reading, notes
  ) values (
    p_tenant_id, v_tenant.property_id, v_tenant.room_id, p_billing_month,
    v_rent, v_units, v_charge,
    p_other_charges + v_pending_amount, p_late_fee, v_prev_balance, v_prev_credit,
    v_total_due, v_total_due, v_prev_reading, v_curr_reading, v_pending_notes
  ) returning * into v_bill;

  if v_pending_amount > 0 then
    update pending_tenant_charges set applied_bill_id = v_bill.id
    where tenant_id = p_tenant_id and applied_bill_id is null;
  end if;

  return v_bill;
end;
$$;

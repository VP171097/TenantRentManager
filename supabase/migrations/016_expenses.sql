-- =====================================================================
-- Expense tracking: maintenance/repair/utility/etc costs tracked
-- separately from tenant billing, so the owner can see a true income vs
-- expense picture. Mirrors the RLS pattern used throughout the app —
-- owner has full access, managers are gated by a new can_manage_expenses
-- permission flag (write) / can_view_ledger (read, consistent with how
-- other financial data like bills/payments is gated for managers).
-- =====================================================================

alter table manager_permissions add column if not exists can_manage_expenses boolean not null default false;

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  category text not null check (category in ('maintenance', 'repair', 'utility', 'tax', 'insurance', 'other')),
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_owner_id on expenses(owner_id);
create index if not exists idx_expenses_property_id on expenses(property_id);
create index if not exists idx_expenses_expense_date on expenses(expense_date);

alter table expenses enable row level security;

create policy expenses_owner_all on expenses for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy expenses_manager_select on expenses for select
  using (fn_manager_has_perm(property_id, 'can_view_ledger'));

create policy expenses_manager_insert on expenses for insert
  with check (fn_manager_has_perm(property_id, 'can_manage_expenses'));

create policy expenses_manager_update on expenses for update
  using (fn_manager_has_perm(property_id, 'can_manage_expenses'))
  with check (fn_manager_has_perm(property_id, 'can_manage_expenses'));

create policy expenses_manager_delete on expenses for delete
  using (fn_manager_has_perm(property_id, 'can_manage_expenses'));

-- =====================================================================
-- Payment Approvals
-- =====================================================================

alter table payments add column if not exists is_approved boolean not null default true;
alter table payments add column if not exists approved_by uuid references profiles(id);
alter table payments add column if not exists approved_at timestamptz;

-- Default existing payments to approved
update payments set is_approved = true, approved_at = created_at where is_approved is null;

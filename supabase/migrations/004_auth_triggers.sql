-- =====================================================================
-- Auth wiring: auto-create a profile row when a new auth.users row is
-- created. Role/owner_id/full_name come from signup metadata, so the app
-- must pass them via supabase.auth.signUp({ options: { data: {...} } }).
-- =====================================================================

create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, email, phone, owner_id)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::role_enum, 'owner'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'owner_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function fn_handle_new_user();

-- =====================================================================
-- Move-out settlement: closes out a tenant, records a final electricity
-- reading/bill if provided, and applies deposit adjustment/refund as a
-- final "other_charges" style entry on the final bill for a clear trail.
-- =====================================================================
create or replace function fn_settle_move_out(
  p_tenant_id uuid,
  p_move_out_date date,
  p_final_billing_month date,
  p_final_current_reading numeric,
  p_deposit_deduction numeric default 0,
  p_deduction_reason text default null
) returns bills language plpgsql as $$
declare
  v_tenant tenants;
  v_room_id uuid;
  v_rate numeric;
  v_prev_reading numeric;
  v_bill bills;
  v_deposit_refund numeric;
begin
  select * into v_tenant from tenants where id = p_tenant_id;
  if not found then raise exception 'Tenant not found'; end if;

  v_room_id := v_tenant.room_id;

  select coalesce(current_reading, 0) into v_prev_reading
    from electricity_readings
    where tenant_id = p_tenant_id and billing_month < p_final_billing_month
    order by billing_month desc limit 1;

  v_rate := fn_applicable_electricity_rate(v_room_id, p_final_billing_month);
  if v_rate is null then v_rate := 0; end if;

  insert into electricity_readings(room_id, tenant_id, billing_month, previous_reading, current_reading, rate_per_unit)
  values (v_room_id, p_tenant_id, p_final_billing_month, coalesce(v_prev_reading, 0), p_final_current_reading, v_rate)
  on conflict (tenant_id, billing_month) do update
    set current_reading = excluded.current_reading;

  -- Deposit refund = deposit - deductions; negative other_charges reduces
  -- total_due (i.e. acts as a credit against what's owed).
  v_deposit_refund := v_tenant.security_deposit - p_deposit_deduction;

  v_bill := fn_generate_bill(p_tenant_id, p_final_billing_month, -v_deposit_refund, 0);
  if v_bill.notes is null then
    update bills set notes = coalesce('Move-out settlement. ' || coalesce(p_deduction_reason, ''), '')
    where id = v_bill.id
    returning * into v_bill;
  end if;

  update tenants set status = 'moved_out', move_out_date = p_move_out_date, room_id = null
  where id = p_tenant_id;

  update rooms set status = 'vacant' where id = v_room_id;

  return v_bill;
end;
$$;

-- =====================================================================
-- Seed helper: records an electricity reading then generates the bill
-- for that tenant/month in one call. Used only by 005_seed_demo_data.sql.
-- =====================================================================
create or replace function fn_generate_electricity_and_bill(
  p_tenant_id uuid,
  p_room_id uuid,
  p_billing_month date,
  p_previous_reading numeric,
  p_current_reading numeric,
  p_rate numeric
) returns bills language plpgsql as $$
begin
  insert into electricity_readings (room_id, tenant_id, billing_month, previous_reading, current_reading, rate_per_unit)
  values (p_room_id, p_tenant_id, p_billing_month, p_previous_reading, p_current_reading, p_rate)
  on conflict (tenant_id, billing_month) do nothing;

  return fn_generate_bill(p_tenant_id, p_billing_month);
end;
$$;

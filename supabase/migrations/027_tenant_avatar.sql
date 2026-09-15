-- =====================================================================
-- 027: Update tenant self-service profile edit to include avatar
-- =====================================================================

create or replace function fn_tenant_update_own_profile(p_phone text, p_email text, p_avatar_url text default null)
returns tenants language plpgsql security definer set search_path = public as $$
declare
  v_tenant tenants;
begin
  if not exists (select 1 from tenants where profile_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update tenants set
    phone = coalesce(p_phone, phone),
    email = p_email,
    avatar_url = coalesce(p_avatar_url, avatar_url)
  where profile_id = auth.uid()
  returning * into v_tenant;

  return v_tenant;
end;
$$;

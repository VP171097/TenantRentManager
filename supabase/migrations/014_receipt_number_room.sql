-- =====================================================================
-- Receipt numbers now include the room number, e.g.
-- KRISHNA-204-2026-08-00041 instead of KRISHNA-2026-08-00041, so a
-- receipt is identifiable by room at a glance.
-- =====================================================================
create or replace function fn_generate_receipt(p_payment_id uuid) returns receipts language plpgsql as $$
declare
  v_payment payments;
  v_bill bills;
  v_property properties;
  v_room_number text;
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
  select room_number into v_room_number from rooms where id = v_bill.room_id;

  v_year := extract(year from v_payment.payment_date);
  v_month := extract(month from v_payment.payment_date);
  v_seq := fn_next_receipt_seq(v_property.id, v_year, v_month);
  v_number := upper(v_property.code)
    || '-' || coalesce(upper(regexp_replace(v_room_number, '\s+', '', 'g')), 'NA')
    || '-' || v_year || '-' || lpad(v_month::text, 2, '0') || '-' || lpad(v_seq::text, 5, '0');

  insert into receipts(receipt_number, payment_id, tenant_id, property_id)
  values (v_number, p_payment_id, v_payment.tenant_id, v_bill.property_id)
  returning * into v_receipt;

  return v_receipt;
end;
$$;

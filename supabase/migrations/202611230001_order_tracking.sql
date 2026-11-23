-- Order Tracking: status timestamps + secure public RPC with server-side masking
-- Safe to run on existing databases without losing data.

alter table public.orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists shipping_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz;

-- Backfill timestamps for existing orders that already progressed past 'pending'
update public.orders
set
  confirmed_at = case
    when status in ('confirmed', 'shipping', 'completed') and confirmed_at is null then updated_at
    else confirmed_at
  end,
  shipping_at = case
    when status in ('shipping', 'completed') and shipping_at is null then updated_at
    else shipping_at
  end,
  completed_at = case
    when status = 'completed' and completed_at is null then updated_at
    else completed_at
  end,
  cancelled_at = case
    when status = 'cancelled' and cancelled_at is null then updated_at
    else cancelled_at
  end
where status <> 'pending';

create or replace function public.record_order_status_timestamps()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'confirmed' then
      new.confirmed_at := now();
      new.cancelled_at := null;
    elsif new.status = 'shipping' then
      new.confirmed_at := coalesce(new.confirmed_at, now());
      new.shipping_at := now();
      new.cancelled_at := null;
    elsif new.status = 'completed' then
      new.confirmed_at := coalesce(new.confirmed_at, now());
      new.shipping_at := coalesce(new.shipping_at, now());
      new.completed_at := now();
      new.cancelled_at := null;
    elsif new.status = 'cancelled' then
      new.cancelled_at := now();
    elsif new.status = 'pending' then
      new.cancelled_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_status_timestamps on public.orders;
create trigger orders_status_timestamps
before update on public.orders
for each row
execute function public.record_order_status_timestamps();

create or replace function public.track_order(_code text, _phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(trim(coalesce(_code, '')));
  v_phone text := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
  v_order public.orders%rowtype;
  v_digits text;
  v_masked_phone text;
  v_addr text;
  v_comma integer;
  v_masked_address text;
  v_items jsonb;
begin
  if length(v_code) < 4 or length(v_phone) < 8 then
    return null;
  end if;

  select * into v_order
  from public.orders
  where upper(code) = v_code
    and regexp_replace(phone, '[^0-9]', '', 'g') = v_phone
  limit 1;

  if not found then
    return null;
  end if;

  -- Mask phone: keep first 3 and last 3 digits (e.g. 090****567)
  v_digits := regexp_replace(coalesce(v_order.phone, ''), '[^0-9]', '', 'g');
  if length(v_digits) >= 7 then
    v_masked_phone := left(v_digits, 3) || repeat('*', length(v_digits) - 6) || right(v_digits, 3);
  else
    v_masked_phone := '****';
  end if;

  -- Mask address: hide house number / street before first comma
  v_addr := trim(coalesce(v_order.address, ''));
  v_comma := strpos(v_addr, ',');
  if v_comma > 0 and v_comma < length(v_addr) then
    v_masked_address := '***' || substr(v_addr, v_comma);
  elsif length(v_addr) > 10 then
    v_masked_address := '*** ' || right(v_addr, greatest(6, length(v_addr) / 2));
  else
    v_masked_address := '***';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'product_id', i.product_id,
      'product_name', i.product_name,
      'sku', i.sku,
      'image_url', i.image_url,
      'size', i.size,
      'color', i.color,
      'quantity', i.quantity,
      'unit_price', i.unit_price,
      'line_total', i.line_total
    ) order by i.id
  ), '[]'::jsonb)
  into v_items
  from public.order_items i
  where i.order_id = v_order.id;

  return jsonb_build_object(
    'code', v_order.code,
    'customer_name', v_order.customer_name,
    'masked_phone', v_masked_phone,
    'masked_address', v_masked_address,
    'notes', v_order.notes,
    'status', v_order.status,
    'payment_method', 'Thanh toán khi nhận hàng (COD)',
    'total', v_order.total,
    'created_at', v_order.created_at,
    'confirmed_at', v_order.confirmed_at,
    'shipping_at', v_order.shipping_at,
    'completed_at', v_order.completed_at,
    'cancelled_at', v_order.cancelled_at,
    'updated_at', v_order.updated_at,
    'items', v_items
  );
end;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

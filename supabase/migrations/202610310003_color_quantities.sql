-- Allow direct per-color quantities while retaining selectable product sizes.
begin;
alter table public.products add column stock_by_color boolean not null default false;
alter function public.save_product_editor(uuid,jsonb,timestamptz,jsonb,jsonb) rename to save_product_variant_editor;
revoke all on function public.save_product_variant_editor(uuid,jsonb,timestamptz,jsonb,jsonb) from public, anon, authenticated;

create function public.save_product_editor(
  _id uuid, _product jsonb, _expected_updated_at timestamptz, _variants jsonb, _images jsonb
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_product public.products%rowtype;
  v_data jsonb;
  v_by_color boolean;
  v_sizes text[];
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được lưu sản phẩm'; end if;
  select * into v_product from public.products where id = _id for update;
  if not found then raise exception 'Không tìm thấy sản phẩm'; end if;
  v_by_color := coalesce((_product->>'stock_by_color')::boolean, v_product.stock_by_color);
  v_data := _product;
  if v_by_color then
    if _variants is null then raise exception 'Cần nhập số lượng cho từng màu'; end if;
    if _product ? 'sizes' then
      if jsonb_typeof(_product->'sizes') is distinct from 'array'
         or exists (select 1 from jsonb_array_elements(_product->'sizes') x where jsonb_typeof(x) <> 'string') then
        raise exception 'Danh sách size không hợp lệ';
      end if;
      select coalesce(array_agg(value), '{}'::text[]) into v_sizes from jsonb_array_elements_text(_product->'sizes');
    else v_sizes := v_product.sizes;
    end if;
    if exists (select 1 from unnest(v_sizes) x where length(trim(x)) not between 1 and 100 or x <> trim(x))
       or cardinality(v_sizes) <> (select count(distinct lower(x)) from unnest(v_sizes) x) then
      raise exception 'Size không được trùng hoặc để trống';
    end if;
    -- A null-size row holds the shared quantity of a color. The original RPC
    -- validates/upserts these rows and preserves old variants referenced by orders.
    v_data := _product || jsonb_build_object('sizes', '[]'::jsonb);
  end if;
  perform public.save_product_variant_editor(_id, v_data, _expected_updated_at, _variants, _images);
  if v_by_color then
    update public.products set sizes = v_sizes, stock_by_color = true where id = _id returning * into v_product;
  else
    update public.products set stock_by_color = false where id = _id returning * into v_product;
  end if;
  return to_jsonb(v_product);
end;
$$;
revoke all on function public.save_product_editor(uuid,jsonb,timestamptz,jsonb,jsonb) from public;
grant execute on function public.save_product_editor(uuid,jsonb,timestamptz,jsonb,jsonb) to authenticated;

create or replace function public.place_order(
  _customer_name text,
  _phone text,
  _address text,
  _notes text,
  _items jsonb
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_item jsonb;
  v_qty integer;
  v_size text;
  v_color text;
  v_variant_id uuid;
  v_image text;
  v_total numeric(12,0) := 0;
begin
  if length(trim(coalesce(_customer_name, ''))) not between 2 and 120
     or length(trim(coalesce(_phone, ''))) not between 8 and 20
     or trim(coalesce(_phone, '')) !~ '^[0-9+(). -]+$'
     or length(trim(coalesce(_address, ''))) not between 8 and 500
     or length(coalesce(_notes, '')) > 1000 then
    raise exception 'Thông tin khách hàng chưa đầy đủ';
  end if;
  if jsonb_typeof(_items) is distinct from 'array'
     or jsonb_array_length(_items) = 0
     or jsonb_array_length(_items) > 50 then
    raise exception 'Giỏ hàng không hợp lệ';
  end if;

  insert into public.orders (code, user_id, customer_name, phone, address, notes)
  values (
    'MS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    (select auth.uid()), trim(_customer_name), trim(_phone), trim(_address), nullif(trim(coalesce(_notes, '')), '')
  ) returning * into v_order;

  -- Use the same product-first lock order for checkout, editor and cancellation.
  perform 1 from public.products
    where id in (select (value ->> 'product_id')::uuid from jsonb_array_elements(_items))
    order by id for update;
  for v_item in select value from jsonb_array_elements(_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    v_size := nullif(trim(coalesce(v_item ->> 'size', '')), '');
    v_color := nullif(trim(coalesce(v_item ->> 'color', '')), '');
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Số lượng đặt hàng không hợp lệ';
    end if;
    if length(coalesce(v_size, '')) > 100 or length(coalesce(v_color, '')) > 100 then
      raise exception 'Tùy chọn sản phẩm không hợp lệ';
    end if;

    select * into v_product from public.products
    where id = (v_item ->> 'product_id')::uuid and status = 'published'
    for update;
    if not found then raise exception 'Sản phẩm không còn được bán'; end if;
    if v_product.stock < v_qty then
      raise exception 'Sản phẩm % không đủ tồn kho', v_product.name;
    end if;
    if (cardinality(v_product.sizes) > 0 and (v_size is null or not v_size = any(v_product.sizes)))
       or (cardinality(v_product.sizes) = 0 and v_size is not null) then
      raise exception 'Kích thước không hợp lệ cho %', v_product.name;
    end if;
    if (cardinality(v_product.colors) > 0 and ((v_color is null and (v_product.kind = 'fashion' or v_product.variant_mode = 'tracked' or exists (select 1 from public.product_variants where product_id = v_product.id and is_active))) or (v_color is not null and not v_color = any(v_product.colors))))
       or (cardinality(v_product.colors) = 0 and v_color is not null) then
      raise exception 'Màu sắc không hợp lệ cho %', v_product.name;
    end if;

    v_variant_id := null;
    v_variant := null;
    if v_product.variant_mode = 'tracked' or exists (select 1 from public.product_variants where product_id = v_product.id and is_active) then
      select * into v_variant from public.product_variants
      where product_id = v_product.id and is_active
        and size is not distinct from (case when v_product.stock_by_color then null else v_size end)
        and color is not distinct from v_color
      for update;
      if not found then raise exception 'Phiên bản sản phẩm không hợp lệ'; end if;
      if (v_product.variant_mode = 'tracked' and v_variant.stock is null) or (v_variant.stock is not null and v_variant.stock < v_qty) then
        raise exception 'Phiên bản sản phẩm % không đủ tồn kho', v_product.name;
      end if;
      v_variant_id := v_variant.id;
      if v_variant.stock is not null then
        update public.product_variants set stock = stock - v_qty where id = v_variant_id;
      end if;
    end if;

    update public.products
      set stock = stock - v_qty, sold_count = sold_count + v_qty
      where id = v_product.id;
    select url into v_image from public.product_images
      where product_id = v_product.id and (color = v_color or color is null)
      order by (color = v_color) desc nulls last, is_color_primary desc, is_primary desc, sort_order, id limit 1;
    insert into public.order_items (
      order_id, product_id, variant_id, product_name, sku, image_url,
      size, color, quantity, unit_price, line_total
    ) values (
      v_order.id, v_product.id, v_variant_id, v_product.name, coalesce(v_variant.sku, v_product.sku),
      coalesce(v_image, v_product.cover_image), v_size, v_color, v_qty, v_product.price,
      v_product.price * v_qty
    );
    v_total := v_total + v_product.price * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_order.id returning * into v_order;
  return to_jsonb(v_order) || jsonb_build_object('items', (
    select coalesce(jsonb_agg(to_jsonb(oi) order by oi.id), '[]'::jsonb)
    from public.order_items oi where oi.order_id = v_order.id
  ));
end;
$$;

revoke all on function public.place_order(text,text,text,text,jsonb) from public;
grant execute on function public.place_order(text,text,text,text,jsonb) to anon, authenticated;

create or replace function public.restock_cancelled_order()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_item public.order_items%rowtype;
  v_product public.products%rowtype;
  v_variant_id uuid;
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then raise exception 'Đơn hàng đã hủy không thể kích hoạt lại'; end if;
  if old.status <> 'cancelled' and new.status = 'cancelled' then
    perform 1 from public.products where id in (select product_id from public.order_items where order_id = old.id) order by id for update;
    for v_item in select * from public.order_items where order_id = old.id loop
      select * into v_product from public.products where id = v_item.product_id;
      if not found then continue; end if;
      v_variant_id := v_item.variant_id;
      -- Match the current inventory mode, including orders placed before a mode change.
      if v_product.variant_mode = 'tracked' then
        select id into v_variant_id from public.product_variants where product_id = v_item.product_id
          and size is not distinct from (case when v_product.stock_by_color then null else v_item.size end) and color is not distinct from v_item.color;
        if v_variant_id is null then
          insert into public.product_variants(product_id, size, color, stock, is_active)
          values (v_item.product_id, case when v_product.stock_by_color then null else v_item.size end, v_item.color, 0, false) returning id into v_variant_id;
        end if;
      end if;
      if v_variant_id is not null then
        update public.product_variants set stock = stock + v_item.quantity where id = v_variant_id and stock is not null;
      end if;
      update public.products set stock = stock + v_item.quantity, sold_count = greatest(0, sold_count - v_item.quantity)
        where id = v_item.product_id;
      -- The products_tracked_stock trigger recomputes active stock only. An archived
      -- variant is restocked in its own row without becoming available for sale.
    end loop;
  end if;
  return new;
end;
$$;
commit;

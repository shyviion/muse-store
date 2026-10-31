-- Additive upgrade: no products, orders or storage objects are removed.
begin;
alter table public.products add column variant_mode text not null default 'legacy'
  check (variant_mode in ('legacy', 'tracked'));
alter table public.product_variants add column is_active boolean not null default true;
alter table public.product_images add column color text;
alter table public.product_images add column is_color_primary boolean not null default false;
alter table public.product_images add constraint product_image_color_primary_requires_color
  check (not is_color_primary or color is not null);
create unique index product_one_color_primary_image_idx on public.product_images(product_id, color)
  where is_color_primary and color is not null;

-- Legacy products keep their existing stock and implicit color/size combinations.
-- Stock is only split when an admin explicitly supplies the complete matrix.
create or replace function public.sync_tracked_product_stock()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if old.variant_mode = 'tracked' and new.variant_mode <> 'tracked' then
    raise exception 'Sản phẩm đã quản lý biến thể không thể chuyển về tồn kho chung';
  end if;
  if new.variant_mode = 'tracked' then
    if new.kind <> 'fashion' then raise exception 'Sản phẩm biến thể phải thuộc thời trang'; end if;
    new.stock := coalesce((select sum(stock) from public.product_variants where product_id = new.id and is_active), 0);
  end if;
  return new;
end;
$$;
create trigger products_tracked_stock before update on public.products
for each row execute function public.sync_tracked_product_stock();

create or replace function public.save_product_editor(
  _id uuid, _product jsonb, _expected_updated_at timestamptz,
  _variants jsonb, _images jsonb
)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_current public.products%rowtype;
  v_next public.products%rowtype;
  v_item jsonb;
  v_size text;
  v_color text;
  v_stock integer;
  v_total bigint;
  v_mode text;
  v_cover text;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được lưu sản phẩm'; end if;
  select * into v_current from public.products where id = _id for update;
  if not found then raise exception 'Không tìm thấy sản phẩm'; end if;
  if _expected_updated_at is null or v_current.updated_at <> _expected_updated_at then
    raise exception 'Sản phẩm hoặc tồn kho vừa thay đổi. Hãy tải lại trang trước khi sửa để lấy số lượng mới nhất.';
  end if;
  v_next := jsonb_populate_record(v_current, _product);
  if nullif(trim(v_next.name), '') is null or nullif(trim(v_next.sku), '') is null or v_next.price < 0 then
    raise exception 'Tên, mã và giá sản phẩm phải hợp lệ';
  end if;
  if v_next.colors is null or v_next.sizes is null then raise exception 'Danh sách tùy chọn không hợp lệ'; end if;
  if exists (select 1 from unnest(v_next.colors || v_next.sizes) x where x is null or length(trim(x)) not between 1 and 100 or x <> trim(x))
     or cardinality(v_next.colors) <> (select count(distinct lower(x)) from unnest(v_next.colors) x)
     or cardinality(v_next.sizes) <> (select count(distinct lower(x)) from unnest(v_next.sizes) x) then
    raise exception 'Màu và size không được trùng, để trống hoặc dài quá 100 ký tự';
  end if;
  v_mode := case when _variants is not null then 'tracked' else v_current.variant_mode end;
  if v_current.variant_mode = 'tracked' and _variants is null then raise exception 'Cần nhập bảng tồn kho màu–size'; end if;
  if _variants is not null then
    if v_next.kind <> 'fashion' or jsonb_typeof(_variants) <> 'array' then raise exception 'Dữ liệu biến thể không hợp lệ'; end if;
    if jsonb_array_length(_variants) <> greatest(1, cardinality(v_next.colors)) * greatest(1, cardinality(v_next.sizes)) then
      raise exception 'Cần nhập đầy đủ các tổ hợp màu–size';
    end if;
    if exists (select 1 from jsonb_array_elements(_variants) x group by x->>'color', x->>'size' having count(*) > 1) then
      raise exception 'Biến thể bị trùng';
    end if;
    for v_item in select value from jsonb_array_elements(_variants) loop
      v_color := v_item->>'color'; v_size := v_item->>'size';
      if (cardinality(v_next.colors) > 0 and (v_color is null or not v_color = any(v_next.colors)))
         or (cardinality(v_next.colors) = 0 and v_color is not null)
         or (cardinality(v_next.sizes) > 0 and (v_size is null or not v_size = any(v_next.sizes)))
         or (cardinality(v_next.sizes) = 0 and v_size is not null)
         or coalesce(v_item->>'stock', '') !~ '^[0-9]+$' then
        raise exception 'Màu, size hoặc tồn kho biến thể không hợp lệ';
      end if;
      v_stock := (v_item->>'stock')::integer;
    end loop;
    select sum((value->>'stock')::integer) into v_total from jsonb_array_elements(_variants);
    if v_total > 2147483647 then raise exception 'Tổng tồn kho quá lớn'; end if;
    -- Archive omitted variants; preserve IDs/SKUs referenced by old orders.
    update public.product_variants set is_active = false where product_id = _id;
    for v_item in select value from jsonb_array_elements(_variants) loop
      insert into public.product_variants(product_id, color, size, stock, is_active)
      values (_id, v_item->>'color', v_item->>'size', (v_item->>'stock')::integer, true)
      on conflict (product_id, size, color) do update set stock = excluded.stock, is_active = true;
    end loop;
    v_next.stock := v_total::integer;
  else
    update public.product_variants set is_active = false where product_id = _id and (
      (cardinality(v_next.colors) > 0 and (color is null or not color = any(v_next.colors)))
      or (cardinality(v_next.colors) = 0 and color is not null)
      or (cardinality(v_next.sizes) > 0 and (size is null or not size = any(v_next.sizes)))
      or (cardinality(v_next.sizes) = 0 and size is not null)
    );
  end if;
  if jsonb_typeof(_images) is distinct from 'array' or jsonb_array_length(_images) > 12 then raise exception 'Danh sách ảnh không hợp lệ'; end if;
  if exists (select 1 from jsonb_array_elements(_images) x where not exists (
       select 1 from public.product_images i where i.id = (x->>'id')::uuid and i.product_id = _id))
     or (select count(distinct value->>'id') from jsonb_array_elements(_images)) <> jsonb_array_length(_images) then
    raise exception 'Ảnh không thuộc sản phẩm này hoặc bị trùng';
  end if;
  if exists (select 1 from jsonb_array_elements(_images) x where x->>'color' is not null and not (x->>'color') = any(v_next.colors)) then
    raise exception 'Màu của ảnh không thuộc sản phẩm';
  end if;
  if (select count(*) from jsonb_array_elements(_images) x where (x->>'is_primary')::boolean) > 1
     or exists (select 1 from jsonb_array_elements(_images) x where (x->>'is_color_primary')::boolean group by x->>'color' having count(*) > 1) then
    raise exception 'Mỗi nhóm chỉ được chọn một ảnh chính';
  end if;
  -- Remove associations only. Keep storage objects to preserve historical order images.
  delete from public.product_images where product_id = _id and id not in (select (value->>'id')::uuid from jsonb_array_elements(_images));
  update public.product_images set is_primary = false, is_color_primary = false where product_id = _id;
  for v_item in select value from jsonb_array_elements(_images) loop
    update public.product_images set color = v_item->>'color', is_primary = coalesce((v_item->>'is_primary')::boolean, false),
      is_color_primary = (v_item->>'color' is not null and coalesce((v_item->>'is_color_primary')::boolean, false))
      where id = (v_item->>'id')::uuid and product_id = _id;
  end loop;
  if not exists (select 1 from public.product_images where product_id = _id and is_primary) then
    update public.product_images set is_primary = true where id = (select id from public.product_images where product_id = _id order by sort_order, id limit 1);
  end if;
  update public.product_images i set is_color_primary = true
    where i.product_id = _id and i.color is not null
    and not exists (select 1 from public.product_images p where p.product_id = _id and p.color = i.color and p.is_color_primary)
    and i.id = (select p.id from public.product_images p where p.product_id = _id and p.color = i.color order by p.sort_order, p.id limit 1);
  select url into v_cover from public.product_images where product_id = _id and is_primary;
  if v_next.status = 'published' and (v_cover is null or v_next.category_id is null) then raise exception 'Chọn danh mục và thêm ảnh trước khi đăng sản phẩm'; end if;
  update public.products set
    name = trim(v_next.name), sku = upper(trim(v_next.sku)), slug = v_next.slug, kind = v_next.kind,
    category_id = v_next.category_id, brand = v_next.brand, price = v_next.price, original_price = v_next.original_price,
    stock = v_next.stock, short_description = v_next.short_description, description = v_next.description,
    cover_image = v_cover, sizes = v_next.sizes, colors = v_next.colors, material = v_next.material, fit = v_next.fit,
    size_chart = v_next.size_chart, volume = v_next.volume, ingredients = v_next.ingredients, benefits = v_next.benefits,
    skin_types = v_next.skin_types, usage = v_next.usage, status = v_next.status, is_new = v_next.is_new,
    is_featured = v_next.is_featured, is_sale = v_next.is_sale, variant_mode = v_mode
    where id = _id returning * into v_next;
  return to_jsonb(v_next);
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
        and size is not distinct from v_size
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
      -- An order made before conversion had no variant ID. Match its original options.
      if v_variant_id is null and v_product.variant_mode = 'tracked' then
        select id into v_variant_id from public.product_variants where product_id = v_item.product_id
          and size is not distinct from v_item.size and color is not distinct from v_item.color;
        if v_variant_id is null then
          insert into public.product_variants(product_id, size, color, stock, is_active)
          values (v_item.product_id, v_item.size, v_item.color, 0, false) returning id into v_variant_id;
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

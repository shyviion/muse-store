-- MUSE STORE: run with Supabase CLI migrations or in a new Supabase SQL editor.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  address text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.create_customer_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', 'customer');
  return new;
end;
$$;

create trigger create_customer_profile_after_signup
after insert on auth.users for each row execute function public.create_customer_profile();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('fashion', 'beauty')),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, kind)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text not null unique,
  name text not null,
  kind text not null check (kind in ('fashion', 'beauty')),
  category_id uuid,
  brand text not null default 'MUSE STORE',
  price numeric(12,0) not null check (price >= 0),
  original_price numeric(12,0) check (original_price is null or original_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  short_description text not null default '',
  description text not null default '',
  cover_image text,
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  material text,
  fit text,
  size_chart text,
  volume text,
  ingredients text,
  benefits text,
  skin_types text[] not null default '{}',
  usage text,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  is_new boolean not null default false,
  is_featured boolean not null default false,
  is_sale boolean not null default false,
  sold_count integer not null default 0 check (sold_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, kind) references public.categories(id, kind) on update cascade
);

create index products_public_catalog_idx on public.products(kind, status, created_at desc);
create index products_category_idx on public.products(category_id);
create index products_price_idx on public.products(price);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  storage_path text,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index product_one_primary_image_idx
  on public.product_images(product_id) where is_primary;
create index product_images_product_idx on public.product_images(product_id, sort_order);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique,
  size text,
  color text,
  stock integer check (stock is null or stock >= 0),
  unique nulls not distinct (product_id, size, color)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  address text not null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
  total numeric(12,0) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  sku text not null,
  image_url text,
  size text,
  color text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,0) not null check (unit_price >= 0),
  line_total numeric(12,0) not null check (line_total >= 0)
);

create index orders_recent_idx on public.orders(created_at desc);
create index order_items_order_idx on public.order_items(order_id);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  eyebrow text,
  image_url text not null,
  link_url text,
  link_label text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at before update on public.products
for each row execute function public.touch_updated_at();
create trigger orders_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.banners enable row level security;
alter table public.site_settings enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
-- No client role update policy or grant. Only a privileged SQL editor/service role can promote an admin.

create policy categories_public_read on public.categories for select to anon, authenticated
  using (true);
create policy categories_admin_write on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy products_public_read on public.products for select to anon, authenticated
  using (status = 'published');
create policy products_admin_all on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy product_images_public_read on public.product_images for select to anon, authenticated
  using (exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'
  ));
create policy product_images_admin_all on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy product_variants_public_read on public.product_variants for select to anon, authenticated
  using (exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'
  ));
create policy product_variants_admin_all on public.product_variants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy orders_admin_read on public.orders for select to authenticated
  using ((select public.is_admin()));
create policy orders_admin_update on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy order_items_admin_read on public.order_items for select to authenticated
  using ((select public.is_admin()));

create policy banners_public_read on public.banners for select to anon, authenticated
  using (is_active);
create policy banners_admin_all on public.banners for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy settings_public_read on public.site_settings for select to anon, authenticated
  using (key in (
    'announcement_text', 'hero_image_url', 'hero_title', 'hero_subtitle', 'about_title', 'about_body',
    'promo_title', 'promo_body', 'promo_link', 'contact_email'
  ));
create policy settings_admin_all on public.site_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.categories, public.products, public.product_images,
  public.product_variants, public.banners, public.site_settings to anon, authenticated;
-- Supabase projects may have broad default table grants. Remove them before granting
-- only the order operations used by the admin UI. The checkout RPC runs as its owner.
revoke all on public.orders from public, anon, authenticated;
grant select on public.profiles, public.orders, public.order_items to authenticated;
grant update (status) on public.orders to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images,
  public.product_variants, public.banners, public.site_settings to authenticated;

-- One public bucket; reads are public, mutations require an admin session.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('muse-assets', 'muse-assets', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy muse_assets_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'muse-assets');
create policy muse_assets_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'muse-assets' and (select public.is_admin()));
create policy muse_assets_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'muse-assets' and (select public.is_admin()))
  with check (bucket_id = 'muse-assets' and (select public.is_admin()));
create policy muse_assets_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'muse-assets' and (select public.is_admin()));

-- Customers, including guests, can create an order only through this function.
-- Prices, availability, and inventory are all determined inside the transaction.
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
    if cardinality(v_product.sizes) > 0 and
       (v_size is null or not v_size = any(v_product.sizes)) then
      raise exception 'Kích thước không hợp lệ cho %', v_product.name;
    end if;
    if cardinality(v_product.colors) > 0 and
       ((v_product.kind = 'fashion' and v_color is null)
        or (v_color is not null and not v_color = any(v_product.colors))) then
      raise exception 'Màu sắc không hợp lệ cho %', v_product.name;
    end if;

    v_variant_id := null;
    if exists (select 1 from public.product_variants where product_id = v_product.id) then
      select * into v_variant from public.product_variants
      where product_id = v_product.id
        and size is not distinct from v_size
        and color is not distinct from v_color
      for update;
      if not found then raise exception 'Phiên bản sản phẩm không hợp lệ'; end if;
      if v_variant.stock is not null and v_variant.stock < v_qty then
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
    insert into public.order_items (
      order_id, product_id, variant_id, product_name, sku, image_url,
      size, color, quantity, unit_price, line_total
    ) values (
      v_order.id, v_product.id, v_variant_id, v_product.name, v_product.sku,
      v_product.cover_image, v_size, v_color, v_qty, v_product.price,
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
declare v_item public.order_items%rowtype;
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'Đơn hàng đã hủy không thể kích hoạt lại';
  end if;
  if old.status <> 'cancelled' and new.status = 'cancelled' then
    for v_item in select * from public.order_items where order_id = old.id loop
      if v_item.product_id is not null then
        update public.products
          set stock = stock + v_item.quantity,
              sold_count = greatest(0, sold_count - v_item.quantity)
          where id = v_item.product_id;
      end if;
      if v_item.variant_id is not null then
        update public.product_variants set stock = stock + v_item.quantity
          where id = v_item.variant_id and stock is not null;
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger orders_restock_on_cancel before update of status on public.orders
for each row execute function public.restock_cancelled_order();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
     ) then
    alter publication supabase_realtime add table public.products;
  end if;
end;
$$;

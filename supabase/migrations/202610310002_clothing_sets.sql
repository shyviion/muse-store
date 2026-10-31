-- Add the clothing-set category without changing existing products or categories.
insert into public.categories (id, kind, slug, name, description, image_url, sort_order)
values (
  '10000000-0000-4000-8000-000000000015',
  'fashion', 'bo-quan-ao', 'Bộ quần áo',
  'Những bộ áo và quần phối sẵn, bán trọn bộ với màu và size tương ứng.',
  '/fashion-editorial.png', 15
)
on conflict do nothing;

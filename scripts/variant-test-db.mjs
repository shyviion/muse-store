// Isolated PostgreSQL fixture. Never connects to the project's Supabase database.
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '../node_modules/.variant-qa/node_modules/@electric-sql/pglite/dist/index.js')
export const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const db = new PGlite()
export const query = async (sql, params = []) => (await db.query(sql, params)).rows
export const product = async id => (await query('select to_jsonb(p) as value from products p where id=$1', [id]))[0].value
export async function setup() {
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;`)
  await db.exec(await readFile(new URL('../supabase/migrations/202610300001_initial.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/202610310001_product_variants.sql', import.meta.url), 'utf8'))
  await query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [adminId, 'admin@test.invalid', '{}'])
  await query("update profiles set role='admin' where id=$1", [adminId])
  await query("select set_config('request.jwt.claim.sub',$1,false)", [adminId])
}
export async function editor(id, data, variants, images, version) {
  const current = await product(id)
  return (await query('select save_product_editor($1,$2,$3,$4,$5) as value', [id, JSON.stringify(data), version || current.updated_at, variants === null ? null : JSON.stringify(variants), JSON.stringify(images)]))[0].value
}
export async function place(items) {
  return (await query('select place_order($1,$2,$3,$4,$5) as value', ['Khách thử nghiệm','0901234567','123 đường thử nghiệm','',JSON.stringify(items)]))[0].value
}
export async function imageRecords(id) { return query('select * from product_images where product_id=$1 order by sort_order,id', [id]) }
export async function fullProducts() {
  return (await query(`select to_jsonb(p) || jsonb_build_object('category',(select to_jsonb(c) from categories c where c.id=p.category_id), 'image_records',coalesce((select jsonb_agg(i) from product_images i where i.product_id=p.id),'[]'::jsonb),'variants',coalesce((select jsonb_agg(v) from product_variants v where v.product_id=p.id),'[]'::jsonb)) as value from products p order by p.created_at desc`)).map(row=>row.value)
}

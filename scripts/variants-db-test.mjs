import assert from 'node:assert/strict'
import { db, setup, query, product, editor, place, imageRecords } from './variant-test-db.mjs'
await setup()
try {
  const id = '20000000-0000-4000-8000-000000000001'
  const before = await product(id)
  assert.equal(before.variant_mode, 'legacy')
  const legacyOrder = await place([{product_id:id,color:before.colors[0],size:before.sizes[0],quantity:1}])
  const colors = ['Đen','Trắng','Kem'], sizes = ['S','M','L']
  const matrix = colors.flatMap(color=>sizes.map(size=>({color,size,stock:color==='Trắng' && size==='S'?0:3})))
  const images = await imageRecords(id)
  images[0].color='Đen'; images[0].is_color_primary=true
  const saved = await editor(id,{colors,sizes},matrix,images)
  assert.equal(saved.stock,24); assert.equal(saved.variant_mode,'tracked')
  assert.equal((await query('select count(*)::int as n from product_variants where product_id=$1 and is_active',[id]))[0].n,9)
  const order = await place([{product_id:id,color:'Đen',size:'S',quantity:2}])
  assert.equal(order.items[0].image_url,images[0].url)
  const variantId = order.items[0].variant_id
  assert.ok(variantId)
  assert.equal((await product(id)).stock,22)
  assert.equal((await query('select stock from product_variants where id=$1',[variantId]))[0].stock,1)
  await assert.rejects(place([{product_id:id,color:'Trắng',size:'S',quantity:1}]),/không đủ tồn kho/)
  const count = (await query('select count(*)::int as n from orders'))[0].n
  await assert.rejects(place([{product_id:id,color:'Đen',size:'S',quantity:1},{product_id:id,color:'Đen',size:'S',quantity:1}]),/không đủ tồn kho/)
  assert.equal((await query('select count(*)::int as n from orders'))[0].n,count)
  assert.equal((await product(id)).stock,22,'Failed multi-line order must roll back stock')
  // A color and a size may both exist while the requested pair does not.
  await query('update product_variants set is_active=false where product_id=$1 and color=$2 and size=$3',[id,'Kem','M'])
  await query('update products set stock=stock where id=$1',[id])
  await assert.rejects(place([{product_id:id,color:'Kem',size:'M',quantity:1}]),/không hợp lệ/)
  await assert.rejects(place([{product_id:id,color:'Đen',size:'XL',quantity:1}]),/không hợp lệ/)
  const currentImages=await imageRecords(id)
  await assert.rejects(editor(id,{colors,sizes},matrix,currentImages,saved.updated_at),/vừa thay đổi/)
  await assert.rejects(editor(id,{colors:['Đen','đen'],sizes},matrix,currentImages),/không được trùng/)
  await assert.rejects(editor(id,{colors,sizes},matrix.slice(1),currentImages),/đầy đủ/)
  await assert.rejects(editor(id,{colors,sizes},matrix.map((v,i)=>i? v:{...v,stock:-1}),currentImages),/không hợp lệ/)
  const other = '20000000-0000-4000-8000-000000000002'
  const foreign = (await imageRecords(other))[0]
  await assert.rejects(editor(id,{colors,sizes},matrix,[...currentImages,foreign]),/không thuộc/)
  // Remove a color without deleting its variants or images used by past orders.
  const reduced = matrix.filter(v=>v.color!=='Đen')
  const unassigned = currentImages.map(v=>({...v,color:null,is_color_primary:false}))
  await editor(id,{colors:['Trắng','Kem'],sizes},reduced,unassigned)
  await query("update orders set status='cancelled' where id=$1",[order.id])
  assert.equal((await query('select stock,is_active from product_variants where id=$1',[variantId]))[0].stock,3)
  assert.equal((await product(id)).stock,15,'Archived stock must not become sellable')
  await query("update orders set status='cancelled' where id=$1",[order.id])
  assert.equal((await product(id)).stock,15,'Cancellation must only restock once')
  await assert.rejects(query("update orders set status='pending' where id=$1",[order.id]),/không thể kích hoạt/)
  // Restore a color: the existing variant ID survives.
  await editor(id,{colors,sizes},matrix,unassigned)
  assert.equal((await query('select id from product_variants where product_id=$1 and color=$2 and size=$3',[id,'Đen','S']))[0].id,variantId)
  await query("update orders set status='cancelled' where id=$1",[legacyOrder.id])
  assert.ok((await product(id)).stock>=24,'Orders made before conversion remain cancellable')
  const beauty = (await query("select id from products where kind='beauty' limit 1"))[0].id
  const beautyStock = (await product(beauty)).stock
  const beautyOrder = await place([{product_id:beauty,quantity:1}])
  assert.equal((await product(beauty)).stock,beautyStock-1)
  await query("update orders set status='cancelled' where id=$1",[beautyOrder.id])
  assert.equal((await product(beauty)).stock,beautyStock)
  await assert.rejects(place([{product_id:beauty,size:'M',quantity:1}]),/không hợp lệ/)
  // Two requests competing for the final unit must yield one successful order.
  const lastUnit = matrix.map(v=>({...v,stock:v.color==='Đen'&&v.size==='M'?1:0}))
  await editor(id,{colors,sizes},lastUnit,unassigned)
  const attempts = await Promise.allSettled([place([{product_id:id,color:'Đen',size:'M',quantity:1}]),place([{product_id:id,color:'Đen',size:'M',quantity:1}])])
  assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1)
  assert.equal((await product(id)).stock,0)
  await db.exec('set role authenticated')
  await editor(id,{colors,sizes},matrix,unassigned)
  assert.equal((await product(id)).stock,24,'Authenticated admin must be able to save through RLS')
  await db.exec('reset role')
  // RPC must enforce its admin guard under the actual authenticated role.
  await db.exec("set role authenticated; select set_config('request.jwt.claim.sub','',false)")
  await assert.rejects(editor(id,{colors,sizes},matrix,unassigned),/quản trị viên/)
  await db.exec('reset role')
  await db.exec('set role anon')
  await assert.rejects(query('select save_product_editor($1,$2,$3,$4,$5)', [id,'{}',(await product(id)).updated_at,null,'[]']),/permission denied/)
  const guest = await place([{product_id:id,color:'Đen',size:'M',quantity:1}])
  assert.ok(guest.items[0].variant_id, 'Guest checkout remains available under the anon role')
  await db.exec('reset role')
  console.log('PASS PostgreSQL: additive migration, 9 variants, exact stock/image, rollback, invalid combinations, editor conflicts, validation, archive/re-add, cancellation, legacy conversion, beauty and admin authorization.')
} finally { await db.close() }

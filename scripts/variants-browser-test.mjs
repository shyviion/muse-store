// Real React UI and real PostgreSQL functions; HTTP/Storage/Auth transport is mocked.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'
import { db, setup, query, product, fullProducts, adminId } from './variant-test-db.mjs'
await setup()
const server = await createServer({ server:{host:'127.0.0.1',port:5417,strictPort:true}, define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://variant-qa.invalid'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify('test-key')} })
await server.listen()
const browser = await chromium.launch({executablePath:process.env.MUSE_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const context = await browser.newContext({viewport:{width:1440,height:1000}})
const page = await context.newPage()
page.setDefaultTimeout(12000)
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
const adminSession={access_token:'test-access-token',refresh_token:'test-refresh-token',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:adminId,email:'admin@test.invalid',aud:'authenticated',role:'authenticated'}}
await context.addInitScript(session=>{if (!localStorage.getItem('sb-variant-qa-auth-token')) localStorage.setItem('sb-variant-qa-auth-token',JSON.stringify(session))},adminSession)
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3XcAAAAASUVORK5CYII=','base64')
await context.route('https://images.unsplash.com/**',route=>route.fulfill({contentType:'image/png',body:png}))
await context.routeWebSocket('wss://variant-qa.invalid/**',ws=>ws.close())
await context.route('https://variant-qa.invalid/**',async route=>{
  const request=route.request(), url=new URL(request.url()), path=url.pathname
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Expose-Headers':'*','content-type':'application/json'}
  const send=(body,status=200)=>route.fulfill({status,headers,body:JSON.stringify(body)})
  if(request.method()==='OPTIONS') return send({})
  try {
    if(path.startsWith('/auth/v1/')) return send(adminSession.user)
    if(path.startsWith('/storage/v1/object/public/')) return route.fulfill({contentType:'image/png',body:png})
    if(path.startsWith('/storage/v1/object/')) return send({Key:path.split('/object/')[1]})
    const body=request.postDataJSON()
    if(path.endsWith('/rpc/is_admin')) return send(true)
    if(path.endsWith('/rpc/save_product_editor')) {
      const result=await query('select save_product_editor($1,$2,$3,$4,$5) as value',[body._id,JSON.stringify(body._product),body._expected_updated_at,body._variants===null?null:JSON.stringify(body._variants),JSON.stringify(body._images)])
      return send(result[0].value)
    }
    if(path.endsWith('/rpc/place_order')) {
      const result=await query('select place_order($1,$2,$3,$4,$5) as value',[body._customer_name,body._phone,body._address,body._notes,JSON.stringify(body._items)])
      return send(result[0].value)
    }
    const table=path.split('/').at(-1)
    if(!['products','product_images','categories','banners','site_settings','profiles','orders'].includes(table)) throw new Error('Unexpected test endpoint '+path)
    const single=request.headers().accept?.includes('vnd.pgrst.object')
    if(request.method()==='POST' || request.method()==='PATCH') {
      const keys=Object.keys(body)
      assert.ok(keys.every(key=>/^[a-z_]+$/.test(key)))
      const params=keys.map(key=>body[key])
      let sql
      if(request.method()==='POST') sql='insert into '+table+' ('+keys.join(',')+') values ('+keys.map((_,i)=>'$'+(i+1)).join(',')+') returning *'
      else {
        const id=url.searchParams.get('id')?.slice(3)
        sql='update '+table+' set '+keys.map((key,i)=>key+'=$'+(i+1)).join(',')+' where id=$'+(keys.length+1)+' returning *'; params.push(id)
      }
      const result=await query(sql,params)
      return send(single?result[0]:result)
    }
    let rows=table==='products'?await fullProducts():await query('select * from '+table)
    for(const [key,value] of url.searchParams) {
      if(value.startsWith('eq.')) rows=rows.filter(row=>String(row[key])===value.slice(3))
    }
    return send(single?rows[0]??null:rows)
  } catch(error) {
    console.error('Test API:',path,error.message)
    return send({message:error.message,code:error.code || 'TEST_ERROR'},400)
  }
})
const base='http://127.0.0.1:5417'
try {
  await page.goto(base+'/admin/products/new')
  await page.getByPlaceholder('Ví dụ: Đầm lụa dáng midi').fill('Bộ quần áo thử biến thể')
  await page.getByPlaceholder('MUSE-F001').fill('QA-VARIANT')
  await page.locator('select').filter({has:page.locator('option', {hasText:'Chọn danh mục'})}).selectOption({label:'Bộ quần áo'})
  await page.getByPlaceholder('890000').fill('120000')
  await page.getByRole('textbox',{name:'Màu sắc',exact:true}).fill('Đen, Trắng, Kem')
  await page.getByRole('textbox',{name:'Màu sắc',exact:true}).press('Enter')
  await page.getByRole('textbox',{name:'Kích thước',exact:true}).fill('S, M, L')
  await page.getByRole('textbox',{name:'Kích thước',exact:true}).press('Enter')
  assert.equal(await page.locator('.admin-variant-table input').count(),9)
  // Duplicate options are rejected without changing the matrix.
  await page.getByRole('textbox',{name:'Màu sắc',exact:true}).fill('đen')
  await page.getByRole('textbox',{name:'Màu sắc',exact:true}).press('Enter')
  assert.match(await page.locator('.admin-option-list').first().innerText(),/không được trùng/)
  await page.getByRole('textbox',{name:'Màu sắc',exact:true}).fill('')
  for(const color of ['Đen','Trắng','Kem']) for(const size of ['S','M','L']) {
    await page.getByRole('spinbutton',{name:'Tồn kho '+color+' – '+size,exact:true}).fill(color==='Trắng' && size==='S'?'0':'3')
  }
  for(const color of ['Đen','Trắng','Kem']) await page.getByLabel('Thêm ảnh '+color,{exact:true}).setInputFiles([{name:color+'-1.png',mimeType:'image/png',buffer:png},{name:color+'-2.png',mimeType:'image/png',buffer:png}])
  await page.locator('.admin-color-gallery').filter({has:page.getByRole('heading',{name:'Đen',exact:true})}).getByRole('button',{name:'Làm ảnh chính màu Đen',exact:true}).nth(1).click()
  await page.getByRole('button',{name:'Đăng sản phẩm',exact:true}).first().click()
  await page.waitForURL(base+'/admin/products')
  const saved=(await query("select to_jsonb(p) as value from products p where sku='QA-VARIANT'"))[0].value
  assert.equal(saved.stock,24)
  const imageRows=await query('select * from product_images where product_id=$1',[saved.id])
  assert.equal(imageRows.length,6)
  const blackPrimary=imageRows.find(image=>image.color==='Đen'&&image.is_color_primary).url
  // Clothing sets appear in their own storefront filter and remain one product.
  await page.goto(base+'/thoi-trang?category=bo-quan-ao')
  await page.locator('.product-card').waitFor()
  assert.equal(await page.locator('.product-card').count(),1)
  assert.match(await page.locator('.product-card').innerText(),/Bộ quần áo thử biến thể/)
  // Open editor again, verify persisted matrix and assignments.
  await page.goto(base+'/admin/products/'+saved.id+'/edit')
  assert.equal(await page.getByRole('spinbutton',{name:'Tồn kho Trắng – S',exact:true}).inputValue(),'0')
  assert.equal(await page.locator('.admin-color-image').count(),6)
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).first().click()
  await page.waitForURL(base+'/admin/products')
  // At mobile width the stock table scrolls inside the editor.
  await page.setViewportSize({width:390,height:844})
  await page.goto(base+'/admin/products/'+saved.id+'/edit')
  await page.locator('.admin-variant-table').waitFor()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile admin must not overflow')
  await page.setViewportSize({width:1440,height:1000})
  await page.goto(base+'/san-pham/'+saved.slug)
  await page.locator('.color-options button').getByText('Đen',{exact:true}).click()
  assert.equal(await page.locator('.detail-main-image img').getAttribute('src'),blackPrimary)
  assert.equal(await page.locator('.detail-thumbs button').count(),2)
  await page.locator('.size-options button').getByText('S',{exact:true}).click()
  await page.locator('.color-options button').getByText('Trắng',{exact:true}).click()
  assert.equal(await page.locator('.size-options button.active').count(),0,'Changing to an unavailable size must clear selection')
  assert.equal(await page.locator('.size-options button').getByText('S',{exact:true}).isDisabled(),true)
  const whiteImage=await page.locator('.detail-main-image img').getAttribute('src')
  assert.notEqual(whiteImage,blackPrimary)
  await page.locator('.size-options button').getByText('M',{exact:true}).click()
  await page.locator('.add-cart-button').click()
  await page.locator('.color-options button').getByText('Đen',{exact:true}).click()
  await page.locator('.add-cart-button').click()
  await page.goto(base+'/gio-hang')
  assert.equal(await page.locator('.cart-item').count(),2)
  const whiteLine=page.locator('.cart-item').filter({hasText:'Màu: Trắng'})
  assert.equal(await whiteLine.locator('img').getAttribute('src'),whiteImage)
  await page.reload()
  assert.equal(await page.locator('.cart-item').count(),2)
  await page.goto(base+'/thanh-toan')
  assert.equal(await page.locator('.checkout-line').count(),2)
  await page.getByPlaceholder('Nguyễn Thị A').fill('Khách thử nghiệm')
  await page.getByPlaceholder('09xx xxx xxx').fill('0901234567')
  await page.getByPlaceholder('Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành').fill('123 đường thử nghiệm')
  await page.locator('.checkout-submit').click()
  await page.locator('.checkout-success').waitFor()
  assert.equal((await product(saved.id)).stock,22)
  const stocks=await query("select color,stock from product_variants where product_id=$1 and size='M'",[saved.id])
  assert.equal(stocks.find(v=>v.color==='Trắng').stock,2)
  assert.equal(stocks.find(v=>v.color==='Đen').stock,2)
  const order=(await query('select id from orders order by created_at desc limit 1'))[0]
  const items=await query('select * from order_items where order_id=$1',[order.id])
  assert.equal(items.find(v=>v.color==='Trắng').image_url,whiteImage)
  await query("update orders set status='cancelled' where id=$1",[order.id])
  assert.equal((await product(saved.id)).stock,24)
  // Existing products stay on shared stock when saved without conversion.
  const legacyId='20000000-0000-4000-8000-000000000001'
  const legacyBefore=await product(legacyId)
  await page.goto(base+'/admin/products/'+legacyId+'/edit')
  assert.equal(await page.getByRole('checkbox',{name:'Quản lý tồn kho theo màu và size'}).isChecked(),false)
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).first().click()
  await page.waitForURL(base+'/admin/products')
  assert.equal((await product(legacyId)).stock,legacyBefore.stock)
  assert.equal((await product(legacyId)).variant_mode,'legacy')
  // Products with a fixed cosmetic shade remain purchasable without a selector.
  const cosmetic=(await query("select to_jsonb(p) as value from products p where kind='beauty' and cardinality(colors)>0 limit 1"))[0].value
  await page.goto(base+'/san-pham/'+cosmetic.slug)
  await page.locator('.add-cart-button').click()
  await page.goto(base+'/gio-hang')
  assert.equal(await page.locator('.cart-item').count(),1)
  assert.deepEqual(errors,[])
  console.log('PASS browser: admin 3×3 creation, duplicate validation, six color images, primary image, edit/reload, mobile, color switch, size reset, disabled stock, separate cart lines, checkout SQL stock decrement and cancellation.')
} finally {
  await context.close(); await browser.close(); await server.close(); await db.close()
}

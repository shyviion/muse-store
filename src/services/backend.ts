import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { sampleBanners, sampleCategories, sampleProducts, sampleSettings } from '../data/sample'
import { validateOptions } from '../utils/variants'
import type {
  Banner, BannerInput, Category, CategoryInput, DashboardStats, Order,
  OrderStatus, PlaceOrderInput, Product, ProductFilters, ProductImage,
  ProductInput, ProductVariantInput, Profile, SiteSettings,
} from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)
export const isConfigured = isSupabaseConfigured
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

const PRODUCT_SELECT = '*, category:categories(*), image_records:product_images(*), variants:product_variants(*)'

function client(): SupabaseClient {
  if (!supabase) throw new Error('Chưa cấu hình Supabase. Thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env.local.')
  return supabase
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

function normalizeProduct(raw: any): Product {
  const imageRecords: ProductImage[] = (raw.image_records ?? raw.product_images ?? [])
    .map((item: any) => ({ ...item, sort_order: Number(item.sort_order ?? 0) }))
    .sort((a: ProductImage, b: ProductImage) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
  const urls = imageRecords.map((item) => item.url)
  const cover = raw.cover_image ?? urls[0] ?? null
  if (cover && !urls.includes(cover)) urls.unshift(cover)
  return {
    ...raw,
    category: raw.category ?? null,
    price: Number(raw.price),
    original_price: raw.original_price == null ? null : Number(raw.original_price),
    stock: Number(raw.stock ?? 0),
    sold_count: Number(raw.sold_count ?? 0),
    cover_image: cover,
    images: urls,
    image_records: imageRecords,
    variants: raw.variants ?? raw.product_variants ?? [],
    variant_mode: raw.variant_mode ?? 'legacy',
    sizes: raw.sizes ?? [],
    colors: raw.colors ?? [],
    skin_types: raw.skin_types ?? [],
  } as Product
}

function normalizeOrder(raw: any): Order {
  return {
    ...raw,
    total: Number(raw.total ?? 0),
    items: (raw.items ?? raw.order_items ?? []).map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
    })),
  } as Order
}

function previewProducts(filters: ProductFilters): Product[] {
  let products = sampleProducts.filter((product) => product.status === 'published')
  if (filters.kind) products = products.filter((item) => item.kind === filters.kind)
  if (filters.category) products = products.filter((item) => item.category?.slug === filters.category || item.category_id === filters.category)
  if (filters.categoryId) products = products.filter((item) => item.category_id === filters.categoryId)
  if (filters.search) {
    const term = filters.search.toLocaleLowerCase('vi').trim()
    products = products.filter((item) => `${item.name} ${item.sku}`.toLocaleLowerCase('vi').includes(term))
  }
  if (filters.minPrice != null) products = products.filter((item) => item.price >= filters.minPrice!)
  if (filters.maxPrice != null) products = products.filter((item) => item.price <= filters.maxPrice!)
  if (filters.brand) products = products.filter((item) => item.brand.toLocaleLowerCase('vi').includes(filters.brand!.toLocaleLowerCase('vi')))
  if (filters.color) products = products.filter((item) => item.colors.includes(filters.color!))
  if (filters.size) products = products.filter((item) => item.sizes.includes(filters.size!))
  if (filters.skinType) products = products.filter((item) => item.skin_types.includes(filters.skinType!))
  if (filters.sale) products = products.filter((item) => item.is_sale)
  if (filters.newOnly) products = products.filter((item) => item.is_new)
  if (filters.featured) products = products.filter((item) => item.is_featured)
  products = [...products].sort((a, b) => {
    if (filters.sort === 'price-asc') return a.price - b.price
    if (filters.sort === 'price-desc') return b.price - a.price
    if (filters.sort === 'best-selling') return b.sold_count - a.sold_count
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  return filters.limit ? products.slice(0, filters.limit) : products
}

export async function listProducts(filters: ProductFilters = {}): Promise<Product[]> {
  if (!supabase) return previewProducts(filters)
  let query = supabase.from('products').select(PRODUCT_SELECT).eq('status', 'published')
  if (filters.kind) query = query.eq('kind', filters.kind)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.category) {
    const categories = await listCategories()
    const category = categories.find((item) => item.slug === filters.category || item.id === filters.category)
    if (!category) return []
    query = query.eq('category_id', category.id)
  }
  if (filters.search?.trim()) {
    const safe = filters.search.trim().replace(/[,()%]/g, '')
    query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`)
  }
  if (filters.minPrice != null) query = query.gte('price', filters.minPrice)
  if (filters.maxPrice != null) query = query.lte('price', filters.maxPrice)
  if (filters.brand) query = query.ilike('brand', `%${filters.brand.replace(/[%_]/g, '')}%`)
  if (filters.color) query = query.contains('colors', [filters.color])
  if (filters.size) query = query.contains('sizes', [filters.size])
  if (filters.skinType) query = query.contains('skin_types', [filters.skinType])
  if (filters.sale) query = query.eq('is_sale', true)
  if (filters.newOnly) query = query.eq('is_new', true)
  if (filters.featured) query = query.eq('is_featured', true)
  const sortField = filters.sort === 'price-asc' || filters.sort === 'price-desc'
    ? 'price' : filters.sort === 'best-selling' ? 'sold_count' : 'created_at'
  query = query.order(sortField, { ascending: filters.sort === 'price-asc' })
  if (filters.limit) query = query.limit(filters.limit)
  const { data, error } = await query
  fail(error)
  return (data ?? []).map(normalizeProduct)
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (!supabase) return sampleProducts.find((item) => item.slug === slug && item.status === 'published') ?? null
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).maybeSingle()
  fail(error)
  return data ? normalizeProduct(data) : null
}

export async function listCategories(): Promise<Category[]> {
  if (!supabase) return sampleCategories
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  fail(error)
  return (data ?? []) as Category[]
}

export async function listBanners(): Promise<Banner[]> {
  if (!supabase) return sampleBanners
  const { data, error } = await supabase.from('banners').select('*').eq('is_active', true).order('sort_order')
  fail(error)
  return (data ?? []) as Banner[]
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!supabase) return sampleSettings
  const { data, error } = await supabase.from('site_settings').select('key,value')
  fail(error)
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as SiteSettings
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  if (!input.items.length) throw new Error('Giỏ hàng đang trống.')
  const { data, error } = await client().rpc('place_order', {
    _customer_name: input.customer_name,
    _phone: input.phone,
    _address: input.address,
    _notes: input.notes ?? '',
    _items: input.items,
  })
  fail(error)
  return normalizeOrder(data)
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  fail(error)
  return data.session
}

export async function isAdmin(): Promise<boolean> {
  if (!supabase) return false
  const session = await getSession()
  if (!session) return false
  const { data, error } = await supabase.rpc('is_admin')
  fail(error)
  return data === true
}

export const getCurrentAdmin = isAdmin

export async function adminLogin(email: string, password: string): Promise<void> {
  const api = client()
  const { error } = await api.auth.signInWithPassword({ email: email.trim(), password })
  fail(error)
  if (!(await isAdmin())) {
    await api.auth.signOut()
    throw new Error('Tài khoản này không có quyền quản trị.')
  }
}

export const signInAdmin = adminLogin

export async function adminLogout(): Promise<void> {
  const { error } = await client().auth.signOut()
  fail(error)
}

export const signOutAdmin = adminLogout

export async function adminListProducts(): Promise<Product[]> {
  const { data, error } = await client().from('products').select(PRODUCT_SELECT).order('created_at', { ascending: false })
  fail(error)
  return (data ?? []).map(normalizeProduct)
}

export const listAdminProducts = adminListProducts

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  const api = client()
  if (!input.name?.trim() || !input.sku?.trim() || !Number.isFinite(input.price) || input.price < 0) {
    throw new Error('Tên, mã và giá sản phẩm phải hợp lệ.')
  }
  const fields = [
    'kind', 'category_id', 'brand', 'price', 'original_price', 'stock', 'short_description',
    'description', 'cover_image', 'sizes', 'colors', 'material', 'fit', 'size_chart',
    'volume', 'ingredients', 'benefits', 'skin_types', 'usage', 'status', 'is_new',
    'is_featured', 'is_sale',
  ] as const
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    sku: input.sku.trim().toUpperCase(),
  }
  if (input.slug?.trim() || !id) {
    payload.slug = slugify(input.slug?.trim() || `${input.name}-${input.sku}`)
  }
  for (const field of fields) {
    if (input[field] !== undefined) payload[field] = input[field]
  }
  if (id && input.stock !== undefined) {
    const { data: current, error } = await api.from('products').select('variant_mode').eq('id', id).single()
    fail(error)
    if (current?.variant_mode === 'tracked') throw new Error('Hãy cập nhật tồn kho từng màu–size trong trang chỉnh sửa sản phẩm.')
  }
  if (input.cover_image === undefined && input.images?.length) payload.cover_image = input.images[0]
  if (!id && input.status === undefined) payload.status = 'draft'
  if (input.is_sale === undefined && input.original_price !== undefined) {
    payload.is_sale = input.original_price != null && input.original_price > input.price
  }
  const result = id
    ? await api.from('products').update(payload).eq('id', id).select('slug').single()
    : await api.from('products').insert(payload).select('slug').single()
  fail(result.error)
  const product = await getProduct(result.data!.slug)
  if (!product) throw new Error('Không tìm thấy sản phẩm vừa lưu.')
  return product
}

export async function saveProductEditor(input: ProductInput, id: string, expectedUpdatedAt: string, variants: ProductVariantInput[] | null, images: ProductImage[]): Promise<Product> {
  if (!validateOptions(input.colors ?? []) || !validateOptions(input.sizes ?? [])) throw new Error('Màu và size không được trùng hoặc để trống.')
  const { data, error } = await client().rpc('save_product_editor', {
    _id: id, _product: input, _expected_updated_at: expectedUpdatedAt,
    _variants: variants, _images: images.map(image => ({ id: image.id, color: image.color || null, is_primary: image.is_primary, is_color_primary: Boolean(image.is_color_primary) })),
  })
  fail(error)
  const product = await getProduct(data.slug)
  if (!product) throw new Error('Không tìm thấy sản phẩm vừa lưu.')
  return product
}

export async function deleteProduct(id: string): Promise<void> {
  const api = client()
  const { data: images, error: imageError } = await api.from('product_images').select('storage_path').eq('product_id', id)
  fail(imageError)
  const { error } = await api.from('products').delete().eq('id', id)
  fail(error)
  const paths = (images ?? []).map((item) => item.storage_path).filter((path): path is string => Boolean(path))
  if (paths.length) await api.storage.from('muse-assets').remove(paths)
}

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

async function uploadAsset(file: File, folder: 'products' | 'categories' | 'banners'): Promise<{ url: string; path: string }> {
  if (!allowedTypes.has(file.type)) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc AVIF.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Ảnh phải nhỏ hơn 10 MB.')
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const api = client()
  const { error } = await api.storage.from('muse-assets').upload(path, file, { contentType: file.type, upsert: false })
  fail(error)
  const { data } = api.storage.from('muse-assets').getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function uploadContentImage(file: File, folder: 'products' | 'categories' | 'banners'): Promise<string> {
  return (await uploadAsset(file, folder)).url
}

export const uploadProductImage = (file: File): Promise<string> => uploadContentImage(file, 'products')
export const uploadCategoryImage = (file: File): Promise<string> => uploadContentImage(file, 'categories')
export const uploadBannerImage = (file: File): Promise<string> => uploadContentImage(file, 'banners')

export async function uploadProductImages(files: File[], productId: string, deferCover = false): Promise<ProductImage[]> {
  const api = client()
  const { data: existing, error: existingError } = await api.from('product_images')
    .select('id,is_primary,sort_order').eq('product_id', productId)
  fail(existingError)
  const added: ProductImage[] = []
  let nextOrder = Math.max(-1, ...(existing ?? []).map((item) => Number(item.sort_order))) + 1
  let needsPrimary = !(existing ?? []).some((item) => item.is_primary)
  for (const file of files) {
    const asset = await uploadAsset(file, 'products')
    const isPrimary = needsPrimary && !deferCover
    const { data, error } = await api.from('product_images').insert({
      product_id: productId,
      url: asset.url,
      storage_path: asset.path,
      alt_text: file.name,
      sort_order: nextOrder++,
      is_primary: isPrimary,
    }).select('*').single()
    if (error) {
      await api.storage.from('muse-assets').remove([asset.path])
      fail(error)
    }
    added.push(data as ProductImage)
    if (isPrimary) {
      const { error: coverError } = await api.from('products').update({ cover_image: asset.url }).eq('id', productId)
      fail(coverError)
      needsPrimary = false
    }
  }
  return added
}

export async function setProductPrimaryImage(productId: string, imageId: string): Promise<void> {
  const api = client()
  const { data: image, error: imageError } = await api.from('product_images').select('url,product_id').eq('id', imageId).single()
  fail(imageError)
  if (image!.product_id !== productId) throw new Error('Ảnh không thuộc sản phẩm này.')
  const { error: resetError } = await api.from('product_images').update({ is_primary: false }).eq('product_id', productId)
  fail(resetError)
  const { error: primaryError } = await api.from('product_images').update({ is_primary: true }).eq('id', imageId)
  fail(primaryError)
  const { error: coverError } = await api.from('products').update({ cover_image: image!.url }).eq('id', productId)
  fail(coverError)
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const api = client()
  const { data: image, error: imageError } = await api.from('product_images').select('*').eq('id', imageId).single()
  fail(imageError)
  const { error } = await api.from('product_images').delete().eq('id', imageId)
  fail(error)
  if (image!.storage_path) await api.storage.from('muse-assets').remove([image!.storage_path])
  if (image!.is_primary) {
    const { data: next, error: nextError } = await api.from('product_images').select('id,url')
      .eq('product_id', image!.product_id).order('sort_order').limit(1).maybeSingle()
    fail(nextError)
    if (next) {
      const { error: primaryError } = await api.from('product_images').update({ is_primary: true }).eq('id', next.id)
      fail(primaryError)
    }
    const { error: coverError } = await api.from('products').update({ cover_image: next?.url ?? null }).eq('id', image!.product_id)
    fail(coverError)
  }
}

export async function saveCategory(input: CategoryInput, id?: string): Promise<Category> {
  const payload = {
    kind: input.kind,
    slug: slugify(input.slug),
    name: input.name.trim(),
    description: input.description ?? null,
    image_url: input.image_url ?? null,
    sort_order: input.sort_order ?? 0,
  }
  const api = client()
  const result = id
    ? await api.from('categories').update(payload).eq('id', id).select('*').single()
    : await api.from('categories').insert(payload).select('*').single()
  fail(result.error)
  return result.data as Category
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await client().from('categories').delete().eq('id', id)
  fail(error)
}

export async function adminListOrders(): Promise<Order[]> {
  const { data, error } = await client().from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false })
  fail(error)
  return (data ?? []).map(normalizeOrder)
}

export const listOrders = adminListOrders

export async function updateOrder(id: string, status: OrderStatus): Promise<void> {
  const { error } = await client().from('orders').update({ status }).eq('id', id)
  fail(error)
}

export const updateOrderStatus = updateOrder

export async function adminListProfiles(): Promise<Profile[]> {
  const { data, error } = await client().from('profiles').select('id,email,full_name,phone,address,role,created_at').order('created_at', { ascending: false })
  fail(error)
  return (data ?? []) as Profile[]
}

export const listCustomers = adminListProfiles

export async function adminListBanners(): Promise<Banner[]> {
  const { data, error } = await client().from('banners').select('*').order('sort_order')
  fail(error)
  return (data ?? []) as Banner[]
}

export async function saveBanner(input: BannerInput, id?: string): Promise<Banner> {
  const payload = {
    title: input.title.trim(),
    subtitle: input.subtitle ?? null,
    eyebrow: input.eyebrow ?? null,
    image_url: input.image_url,
    link_url: input.link_url ?? null,
    link_label: input.link_label ?? null,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
  }
  const api = client()
  const result = id
    ? await api.from('banners').update(payload).eq('id', id).select('*').single()
    : await api.from('banners').insert(payload).select('*').single()
  fail(result.error)
  return result.data as Banner
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await client().from('banners').delete().eq('id', id)
  fail(error)
}

export async function saveSiteSettings(input: SiteSettings): Promise<void> {
  const rows = Object.entries(input).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }))
  if (!rows.length) return
  const { error } = await client().from('site_settings').upsert(rows, { onConflict: 'key' })
  fail(error)
}

export async function adminDashboard(): Promise<DashboardStats> {
  const [products, orders, categories] = await Promise.all([
    adminListProducts(), adminListOrders(), listCategories(),
  ])
  return {
    totalProducts: products.length,
    fashionProducts: products.filter((item) => item.kind === 'fashion').length,
    beautyProducts: products.filter((item) => item.kind === 'beauty').length,
    totalOrders: orders.length,
    lowStockProducts: products.filter((item) => item.stock <= 10).sort((a, b) => a.stock - b.stock),
    latestProducts: products.slice(0, 6),
    latestOrders: orders.slice(0, 6),
    categoryCounts: categories.map((category) => ({
      category,
      count: products.filter((item) => item.category_id === category.id).length,
    })),
  }
}

export const getDashboardStats = adminDashboard

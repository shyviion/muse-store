export type ProductKind = 'fashion' | 'beauty'
export type ProductStatus = 'draft' | 'published' | 'hidden'
export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled'

export interface Category {
  id: string
  kind: ProductKind
  slug: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  created_at: string
}

export type CategoryInput = Partial<Omit<Category, 'id' | 'created_at'>> &
  Pick<Category, 'kind' | 'slug' | 'name'>

export interface ProductImage {
  id: string
  product_id: string
  url: string
  storage_path: string | null
  alt_text: string | null
  sort_order: number
  is_primary: boolean
  color?: string | null
  is_color_primary?: boolean
  created_at: string
}

export interface ProductVariantInput {
  size: string | null
  color: string | null
  stock: number | null
}

export interface ProductVariant {
  id: string
  product_id: string
  sku: string | null
  size: string | null
  color: string | null
  stock: number | null
  is_active?: boolean
}

export interface Product {
  id: string
  slug: string
  sku: string
  name: string
  kind: ProductKind
  category_id: string | null
  category?: Category | null
  brand: string
  price: number
  original_price: number | null
  stock: number
  short_description: string
  description: string
  cover_image: string | null
  images: string[]
  image_records: ProductImage[]
  variants: ProductVariant[]
  variant_mode?: 'legacy' | 'tracked'
  sizes: string[]
  colors: string[]
  material: string | null
  fit: string | null
  size_chart: string | null
  volume: string | null
  ingredients: string | null
  benefits: string | null
  skin_types: string[]
  usage: string | null
  status: ProductStatus
  is_new: boolean
  is_featured: boolean
  is_sale: boolean
  sold_count: number
  created_at: string
  updated_at: string
}

export type ProductInput = Partial<
  Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category' | 'image_records' | 'variants' | 'sold_count'>
> & Pick<Product, 'name' | 'sku' | 'kind' | 'price'>

export interface ProductFilters {
  kind?: ProductKind
  category?: string
  categoryId?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  brand?: string
  color?: string
  size?: string
  skinType?: string
  sale?: boolean
  newOnly?: boolean
  featured?: boolean
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'best-selling'
  limit?: number
}

export interface Banner {
  id: string
  title: string
  subtitle: string | null
  eyebrow: string | null
  image_url: string
  link_url: string | null
  link_label: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export type BannerInput = Partial<Omit<Banner, 'id' | 'created_at'>> &
  Pick<Banner, 'title' | 'image_url'>

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  address: string | null
  role: 'customer' | 'admin'
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  sku: string
  image_url: string | null
  size: string | null
  color: string | null
  quantity: number
  unit_price: number
  line_total: number
}

export interface Order {
  id: string
  code: string
  user_id: string | null
  customer_name: string
  phone: string
  address: string
  notes: string | null
  status: OrderStatus
  total: number
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface PlaceOrderInput {
  customer_name: string
  phone: string
  address: string
  notes?: string
  items: Array<{
    product_id: string
    quantity: number
    size?: string | null
    color?: string | null
  }>
}

export type SiteSettings = Record<string, string | number | boolean | null>

export interface DashboardStats {
  totalProducts: number
  fashionProducts: number
  beautyProducts: number
  totalOrders: number
  lowStockProducts: Product[]
  latestProducts: Product[]
  latestOrders: Order[]
  categoryCounts: Array<{ category: Category; count: number }>
}

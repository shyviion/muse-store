import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useStore } from '../contexts/StoreContext'
import type { Product, ProductKind } from '../types'
import { money } from '../utils/format'

type Special = 'new' | 'sale' | 'search'
type Filters = { category: string; brand: string; color: string; size: string; skinType: string; minPrice: string; maxPrice: string; sale: boolean }
const emptyFilters: Filters = { category: '', brand: '', color: '', size: '', skinType: '', minPrice: '', maxPrice: '', sale: false }

export default function Catalog({ kind, special }: { kind?: ProductKind; special?: Special }) {
  const { products, categories, loading, error, refresh } = useStore()
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters, category: params.get('category') || '' })
  const [query, setQuery] = useState(params.get('q') || '')
  const [sort, setSort] = useState('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const search = params.get('q') || ''
  const categoryParam = params.get('category') || ''
  useEffect(() => { setFilters(current => ({ ...current, category: categoryParam })) }, [categoryParam])
  useEffect(() => { setQuery(search) }, [search])
  const title = kind === 'fashion' ? 'Thời trang nữ' : kind === 'beauty' ? 'Mỹ phẩm & làm đẹp' : special === 'new' ? 'Sản phẩm mới' : special === 'sale' ? 'Ưu đãi đặc biệt' : 'Tìm kiếm sản phẩm'
  const description = kind === 'fashion' ? 'Những thiết kế mang nét riêng, để bạn tự tin trong từng khoảnh khắc.' : kind === 'beauty' ? 'Chăm sóc vẻ đẹp của bạn với những lựa chọn tinh tế mỗi ngày.' : special === 'new' ? 'Những điều mới mẻ luôn đáng để chờ đợi.' : special === 'sale' ? 'Những món đồ bạn yêu thích với mức giá dễ mến hơn.' : 'Tìm kiếm theo tên, mã sản phẩm và khám phá điều dành cho bạn.'

  const available = useMemo(() => products.filter(item => !kind || item.kind === kind), [products, kind])
  const brands = useMemo(() => [...new Set(available.map(item => item.brand).filter(Boolean))].sort(), [available])
  const colors = useMemo(() => [...new Set(available.flatMap(item => item.colors))].sort(), [available])
  const sizes = useMemo(() => [...new Set(available.flatMap(item => item.sizes))].sort(), [available])
  const skinTypes = useMemo(() => [...new Set(available.flatMap(item => item.skin_types))].sort(), [available])
  const filtered = useMemo(() => {
    let result = available.filter(item => {
      if (special === 'new' && !item.is_new) return false
      if (special === 'sale' && !item.is_sale) return false
      if (search && !`${item.name} ${item.sku}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) return false
      if (filters.category && item.category?.slug !== filters.category && item.category_id !== filters.category) return false
      if (filters.brand && item.brand !== filters.brand) return false
      if (filters.color && !item.colors.includes(filters.color)) return false
      if (filters.size && !item.sizes.includes(filters.size)) return false
      if (filters.skinType && !item.skin_types.includes(filters.skinType)) return false
      if (filters.minPrice && item.price < Number(filters.minPrice)) return false
      if (filters.maxPrice && item.price > Number(filters.maxPrice)) return false
      if (filters.sale && !item.is_sale) return false
      return true
    })
    if (sort === 'price-asc') result = [...result].sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') result = [...result].sort((a, b) => b.price - a.price)
    else if (sort === 'best-selling') result = [...result].sort((a, b) => b.sold_count - a.sold_count)
    else result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return result
  }, [available, filters, search, sort, special])

  const update = (key: keyof Filters, value: string | boolean) => setFilters(current => ({ ...current, [key]: value }))
  const clear = () => { setFilters(emptyFilters); setQuery(''); setParams({}) }
  const submit = (event: FormEvent) => { event.preventDefault(); setParams(query.trim() ? { q: query.trim() } : {}) }
  const categoryOptions = categories.filter(item => !kind || item.kind === kind)
  const activeCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0)

  const sidebar = <div className="filter-panel"><div className="filter-panel-head"><h2>Bộ lọc {activeCount > 0 && <span>{activeCount}</span>}</h2><button onClick={clear} type="button">Xóa bộ lọc</button></div>
    <div className="filter-group"><h3>Danh mục</h3><label className="filter-radio"><input type="radio" name="category" checked={!filters.category} onChange={() => update('category', '')} /> Tất cả</label>{categoryOptions.map(category => <label className="filter-radio" key={category.id}><input type="radio" name="category" checked={filters.category === category.slug} onChange={() => update('category', category.slug)} /> {category.name}</label>)}</div>
    <div className="filter-group"><h3>Khoảng giá</h3><div className="price-inputs"><label><span>Từ</span><input type="number" min="0" inputMode="numeric" placeholder="0" value={filters.minPrice} onChange={event => update('minPrice', event.target.value)} /></label><span>—</span><label><span>Đến</span><input type="number" min="0" inputMode="numeric" placeholder="5.000.000" value={filters.maxPrice} onChange={event => update('maxPrice', event.target.value)} /></label></div></div>
    {brands.length > 0 && <div className="filter-group"><h3>Thương hiệu</h3><select aria-label="Lọc thương hiệu" value={filters.brand} onChange={event => update('brand', event.target.value)}><option value="">Tất cả thương hiệu</option>{brands.map(brand => <option key={brand}>{brand}</option>)}</select></div>}
    {colors.length > 0 && <div className="filter-group"><h3>Màu sắc</h3><select aria-label="Lọc màu sắc" value={filters.color} onChange={event => update('color', event.target.value)}><option value="">Tất cả màu</option>{colors.map(color => <option key={color}>{color}</option>)}</select></div>}
    {sizes.length > 0 && <div className="filter-group"><h3>Kích thước</h3><div className="filter-chips"><button type="button" className={!filters.size ? 'active' : ''} onClick={() => update('size', '')}>Tất cả</button>{sizes.map(size => <button type="button" key={size} className={filters.size === size ? 'active' : ''} onClick={() => update('size', size)}>{size}</button>)}</div></div>}
    {skinTypes.length > 0 && <div className="filter-group"><h3>Loại da</h3><select aria-label="Lọc loại da" value={filters.skinType} onChange={event => update('skinType', event.target.value)}><option value="">Tất cả loại da</option>{skinTypes.map(type => <option key={type}>{type}</option>)}</select></div>}
    <div className="filter-group"><label className="filter-checkbox"><input type="checkbox" checked={filters.sale} onChange={event => update('sale', event.target.checked)} /> Chỉ xem sản phẩm giảm giá</label></div>
    <button type="button" className="button button-dark mobile-apply" onClick={() => setFiltersOpen(false)}>XEM {filtered.length} SẢN PHẨM <ArrowRight size={17} /></button>
  </div>

  return <>
    <section className={`catalog-hero ${kind === 'fashion' ? 'catalog-hero-fashion' : kind === 'beauty' ? 'catalog-hero-beauty' : ''}`}><div className="container-wide"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>{title}</span></div><span className="eyebrow">MUSE STORE / THE EDIT</span><h1>{title}<em>.</em></h1><p>{description}</p></div></section>
    <div className="container-wide catalog-layout"><aside className="catalog-sidebar">{sidebar}</aside><div className="catalog-main"><div className="catalog-toolbar"><span>{loading ? 'Đang tải...' : `${filtered.length} sản phẩm`}</span><div><button className="mobile-filter-trigger" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={18} /> Bộ lọc {activeCount > 0 && `(${activeCount})`}</button><label className="sort-control">Sắp xếp <select value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Mới nhất</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option><option value="best-selling">Bán chạy nhất</option></select><ChevronDown size={15} /></label></div></div>
      {special === 'search' && <form className="catalog-search" onSubmit={submit}><Search size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tên hoặc mã sản phẩm" aria-label="Tìm kiếm sản phẩm" /><button type="submit">TÌM KIẾM <ArrowRight size={16} /></button></form>}
      {activeCount > 0 && <div className="active-filters">{search && <button onClick={() => { setQuery(''); setParams({}) }}>“{search}” <X size={12} /></button>}{Object.entries(filters).filter(([, value]) => value).map(([key, value]) => <button key={key} onClick={() => update(key as keyof Filters, key === 'sale' ? false : '')}>{key === 'minPrice' ? `Từ ${money(Number(value))}` : key === 'maxPrice' ? `Đến ${money(Number(value))}` : key === 'sale' ? 'Đang giảm giá' : String(value)} <X size={12} /></button>)}</div>}
      {loading ? <div className="product-grid catalog-grid">{Array.from({ length: 8 }, (_, i) => <div className="product-skeleton" key={i}><div /><span /><small /></div>)}</div> : error ? <div className="catalog-error"><p>{error}</p><button className="button button-dark" onClick={() => void refresh()}>THỬ LẠI</button></div> : filtered.length ? <motion.div className="product-grid catalog-grid" layout>{filtered.map((product: Product, index) => <ProductCard key={product.id} product={product} index={index} />)}</motion.div> : <div className="empty-state"><span>NO RESULTS</span><h2>Chưa tìm thấy món đồ phù hợp.</h2><p>Hãy thử một từ khóa hoặc bộ lọc khác nhé.</p><button className="button button-dark" onClick={clear}>XÓA BỘ LỌC <ArrowRight size={17} /></button></div>}
    </div></div>
    <AnimatePresence>{filtersOpen && <div className="mobile-filter-overlay"><motion.div className="filter-backdrop" onClick={() => setFiltersOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.div className="filter-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .3 }}><div className="filter-drawer-header"><strong>Bộ lọc sản phẩm</strong><button aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)}><X /></button></div>{sidebar}</motion.div></div>}</AnimatePresence>
  </>
}

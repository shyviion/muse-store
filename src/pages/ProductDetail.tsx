import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Banknote, ChevronLeft, ChevronRight, Heart, Minus, Plus, Share2, ShieldCheck, Shirt, Truck } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useStore } from '../contexts/StoreContext'
import { getProduct } from '../services/backend'
import type { Product } from '../types'
import { money, percentOff } from '../utils/format'
import { colorImages, colorSwatch, optionAvailable, variantStock } from '../utils/variants'

const LOW_STOCK = 5

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { products, addToCart, favorites, toggleFavorite, notify } = useStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [openInfo, setOpenInfo] = useState('details')
  const [showSticky, setShowSticky] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    setLoading(true); setActiveImage(0); setSize(''); setColor(''); setQuantity(1)
    if (!slug) return
    void getProduct(slug).then(found => { if (alive) { setProduct(found); setError(null) } }).catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'Không thể tải sản phẩm') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug])

  // Gallery: return to the first slide whenever the image set changes.
  useEffect(() => { trackRef.current?.scrollTo({ left: 0 }) }, [color, product])

  // Mobile sticky CTA: visible only after the main buy buttons scroll above the viewport.
  useEffect(() => {
    const target = actionsRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0))
    observer.observe(target)
    return () => { observer.disconnect(); setShowSticky(false) }
  }, [loading, product])

  if (loading) return <div className="detail-loading container-wide"><div className="product-skeleton"><div /><span /><small /></div><div><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></div></div>
  if (error || !product) return <div className="not-found container-wide"><span className="eyebrow">MUSE STORE</span><h1>{error ? 'Có lỗi khi tải sản phẩm' : 'Không tìm thấy sản phẩm'}</h1><p>{error || 'Sản phẩm có thể đã được ẩn hoặc xóa.'}</p><Link className="button button-dark" to="/">VỀ TRANG CHỦ <ArrowRight size={17} /></Link></div>

  const images = colorImages(product, color)
  const available = variantStock(product, size, color)
  const selected = (product.kind !== 'fashion' || ((!product.colors.length || Boolean(color)) && (!product.sizes.length || Boolean(size))))
  function chooseColor(next: string) {
    if (!product) return
    setColor(next); setActiveImage(0); setQuantity(1)
    if (size && variantStock(product, size, next) < 1) { setSize(''); notify('Size đã chọn không còn hàng ở màu này. Vui lòng chọn lại size.') }
  }
  const discount = percentOff(product.price, product.original_price)
  const related = products.filter(item => item.id !== product.id && (item.category_id === product.category_id || item.kind === product.kind)).slice(0, 4)
  const liked = favorites.includes(product.id)
  const handleAdd = (): boolean => {
    if (product.kind === 'fashion' && product.sizes.length && !size) { notify('Vui lòng chọn kích thước'); return false }
    if (product.kind === 'fashion' && product.colors.length && !color) { notify('Vui lòng chọn màu sắc'); return false }
    if (available < quantity) { notify('Lựa chọn này không còn đủ hàng.'); return false }
    return addToCart(product, quantity, size || undefined, color || undefined)
  }
  const handleBuyNow = () => { if (handleAdd()) navigate('/thanh-toan') }
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); notify('Đã sao chép liên kết sản phẩm') } catch { notify('Không thể sao chép liên kết') } }

  // Display-only derived state (no effect on cart/validation logic).
  const soldOut = selected && available < 1
  const stockState = selected ? (available < 1 ? 'out' : available <= LOW_STOCK ? 'low' : 'in') : (optionAvailable(product) ? 'in' : 'out')
  const stockText = stockState === 'out' ? 'Tạm hết hàng' : stockState === 'low' ? `Chỉ còn ${available} sản phẩm` : 'Còn hàng'
  const missing = product.kind === 'fashion' ? [product.colors.length && !color ? 'màu' : '', product.sizes.length && !size ? 'size' : ''].filter(Boolean) : []
  const stickyLabel = missing.length ? `CHỌN ${missing.join(' & ').toUpperCase()}` : soldOut ? 'TẠM HẾT HÀNG' : 'THÊM VÀO GIỎ'
  const handleSticky = () => {
    if (missing.length) optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    handleAdd()
  }
  const goToImage = (index: number) => {
    const next = (index + images.length) % images.length
    setActiveImage(next)
    const track = trackRef.current
    if (track) track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' })
  }
  const onTrackScroll = () => {
    const track = trackRef.current
    if (!track || !track.clientWidth) return
    const index = Math.round(track.scrollLeft / track.clientWidth)
    if (index !== activeImage) setActiveImage(index)
  }
  const trustItems = [
    { icon: <Truck size={18} />, text: 'Giao hàng toàn quốc' },
    { icon: <Banknote size={18} />, text: 'Thanh toán khi nhận hàng' },
    product.kind === 'fashion' && product.material
      ? { icon: <Shirt size={18} />, text: `Chất liệu: ${product.material}` }
      : { icon: <ShieldCheck size={18} />, text: 'Sản phẩm được MUSE chọn lọc' },
  ]

  return <><div className="container-wide detail-breadcrumbs breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to={product.kind === 'fashion' ? '/thoi-trang' : '/my-pham'}>{product.kind === 'fashion' ? 'Thời trang' : 'Mỹ phẩm'}</Link><span>/</span><span>{product.name}</span></div>
    <section className="product-detail container-wide">
      <div className={`detail-gallery ${images.length > 1 ? 'has-thumbs' : ''}`}>
        <div className="detail-main-image">
          <div className="detail-track" ref={trackRef} onScroll={onTrackScroll}>{images.map((url, index) => <div className="detail-slide" key={`${url}-${index}`}><motion.img initial={{ opacity: .6 }} animate={{ opacity: 1 }} transition={{ duration: .3 }} src={url} alt={`${product.name} - ảnh ${index + 1}`} width={800} height={1000} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false} /></div>)}</div>
          {product.is_new && <span className="badge badge-new">NEW ARRIVAL</span>}
          {images.length > 1 && <><button type="button" className="gallery-nav prev" aria-label="Ảnh trước" onClick={() => goToImage(activeImage - 1)}><ChevronLeft size={20} /></button><button type="button" className="gallery-nav next" aria-label="Ảnh sau" onClick={() => goToImage(activeImage + 1)}><ChevronRight size={20} /></button><span className="gallery-counter" aria-live="polite">{activeImage + 1} / {images.length}</span><div className="gallery-dots" aria-hidden="true">{images.map((url, index) => <span key={`${url}-${index}`} className={activeImage === index ? 'active' : ''} />)}</div></>}
        </div>
        {images.length > 1 && <div className="detail-thumbs">{images.map((url, index) => <button key={`${url}-${index}`} type="button" className={activeImage === index ? 'active' : ''} onClick={() => goToImage(index)} aria-label={`Xem ảnh ${index + 1}`}><img src={url} alt={`${product.name} - ảnh nhỏ ${index + 1}`} loading="lazy" decoding="async" /></button>)}</div>}
      </div>
      <div className="detail-content"><span className="eyebrow">{product.brand || 'MUSE STORE'} / {product.sku}</span><h1>{product.name}</h1>
        <div className="detail-prices"><strong className={discount > 0 ? 'is-sale' : undefined}>{money(product.price)}</strong>{discount > 0 && <><del>{money(product.original_price!)}</del><span>-{discount}%</span></>}</div>
        {discount > 0 && <p className="detail-saving">Tiết kiệm {money(product.original_price! - product.price)}</p>}
        <p className={`detail-stock is-${stockState}`}><span aria-hidden="true" />{stockText}</p>
        <p className="detail-short">{product.short_description || product.description}</p><div className="detail-divider" />
        {product.kind === 'fashion' && <div className="detail-options" ref={optionsRef}>{product.colors.length > 0 && <div className="option-group"><div className="option-label">MÀU SẮC <strong>{color || 'Chọn màu'}</strong></div><div className="color-options">{product.colors.map(item => { const inStock = optionAvailable(product, undefined, item); return <button type="button" className={`${color === item ? 'active' : ''} ${inStock ? '' : 'is-soldout'}`} key={item} aria-pressed={color === item} title={inStock ? item : 'Màu này đang hết hàng'} onClick={() => chooseColor(item)}><span className="color-dot" style={{ '--swatch': colorSwatch(item) } as CSSProperties} aria-hidden="true" />{item}</button> })}</div></div>}{product.sizes.length > 0 && <div className="option-group"><div className="option-label">KÍCH THƯỚC <strong>{size || 'Chọn size'}</strong></div><div className="size-options">{product.sizes.map(item => <button type="button" key={item} className={size === item ? 'active' : ''} aria-pressed={size === item} disabled={!optionAvailable(product, item, color || undefined)} title={optionAvailable(product, item, color || undefined) ? item : 'Hết hàng ở màu đang chọn'} onClick={() => { setSize(item); setQuantity(1) }}>{item}</button>)}</div>{product.size_chart && <p className="size-guide">{product.size_chart}</p>}</div>}</div>}
        {product.kind === 'beauty' && product.volume && <div className="option-group"><div className="option-label">DUNG TÍCH / KHỐI LƯỢNG</div><span className="volume-label">{product.volume}</span></div>}
        <div className="option-group"><div className="option-label">SỐ LƯỢNG <strong>{!selected ? 'Chọn màu và size để xem tồn kho' : available > 0 ? `Còn ${available} sản phẩm` : 'Tạm hết hàng'}</strong></div><div className="quantity-control"><button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus size={16} /></button><span>{quantity}</span><button type="button" aria-label="Tăng số lượng" disabled={!selected || quantity >= Math.min(20, available)} onClick={() => setQuantity(value => Math.min(20, available, value + 1))}><Plus size={16} /></button></div></div>
        <div className="detail-actions" ref={actionsRef}><button type="button" className="button button-dark add-cart-button" disabled={soldOut} onClick={handleAdd}>{!selected || available > 0 ? 'THÊM VÀO GIỎ HÀNG' : 'TẠM HẾT HÀNG'} <ArrowRight size={18} /></button><button type="button" className={`detail-heart ${liked ? 'is-liked' : ''}`} aria-label={liked ? 'Bỏ yêu thích' : 'Thêm yêu thích'} onClick={() => toggleFavorite(product.id)}><Heart size={21} fill={liked ? 'currentColor' : 'none'} /></button></div>
        {!soldOut && <button type="button" className="button button-outline buy-now-button" onClick={handleBuyNow}>MUA NGAY</button>}
        <ul className="detail-service">{trustItems.map(item => <li key={item.text}>{item.icon}<span>{item.text}</span></li>)}</ul><button type="button" className="share-button" onClick={() => void share()}><Share2 size={16} /> Chia sẻ sản phẩm</button>
      </div></section>
    <section className="detail-info container-wide"><div className="info-tabs"><button className={openInfo === 'details' ? 'active' : ''} onClick={() => setOpenInfo('details')}>MÔ TẢ SẢN PHẨM</button><button className={openInfo === 'specs' ? 'active' : ''} onClick={() => setOpenInfo('specs')}>THÔNG TIN CHI TIẾT</button></div>{openInfo === 'details' ? <div className="info-copy"><p>{product.description || product.short_description}</p></div> : <div className="specs-list"><div><span>Mã sản phẩm</span><strong>{product.sku}</strong></div><div><span>Thương hiệu</span><strong>{product.brand}</strong></div><div><span>Danh mục</span><strong>{product.category?.name || 'MUSE STORE'}</strong></div>{product.kind === 'fashion' ? <><div><span>Chất liệu</span><strong>{product.material || 'Đang cập nhật'}</strong></div><div><span>Kiểu dáng</span><strong>{product.fit || 'Đang cập nhật'}</strong></div></> : <><div><span>Dung tích</span><strong>{product.volume || 'Đang cập nhật'}</strong></div><div><span>Thành phần</span><strong>{product.ingredients || 'Đang cập nhật'}</strong></div><div><span>Công dụng</span><strong>{product.benefits || 'Đang cập nhật'}</strong></div><div><span>Loại da phù hợp</span><strong>{product.skin_types.join(', ') || 'Mọi loại da'}</strong></div><div><span>Hướng dẫn sử dụng</span><strong>{product.usage || 'Đang cập nhật'}</strong></div></>}</div>}</section>
    {related.length > 0 && <section className="section products-section container-wide"><div className="section-head"><div><span className="eyebrow">YOU MAY ALSO LIKE</span><h2>Có thể bạn sẽ <em>thích.</em></h2></div><Link className="section-link" to={product.kind === 'fashion' ? '/thoi-trang' : '/my-pham'}>XEM TẤT CẢ <ArrowRight size={17} /></Link></div><div className="product-grid">{related.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div></section>}
    <div className="detail-back container-wide"><Link to={product.kind === 'fashion' ? '/thoi-trang' : '/my-pham'}><ArrowLeft size={17} /> Tiếp tục mua sắm</Link></div>
    <div className={`sticky-cta ${showSticky ? 'is-visible' : ''}`} inert={!showSticky}><div className="sticky-cta-price"><strong className={discount > 0 ? 'is-sale' : undefined}>{money(product.price)}</strong>{discount > 0 && <del>{money(product.original_price!)}</del>}</div><button type="button" className="button button-dark" disabled={soldOut} onClick={handleSticky}>{stickyLabel}</button></div>
  </>
}

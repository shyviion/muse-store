import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Heart, Minus, Plus, Share2, ShieldCheck, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useStore } from '../contexts/StoreContext'
import { getProduct } from '../services/backend'
import type { Product } from '../types'
import { money, percentOff } from '../utils/format'
import { colorImages, optionAvailable, variantStock } from '../utils/variants'

export default function ProductDetail() {
  const { slug } = useParams()
  const { products, addToCart, favorites, toggleFavorite, notify } = useStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [openInfo, setOpenInfo] = useState('details')

  useEffect(() => {
    let alive = true
    setLoading(true); setActiveImage(0); setSize(''); setColor(''); setQuantity(1)
    if (!slug) return
    void getProduct(slug).then(found => { if (alive) { setProduct(found); setError(null) } }).catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'Không thể tải sản phẩm') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug])

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
  const handleAdd = () => {
    if (product.kind === 'fashion' && product.sizes.length && !size) { notify('Vui lòng chọn kích thước'); return }
    if (product.kind === 'fashion' && product.colors.length && !color) { notify('Vui lòng chọn màu sắc'); return }
    if (available < quantity) { notify('Lựa chọn này không còn đủ hàng.'); return }
    addToCart(product, quantity, size || undefined, color || undefined)
  }
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); notify('Đã sao chép liên kết sản phẩm') } catch { notify('Không thể sao chép liên kết') } }

  return <><div className="container-wide detail-breadcrumbs breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to={product.kind === 'fashion' ? '/thoi-trang' : '/my-pham'}>{product.kind === 'fashion' ? 'Thời trang' : 'Mỹ phẩm'}</Link><span>/</span><span>{product.name}</span></div>
    <section className="product-detail container-wide"><div className="detail-gallery"><div className="detail-main-image">{images[activeImage] && <motion.img key={images[activeImage]} initial={{ opacity: .6, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .3 }} src={images[activeImage]} alt={`${product.name} - ảnh ${activeImage + 1}`} />}{product.is_new && <span className="badge badge-new">NEW ARRIVAL</span>}</div>{images.length > 1 && <div className="detail-thumbs">{images.map((url, index) => <button key={`${url}-${index}`} type="button" className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`Xem ảnh ${index + 1}`}><img src={url} alt={`${product.name} - ảnh nhỏ ${index + 1}`} /></button>)}</div>}</div>
      <div className="detail-content"><span className="eyebrow">{product.brand || 'MUSE STORE'} / {product.sku}</span><h1>{product.name}</h1><div className="detail-prices"><strong>{money(product.price)}</strong>{discount > 0 && <><del>{money(product.original_price!)}</del><span>-{discount}%</span></>}</div><p className="detail-short">{product.short_description || product.description}</p><div className="detail-divider" />
        {product.kind === 'fashion' && <>{product.colors.length > 0 && <div className="option-group"><div className="option-label">MÀU SẮC <strong>{color || 'Chọn màu'}</strong></div><div className="color-options">{product.colors.map(item => <button type="button" className={color === item ? 'active' : ''} key={item} aria-pressed={color === item} title={optionAvailable(product, undefined, item) ? item : 'Màu này đang hết hàng'} onClick={() => chooseColor(item)}>{item}</button>)}</div></div>}{product.sizes.length > 0 && <div className="option-group"><div className="option-label">KÍCH THƯỚC <strong>{size || 'Chọn size'}</strong></div><div className="size-options">{product.sizes.map(item => <button type="button" key={item} className={size === item ? 'active' : ''} aria-pressed={size === item} disabled={!optionAvailable(product, item, color || undefined)} title={optionAvailable(product, item, color || undefined) ? item : 'Hết hàng ở màu đang chọn'} onClick={() => { setSize(item); setQuantity(1) }}>{item}</button>)}</div>{product.size_chart && <p className="size-guide">{product.size_chart}</p>}</div>}</>}
        {product.kind === 'beauty' && product.volume && <div className="option-group"><div className="option-label">DUNG TÍCH / KHỐI LƯỢNG</div><span className="volume-label">{product.volume}</span></div>}
        <div className="option-group"><div className="option-label">SỐ LƯỢNG <strong>{!selected ? 'Chọn màu và size để xem tồn kho' : available > 0 ? `Còn ${available} sản phẩm` : 'Tạm hết hàng'}</strong></div><div className="quantity-control"><button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus size={16} /></button><span>{quantity}</span><button type="button" aria-label="Tăng số lượng" disabled={!selected || quantity >= Math.min(20, available)} onClick={() => setQuantity(value => Math.min(20, available, value + 1))}><Plus size={16} /></button></div></div>
        <div className="detail-actions"><button type="button" className="button button-dark add-cart-button" disabled={selected && available < 1} onClick={handleAdd}>{!selected || available > 0 ? 'THÊM VÀO GIỎ HÀNG' : 'TẠM HẾT HÀNG'} <ArrowRight size={18} /></button><button type="button" className={`detail-heart ${liked ? 'is-liked' : ''}`} aria-label={liked ? 'Bỏ yêu thích' : 'Thêm yêu thích'} onClick={() => toggleFavorite(product.id)}><Heart size={21} fill={liked ? 'currentColor' : 'none'} /></button></div>
        <div className="detail-service"><span><Truck size={18} /> Giao hàng trên toàn quốc</span><span><ShieldCheck size={18} /> Sản phẩm được MUSE chọn lọc</span></div><button type="button" className="share-button" onClick={() => void share()}><Share2 size={16} /> Chia sẻ sản phẩm</button>
      </div></section>
    <section className="detail-info container-wide"><div className="info-tabs"><button className={openInfo === 'details' ? 'active' : ''} onClick={() => setOpenInfo('details')}>MÔ TẢ SẢN PHẨM</button><button className={openInfo === 'specs' ? 'active' : ''} onClick={() => setOpenInfo('specs')}>THÔNG TIN CHI TIẾT</button></div>{openInfo === 'details' ? <div className="info-copy"><p>{product.description || product.short_description}</p></div> : <div className="specs-list"><div><span>Mã sản phẩm</span><strong>{product.sku}</strong></div><div><span>Thương hiệu</span><strong>{product.brand}</strong></div><div><span>Danh mục</span><strong>{product.category?.name || 'MUSE STORE'}</strong></div>{product.kind === 'fashion' ? <><div><span>Chất liệu</span><strong>{product.material || 'Đang cập nhật'}</strong></div><div><span>Kiểu dáng</span><strong>{product.fit || 'Đang cập nhật'}</strong></div></> : <><div><span>Dung tích</span><strong>{product.volume || 'Đang cập nhật'}</strong></div><div><span>Thành phần</span><strong>{product.ingredients || 'Đang cập nhật'}</strong></div><div><span>Công dụng</span><strong>{product.benefits || 'Đang cập nhật'}</strong></div><div><span>Loại da phù hợp</span><strong>{product.skin_types.join(', ') || 'Mọi loại da'}</strong></div><div><span>Hướng dẫn sử dụng</span><strong>{product.usage || 'Đang cập nhật'}</strong></div></>}</div>}</section>
    {related.length > 0 && <section className="section products-section container-wide"><div className="section-head"><div><span className="eyebrow">YOU MAY ALSO LIKE</span><h2>Có thể bạn sẽ <em>thích.</em></h2></div><Link className="section-link" to={product.kind === 'fashion' ? '/thoi-trang' : '/my-pham'}>XEM TẤT CẢ <ArrowRight size={17} /></Link></div><div className="product-grid">{related.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div></section>}
    <div className="detail-back container-wide"><Link to={product.kind === 'fashion' ? '/thoi-trang' : '/my-pham'}><ArrowLeft size={17} /> Tiếp tục mua sắm</Link></div>
  </>
}

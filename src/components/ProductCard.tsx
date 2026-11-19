import { motion } from 'motion/react'
import { useState, type CSSProperties } from 'react'
import { ArrowUpRight, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext'
import type { Product } from '../types'
import { money, percentOff } from '../utils/format'
import { colorImages, colorSwatch } from '../utils/variants'

const BEST_SELLER_MIN_SOLD = 50
const MAX_SWATCHES = 5

export default function ProductCard({ product, index = 0 }: { product: Product, index?: number }) {
  const { favorites, toggleFavorite } = useStore()
  const [color, setColor] = useState<string | null>(null)
  const liked = favorites.includes(product.id)
  const discount = percentOff(product.price, product.original_price)
  const bestSeller = product.sold_count >= BEST_SELLER_MIN_SOLD
  const shownColors = product.colors.slice(0, MAX_SWATCHES)
  const extraColors = product.colors.length - shownColors.length
  const image = (color && colorImages(product, color)[0]) || product.cover_image || product.images[0]
  return <motion.article className="product-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: .55, delay: Math.min(index % 4, 3) * .07 }}>
    <div className="product-image-wrap"><Link to={`/san-pham/${product.slug}`} aria-label={`Xem ${product.name}`}><img src={image} alt={product.name} width={800} height={1000} loading="lazy" decoding="async" /></Link><div className="product-badges">{discount > 0 && <span className="badge badge-sale">Giảm giá</span>}{product.is_new && <span className="badge badge-new">Mới</span>}{bestSeller && <span className="badge badge-hot">Bán chạy</span>}</div><button type="button" className={`favorite-button ${liked ? 'is-liked' : ''}`} onClick={() => toggleFavorite(product.id)} aria-label={liked ? 'Bỏ yêu thích' : 'Thêm yêu thích'}><motion.span key={String(liked)} initial={{ scale: .75 }} animate={{ scale: 1 }}><Heart size={20} fill={liked ? 'currentColor' : 'none'} /></motion.span></button><Link className="quick-view" to={`/san-pham/${product.slug}`}>XEM CHI TIẾT <ArrowUpRight size={16} /></Link></div>
    <div className="product-info"><span className="product-meta">{product.brand || 'MUSE STORE'}</span><Link to={`/san-pham/${product.slug}`} className="product-name">{product.name}</Link><div className="price-row"><strong className={discount > 0 ? 'is-sale' : undefined}>{money(product.price)}</strong>{discount > 0 && <del>{money(product.original_price!)}</del>}{discount > 0 && <span className="save-chip" title={`Tiết kiệm ${money(product.original_price! - product.price)}`}>-{discount}%</span>}</div>{shownColors.length > 0 && <div className="product-swatches" role="group" aria-label="Màu sắc">{shownColors.map(item => <button key={item} type="button" className="swatch" style={{ '--swatch': colorSwatch(item) } as CSSProperties} aria-label={`Màu ${item}`} aria-pressed={color === item} title={item} onMouseEnter={() => setColor(item)} onFocus={() => setColor(item)} onClick={() => setColor(item)} />)}{extraColors > 0 && <span className="swatch-more">+{extraColors}</span>}</div>}{product.stock === 0 && <span className="stock-note">Tạm hết hàng</span>}</div>
  </motion.article>
}

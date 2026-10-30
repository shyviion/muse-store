import { motion } from 'motion/react'
import { ArrowUpRight, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext'
import type { Product } from '../types'
import { money, percentOff } from '../utils/format'

export default function ProductCard({ product, index = 0 }: { product: Product, index?: number }) {
  const { favorites, toggleFavorite } = useStore()
  const liked = favorites.includes(product.id)
  const discount = percentOff(product.price, product.original_price)
  return <motion.article className="product-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: .55, delay: Math.min(index % 4, 3) * .07 }}>
    <div className="product-image-wrap"><Link to={`/san-pham/${product.slug}`} aria-label={`Xem ${product.name}`}><img src={product.cover_image || product.images[0]} alt={product.name} loading="lazy" /></Link><div className="product-badges">{product.is_new && <span className="badge badge-new">NEW</span>}{discount > 0 && <span className="badge badge-sale">-{discount}%</span>}</div><button type="button" className={`favorite-button ${liked ? 'is-liked' : ''}`} onClick={() => toggleFavorite(product.id)} aria-label={liked ? 'Bỏ yêu thích' : 'Thêm yêu thích'}><motion.span key={String(liked)} initial={{ scale: .75 }} animate={{ scale: 1 }}><Heart size={20} fill={liked ? 'currentColor' : 'none'} /></motion.span></button><Link className="quick-view" to={`/san-pham/${product.slug}`}>XEM CHI TIẾT <ArrowUpRight size={16} /></Link></div>
    <div className="product-info"><span className="product-meta">{product.brand || 'MUSE STORE'} <span>·</span> {product.sku}</span><Link to={`/san-pham/${product.slug}`} className="product-name">{product.name}</Link><div className="price-row"><strong>{money(product.price)}</strong>{discount > 0 && <del>{money(product.original_price!)}</del>}</div>{product.stock === 0 && <span className="stock-note">Tạm hết hàng</span>}</div>
  </motion.article>
}

import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useStore } from '../contexts/StoreContext'

export default function Favorites() {
  const { products, favorites } = useStore()
  const items = products.filter(item => favorites.includes(item.id))
  return <div className="container-wide commerce-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Yêu thích</span></div><div className="commerce-heading"><span className="eyebrow">THE ONES YOU LOVE</span><h1>Danh sách <em>yêu thích.</em></h1><p>{items.length} sản phẩm đã lưu</p></div>{items.length ? <div className="product-grid favorites-grid">{items.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="empty-state commerce-empty"><span>YOUR WISHLIST IS EMPTY</span><h2>Chưa có sản phẩm yêu thích.</h2><p>Lưu lại những món đồ khiến bạn rung động nhé.</p><Link className="button button-dark" to="/san-pham-moi">KHÁM PHÁ SẢN PHẨM <ArrowRight size={17} /></Link></div>}</div>
}

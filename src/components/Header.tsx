import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronDown, Heart, Menu, PackageSearch, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext'
import { useSiteSettings } from '../hooks/useSiteSettings'

const nav = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Thời trang', to: '/thoi-trang' },
  { label: 'Mỹ phẩm', to: '/my-pham' },
  { label: 'Sản phẩm mới', to: '/san-pham-moi' },
  { label: 'Khuyến mãi', to: '/khuyen-mai' },
  { label: 'Về MUSE', to: '/gioi-thieu' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const settings = useSiteSettings()
  const { cart, favorites, categories } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)

  useEffect(() => { setMenuOpen(false); setSearchOpen(false) }, [location.pathname, location.search])
  useEffect(() => { document.body.style.overflow = menuOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [menuOpen])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSearchOpen(false); setMenuOpen(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate(`/tim-kiem?q=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
    setMenuOpen(false)
  }

  return <>
    <div className="announcement"><span>THE MUSE EDITION</span><span className="announcement-center">{settings.announcement_text || 'Vẻ đẹp của riêng bạn, theo cách của riêng bạn'}</span><Link to="/san-pham-moi">Khám phá bộ sưu tập <ArrowRight size={13} /></Link></div>
    <header className="site-header">
      <div className="header-inner container-wide">
        <button type="button" className="icon-button mobile-menu-button" aria-label="Mở menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={23} /></button>
        <Link className="brand-logo" to="/" aria-label="MUSE STORE - Trang chủ"><span>MUSE<span className="brand-dot">.</span></span><small>STORE</small></Link>
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {nav.map(item => <div className="nav-item" key={item.to}>
            <NavLink to={item.to} end={item.to === '/'}>{item.label}{(item.to === '/thoi-trang' || item.to === '/my-pham') && <ChevronDown size={13} />}</NavLink>
            {(item.to === '/thoi-trang' || item.to === '/my-pham') && <div className="nav-dropdown">
              <span className="dropdown-eyebrow">DANH MỤC</span>
              {categories.filter(category => category.kind === (item.to === '/thoi-trang' ? 'fashion' : 'beauty')).map(category => <Link key={category.id} to={`${item.to}?category=${category.slug}`}>{category.name}<ArrowRight size={13} /></Link>)}
            </div>}
          </div>)}
        </nav>
        <div className="header-actions">
          <button type="button" className="icon-button" aria-label="Tìm kiếm" aria-expanded={searchOpen} onClick={() => setSearchOpen(open => !open)}><Search size={21} strokeWidth={1.7} /></button>
          <Link className="icon-button desktop-icon" aria-label="Tra cứu đơn hàng" title="Tra cứu đơn hàng" to="/theo-doi-don-hang"><PackageSearch size={21} strokeWidth={1.7} /></Link>
          <Link className="icon-button desktop-icon" aria-label="Sản phẩm yêu thích" to="/yeu-thich"><Heart size={21} strokeWidth={1.7} />{favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}</Link>
          <Link className="icon-button desktop-icon" aria-label="Đăng nhập quản trị" to="/admin/login"><UserRound size={21} strokeWidth={1.7} /></Link>
          <Link className="icon-button cart-trigger" aria-label="Giỏ hàng" to="/gio-hang"><ShoppingBag size={21} strokeWidth={1.7} />{cartCount > 0 && <motion.span key={cartCount} initial={{ scale: 1.45 }} animate={{ scale: 1 }} className="count-badge is-cart">{cartCount > 99 ? '99+' : cartCount}</motion.span>}</Link>
        </div>
      </div>
      <AnimatePresence>{searchOpen && <motion.form className="search-popover" onSubmit={submitSearch} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Search size={20} /><input type="search" enterKeyHint="search" autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc mã sản phẩm..." aria-label="Tìm kiếm sản phẩm" />{query && <button type="button" aria-label="Xóa từ khóa" className="search-clear" onClick={() => setQuery('')}><X size={16} /></button>}<button type="submit">TÌM KIẾM <ArrowRight size={17} /></button><button type="button" aria-label="Đóng tìm kiếm" className="search-close" onClick={() => setSearchOpen(false)}><X size={19} /></button></motion.form>}</AnimatePresence>
    </header>
    <AnimatePresence>{menuOpen && <div className="mobile-overlay"><motion.button type="button" className="mobile-backdrop" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu điều hướng" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: .26 }}><div className="mobile-drawer-head"><span className="brand-logo"><span>MUSE<span className="brand-dot">.</span></span><small>STORE</small></span><button type="button" className="icon-button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X /></button></div><form className="mobile-drawer-search" onSubmit={submitSearch}><Search size={18} /><input type="search" enterKeyHint="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc mã sản phẩm..." aria-label="Tìm kiếm sản phẩm" />{query && <button type="button" aria-label="Xóa từ khóa" className="search-clear" onClick={() => setQuery('')}><X size={15} /></button>}</form><p className="eyebrow">DANH MỤC MUA SẮM</p>{nav.map(item => <NavLink key={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)} to={item.to}>{item.label}<ArrowRight size={18} /></NavLink>)}<div className="mobile-drawer-links"><Link onClick={() => setMenuOpen(false)} to="/yeu-thich"><Heart size={16} /> Yêu thích {favorites.length > 0 && `(${favorites.length})`}</Link><Link onClick={() => setMenuOpen(false)} to="/gio-hang"><ShoppingBag size={16} /> Giỏ hàng {cartCount > 0 && `(${cartCount})`}</Link><Link onClick={() => setMenuOpen(false)} to="/theo-doi-don-hang"><PackageSearch size={16} /> Tra cứu đơn</Link><Link onClick={() => setMenuOpen(false)} to="/admin/login"><UserRound size={16} /> Quản trị</Link></div></motion.div></div>}</AnimatePresence>
  </>
}

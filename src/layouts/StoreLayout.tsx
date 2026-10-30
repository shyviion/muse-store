import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Home from '../pages/Home'
import Catalog from '../pages/Catalog'
import ProductDetail from '../pages/ProductDetail'
import Cart from '../pages/Cart'
import Checkout from '../pages/Checkout'
import Favorites from '../pages/Favorites'
import About from '../pages/About'
import NotFound from '../pages/NotFound'

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [location.pathname])
  return null
}

function Toast() {
  const { toast } = useStore()
  return <AnimatePresence>{toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .96 }}>{toast}</motion.div>}</AnimatePresence>
}

export default function StoreLayout() {
  const location = useLocation()
  return <>
    <ScrollToTop />
    <Header />
    <AnimatePresence mode="wait">
      <motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .22 }}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/thoi-trang" element={<Catalog kind="fashion" />} />
          <Route path="/my-pham" element={<Catalog kind="beauty" />} />
          <Route path="/san-pham-moi" element={<Catalog special="new" />} />
          <Route path="/khuyen-mai" element={<Catalog special="sale" />} />
          <Route path="/tim-kiem" element={<Catalog special="search" />} />
          <Route path="/san-pham/:slug" element={<ProductDetail />} />
          <Route path="/gio-hang" element={<Cart />} />
          <Route path="/thanh-toan" element={<Checkout />} />
          <Route path="/yeu-thich" element={<Favorites />} />
          <Route path="/gioi-thieu" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
    <Footer />
    <Toast />
  </>
}

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, PackageCheck, Sparkles, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useStore } from '../contexts/StoreContext'
import { useSiteSettings } from '../hooks/useSiteSettings'

export default function Home() {
  const { products, loading, error, refresh, banners } = useStore()
  const settings = useSiteSettings()
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 700], [0, reduceMotion ? 0 : 95])

  const arrivals = [...products].filter(item => item.is_new).slice(0, 8)
  const featured = [...products].filter(item => item.is_featured).sort((a, b) => b.sold_count - a.sold_count).slice(0, 4)
  const newProducts = arrivals.length ? arrivals : products.slice(0, 8)
  const bestProducts = featured.length ? featured : [...products].sort((a, b) => b.sold_count - a.sold_count).slice(0, 4)
  const heroTitle = settings.hero_title || 'Vẻ đẹp là chính bạn.'
  const heroSubtitle = settings.hero_subtitle || 'Khám phá thời trang và làm đẹp được chọn lọc dành riêng cho phiên bản rạng rỡ nhất của bạn.'
  const promo = banners.find(item => item.is_active)

  return <>
    <section className="hero">
      <motion.div className="hero-image" style={{ y: heroY, backgroundImage: `linear-gradient(90deg, rgba(247,243,237,.22), rgba(247,243,237,0) 60%), url(${settings.hero_image_url || '/hero-editorial.png'})` }} initial={{ scale: 1.055, opacity: .8 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.35, ease: [.22, 1, .36, 1] }} />
      <div className="hero-content container-wide">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .7 }} className="hero-copy">
          <span className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> THE MUSE EDITION · 2026</span>
          <h1>{heroTitle === 'Vẻ đẹp là chính bạn.' ? <>Vẻ đẹp<br />là <em>chính bạn.</em></> : heroTitle}</h1>
          <p>{heroSubtitle}</p>
          <div className="hero-buttons"><Link className="button button-dark" to="/san-pham-moi">MUA SẮM NGAY <ArrowUpRight size={18} /></Link><Link className="text-link" to="/gioi-thieu">KHÁM PHÁ MUSE <ArrowRight size={17} /></Link></div>
        </motion.div>
        <div className="hero-side-note">STYLE IS A WAY TO SAY WHO YOU ARE <span>01 / 03</span></div>
      </div>
      <div className="hero-scroll">SCROLL TO EXPLORE <span /></div>
    </section>

    <section className="promise-strip"><div className="container-wide promise-inner"><span><Truck size={22} strokeWidth={1.4} /> Giao hàng trên toàn quốc</span><span><Sparkles size={22} strokeWidth={1.4} /> Bộ sưu tập được chọn lọc</span><span><PackageCheck size={22} strokeWidth={1.4} /> Đóng gói với sự chăm chút</span></div></section>

    <section className="section categories-section container-wide">
      <div className="section-intro"><div><span className="eyebrow">CURATED FOR YOU</span><h2>Khám phá thế giới <em>MUSE.</em></h2></div><p>Một chút cảm hứng cho tủ đồ. Một chút chăm sóc cho bản thân. Tất cả bắt đầu từ điều bạn yêu thích.</p></div>
      <div className="category-grid"><Link className="category-tile category-fashion" to="/thoi-trang"><img src="/fashion-editorial.png" alt="Bộ sưu tập thời trang nữ MUSE" loading="lazy" decoding="async" /><div className="category-shade" /><div className="category-info"><span>01 / THE COLLECTION</span><h3>Thời trang<br /><em>nữ</em></h3><span className="category-cta">KHÁM PHÁ BỘ SƯU TẬP <ArrowUpRight size={18} /></span></div></Link><Link className="category-tile category-beauty" to="/my-pham"><img src="/beauty-editorial.png" alt="Bộ sưu tập mỹ phẩm MUSE" loading="lazy" decoding="async" /><div className="category-shade" /><div className="category-info"><span>02 / THE RITUAL</span><h3>Vẻ đẹp<br /><em>tự nhiên</em></h3><span className="category-cta">KHÁM PHÁ MỸ PHẨM <ArrowUpRight size={18} /></span></div></Link></div>
    </section>

    <section className="section products-section container-wide"><div className="section-head"><div><span className="eyebrow">JUST ARRIVED</span><h2>Điều mới dành cho <em>bạn.</em></h2></div><Link className="section-link" to="/san-pham-moi">XEM TẤT CẢ <ArrowUpRight size={18} /></Link></div>
      {loading ? <div className="product-grid">{Array.from({ length: 4 }, (_, i) => <div className="product-skeleton" key={i}><div /><span /><small /></div>)}</div> : error ? <div className="catalog-error"><p>{error}</p><button className="button button-dark" onClick={() => void refresh()}>THỬ LẠI</button></div> : <div className="product-grid">{newProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>}
    </section>

    <section className="editorial-quote"><span className="eyebrow">THE MUSE PHILOSOPHY</span><motion.p initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .75 }}>“Phong cách đẹp nhất là khi bạn thấy <em>thoải mái là chính mình.</em>”</motion.p><span className="quote-line" /></section>

    <section className="section products-section container-wide"><div className="section-head"><div><span className="eyebrow">MUSE FAVORITES</span><h2>Được yêu thích <em>nhất.</em></h2></div><Link className="section-link" to="/thoi-trang">TIẾP TỤC KHÁM PHÁ <ArrowUpRight size={18} /></Link></div><div className="product-grid">{bestProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div></section>

    <section className="beauty-feature"><div className="beauty-feature-image"><img src={promo?.image_url || '/beauty-editorial.png'} alt={promo?.title || 'MUSE Beauty Ritual'} loading="lazy" decoding="async" /></div><div className="beauty-feature-copy"><span className="eyebrow">{promo?.eyebrow || 'THE BEAUTY RITUAL'}</span><h2>{promo?.title || settings.promo_title || <>Dành một phút<br />cho <em>chính mình.</em></>}</h2><p>{promo?.subtitle || settings.promo_body || 'Khám phá những công thức chăm sóc da và sắc đẹp để mỗi ngày bắt đầu bằng sự dịu dàng.'}</p><Link className="button button-outline" to={promo?.link_url || settings.promo_link || '/my-pham'}>{promo?.link_label || 'KHÁM PHÁ MỸ PHẨM'} <ArrowUpRight size={18} /></Link><span className="feature-number">MUSE / 02</span></div></section>

    <section className="section story-section container-wide"><div className="story-visual"><img src="/hero-editorial.png" alt="Phong cách MUSE STORE" loading="lazy" decoding="async" /><span>MUSE STORE<br />EST. 2026</span></div><div className="story-copy"><span className="eyebrow">ABOUT THE BRAND</span><h2>{settings.about_title || <>Một thương hiệu.<br /><em>Nhiều phiên bản bạn.</em></>}</h2><p>{settings.about_body || 'MUSE STORE tin rằng thời trang và vẻ đẹp không có một khuôn mẫu cố định. Chúng tôi chọn những món đồ có thể cùng bạn đi qua mọi khoảnh khắc, từ ngày bình thường đến dịp đặc biệt.'}</p><Link className="text-link" to="/gioi-thieu">CÂU CHUYỆN CỦA MUSE <ArrowRight size={18} /></Link></div></section>
  </>
}

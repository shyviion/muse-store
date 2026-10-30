import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return <footer className="footer">
    <div className="footer-newsletter container-wide"><div><span className="eyebrow">THE MUSE EDITION</span><h2>Cảm hứng cho mọi<br /><em>khoảnh khắc của bạn.</em></h2></div><Link className="button footer-cta" to="/san-pham-moi">KHÁM PHÁ SẢN PHẨM MỚI <ArrowUpRight size={18} /></Link></div>
    <div className="footer-main container-wide"><div className="footer-brand"><Link className="brand-logo" to="/"><span>MUSE<span className="brand-dot">.</span></span><small>STORE</small></Link><p>Thời trang và vẻ đẹp được chọn lọc cho người phụ nữ luôn là chính mình.</p></div><div><h3>KHÁM PHÁ</h3><Link to="/thoi-trang">Thời trang nữ</Link><Link to="/my-pham">Mỹ phẩm</Link><Link to="/san-pham-moi">Sản phẩm mới</Link><Link to="/khuyen-mai">Khuyến mãi</Link></div><div><h3>VỀ MUSE</h3><Link to="/gioi-thieu">Câu chuyện thương hiệu</Link><Link to="/thoi-trang">Bộ sưu tập thời trang</Link><Link to="/my-pham">Chăm sóc sắc đẹp</Link></div><div><h3>TRẢI NGHIỆM</h3><Link to="/gio-hang">Giỏ hàng của bạn</Link><Link to="/yeu-thich">Danh sách yêu thích</Link><Link to="/admin/login">Quản trị website</Link></div></div>
    <div className="footer-bottom container-wide"><span>© {new Date().getFullYear()} MUSE STORE. All rights reserved.</span><Link to="/san-pham-moi">MADE FOR YOUR EVERY MOMENT <ArrowRight size={14} /></Link></div>
  </footer>
}

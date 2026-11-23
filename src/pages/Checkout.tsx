import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, LockKeyhole, ShieldCheck, ShoppingBag } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext'
import { isConfigured, placeOrder } from '../services/backend'
import { cartStockError, colorImages } from '../utils/variants'
import { money } from '../utils/format'

export default function Checkout() {
  const { cart, products, clearCart } = useStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderCode, setOrderCode] = useState('')
  const total = cart.reduce((sum, line) => sum + (products.find(item => item.id === line.productId)?.price ?? line.price) * line.quantity, 0)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isConfigured) { setError('Cần cấu hình Supabase để lưu đơn hàng. Vui lòng xem README của dự án.'); return }
    if (!/^0\d{9,10}$/.test(phone.replace(/\s/g, ''))) { setError('Vui lòng nhập số điện thoại hợp lệ.'); return }
    for (const productId of new Set(cart.map(line => line.productId))) {
      const product = products.find(item => item.id === productId)
      const stockError = product ? cartStockError(product, cart.filter(line => line.productId === productId)) : 'Sản phẩm không còn được bán.'
      if (stockError) { setError(stockError); return }
    }
    setSubmitting(true); setError('')
    try {
      const order = await placeOrder({ customer_name: name.trim(), phone: phone.replace(/\s/g, ''), address: address.trim(), notes: notes.trim(), items: cart.map(line => ({ product_id: line.productId, quantity: line.quantity, size: line.size, color: line.color })) })
      setOrderCode(order.code)
      try {
        const raw = localStorage.getItem('muse-recent-orders')
        const prev = raw ? (JSON.parse(raw) as unknown) : []
        const list = Array.isArray(prev) ? prev.filter((item): item is string => typeof item === 'string' && item !== order.code) : []
        localStorage.setItem('muse-recent-orders', JSON.stringify([order.code, ...list].slice(0, 5)))
      } catch {}
      clearCart()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đặt hàng. Vui lòng thử lại.') }
    finally { setSubmitting(false) }
  }

  if (orderCode) return <div className="checkout-success container-wide"><CheckCircle2 size={52} strokeWidth={1.2} /><span className="eyebrow">ORDER CONFIRMED</span><h1>Cảm ơn bạn đã<br /><em>chọn MUSE.</em></h1><p>Đơn hàng <strong>{orderCode}</strong> đã được ghi nhận. MUSE sẽ liên hệ với bạn để xác nhận thông tin và phí giao hàng.</p><div className="checkout-success-actions"><Link className="button button-dark" to={`/theo-doi-don-hang?code=${encodeURIComponent(orderCode)}`}>THEO DÕI ĐƠN HÀNG <ArrowRight size={18} /></Link><Link className="button button-outline" to="/">VỀ TRANG CHỦ</Link></div></div>
  if (!cart.length) return <Navigate to="/gio-hang" replace />

  // Display-only helpers below; order total and submit flow above are unchanged.
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const lines = cart.map(line => { const product = products.find(item => item.id === line.productId); const price = product?.price ?? line.price; return <div className="checkout-line" key={line.key}><div className="checkout-line-image"><img src={product ? colorImages(product, line.color)[0] || line.image : line.image} alt={line.name} width={120} height={150} loading="lazy" decoding="async" /><span>{line.quantity}</span></div><div><strong>{line.name}</strong><small>{[line.size, line.color].filter(Boolean).join(' / ')}</small></div><span>{money(price * line.quantity)}</span></div> })

  return <div className="container-wide commerce-page checkout-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/gio-hang">Giỏ hàng</Link><span>/</span><span>Đặt hàng</span></div><div className="commerce-heading"><span className="eyebrow">FINAL STEP</span><h1>Thông tin <em>đặt hàng.</em></h1></div>
    <details className="checkout-mobile-summary"><summary><span><ShoppingBag size={17} /> Xem đơn hàng ({itemCount}) <ChevronDown size={16} className="chevron" /></span><strong>{money(total)}</strong></summary><div className="checkout-mobile-lines">{lines}<p>Phí vận chuyển sẽ được xác nhận sau khi đặt hàng.</p></div></details>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={event => void submit(event)}>
      <section className="checkout-section"><div className="checkout-section-heading"><span>01</span><h2>Thông tin giao hàng</h2></div><div className="form-grid">
        <label className="form-field"><span className="form-label">Họ và tên <span className="req" aria-hidden="true">*</span></span><input required autoComplete="name" enterKeyHint="next" value={name} onChange={event => setName(event.target.value)} placeholder="Nguyễn Thị A" maxLength={120} /></label>
        <label className="form-field"><span className="form-label">Số điện thoại <span className="req" aria-hidden="true">*</span></span><input required type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" value={phone} onChange={event => setPhone(event.target.value)} placeholder="09xx xxx xxx" maxLength={15} /><small className="form-hint">MUSE sẽ gọi số này để xác nhận đơn hàng.</small></label>
        <label className="form-field form-full"><span className="form-label">Địa chỉ nhận hàng <span className="req" aria-hidden="true">*</span></span><input required autoComplete="street-address" enterKeyHint="next" value={address} onChange={event => setAddress(event.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" maxLength={500} /></label>
        <label className="form-field form-full"><span className="form-label">Ghi chú cho đơn hàng <span className="optional">(không bắt buộc)</span></span><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Lời nhắn dành cho MUSE (nếu có)" rows={3} maxLength={1000} /></label>
      </div></section>
      <section className="checkout-section"><div className="checkout-section-heading payment-heading"><span>02</span><h2>Phương thức thanh toán</h2></div><div className="payment-option"><div className="radio-indicator" /><div><strong>Thanh toán khi nhận hàng</strong><p>MUSE sẽ liên hệ xác nhận đơn hàng trước khi giao.</p></div></div></section>
      {error && <p className="form-error" role="alert"><AlertCircle size={18} /><span>{error}</span></p>}
      <button className="button button-dark checkout-submit" disabled={submitting || !isConfigured} type="submit"><span>{submitting ? 'ĐANG GỬI ĐƠN...' : 'XÁC NHẬN ĐẶT HÀNG'}</span><span className="checkout-submit-total">{money(total)} <ArrowRight size={18} /></span></button>
      <p className="checkout-assure"><ShieldCheck size={16} /> Bạn chỉ thanh toán khi nhận được hàng.</p>
      {!isConfigured && <p className="setup-note"><LockKeyhole size={17} /> Chế độ xem trước: kết nối Supabase để đặt hàng và lưu dữ liệu thật.</p>}
      <Link className="continue-link" to="/gio-hang"><ArrowLeft size={16} /> Quay lại giỏ hàng</Link>
    </form>
    <aside className="order-summary checkout-summary"><h2>Đơn hàng của bạn <small>({itemCount})</small></h2>{lines}<div className="summary-total"><span>Tạm tính</span><strong>{money(total)}</strong></div><p>Phí vận chuyển sẽ được xác nhận sau khi đặt hàng.</p></aside></div></div>
}

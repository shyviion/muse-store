import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext'
import { isConfigured, placeOrder } from '../services/backend'
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
    setSubmitting(true); setError('')
    try {
      const order = await placeOrder({ customer_name: name.trim(), phone: phone.replace(/\s/g, ''), address: address.trim(), notes: notes.trim(), items: cart.map(line => ({ product_id: line.productId, quantity: line.quantity, size: line.size, color: line.color })) })
      setOrderCode(order.code)
      clearCart()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đặt hàng. Vui lòng thử lại.') }
    finally { setSubmitting(false) }
  }

  if (orderCode) return <div className="checkout-success container-wide"><CheckCircle2 size={52} strokeWidth={1.2} /><span className="eyebrow">ORDER CONFIRMED</span><h1>Cảm ơn bạn đã<br /><em>chọn MUSE.</em></h1><p>Đơn hàng <strong>{orderCode}</strong> đã được ghi nhận. MUSE sẽ liên hệ với bạn để xác nhận thông tin và phí giao hàng.</p><Link className="button button-dark" to="/">VỀ TRANG CHỦ <ArrowRight size={18} /></Link></div>
  if (!cart.length) return <Navigate to="/gio-hang" replace />

  return <div className="container-wide commerce-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/gio-hang">Giỏ hàng</Link><span>/</span><span>Đặt hàng</span></div><div className="commerce-heading"><span className="eyebrow">FINAL STEP</span><h1>Thông tin <em>đặt hàng.</em></h1></div><div className="checkout-layout"><form className="checkout-form" onSubmit={event => void submit(event)}><div className="checkout-section-heading"><span>01</span><h2>Thông tin giao hàng</h2></div><div className="form-grid"><label className="form-field">Họ và tên <span>*</span><input required value={name} onChange={event => setName(event.target.value)} placeholder="Nguyễn Thị A" maxLength={120} /></label><label className="form-field">Số điện thoại <span>*</span><input required type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="09xx xxx xxx" maxLength={15} /></label><label className="form-field form-full">Địa chỉ nhận hàng <span>*</span><input required value={address} onChange={event => setAddress(event.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" maxLength={500} /></label><label className="form-field form-full">Ghi chú cho đơn hàng<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Lời nhắn dành cho MUSE (nếu có)" rows={4} maxLength={1000} /></label></div><div className="checkout-section-heading payment-heading"><span>02</span><h2>Phương thức thanh toán</h2></div><div className="payment-option"><div className="radio-indicator" /><div><strong>Thanh toán khi nhận hàng</strong><p>MUSE sẽ liên hệ xác nhận đơn hàng trước khi giao.</p></div></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark checkout-submit" disabled={submitting || !isConfigured} type="submit">{submitting ? 'ĐANG GỬI ĐƠN...' : 'XÁC NHẬN ĐẶT HÀNG'} <ArrowRight size={18} /></button>{!isConfigured && <p className="setup-note"><LockKeyhole size={17} /> Chế độ xem trước: kết nối Supabase để đặt hàng và lưu dữ liệu thật.</p>}<Link className="continue-link" to="/gio-hang"><ArrowLeft size={16} /> Quay lại giỏ hàng</Link></form><aside className="order-summary checkout-summary"><h2>Đơn hàng của bạn</h2>{cart.map(line => { const price = products.find(item => item.id === line.productId)?.price ?? line.price; return <div className="checkout-line" key={line.key}><div className="checkout-line-image"><img src={line.image} alt={line.name} /><span>{line.quantity}</span></div><div><strong>{line.name}</strong><small>{[line.size, line.color].filter(Boolean).join(' / ')}</small></div><span>{money(price * line.quantity)}</span></div> })}<div className="summary-total"><span>Tạm tính</span><strong>{money(total)}</strong></div><p>Phí vận chuyển sẽ được xác nhận sau khi đặt hàng.</p></aside></div></div>
}

import {
  AlertCircle, ArrowLeft, ArrowRight, Banknote, Check, CheckCircle2,
  ClipboardCheck, Copy, LockKeyhole, MapPin, Package, PackageCheck,
  Phone, Search, Truck, UserRound, XCircle,
} from 'lucide-react'
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext'
import { isConfigured, trackOrder } from '../services/backend'
import type { OrderStatus, TrackedOrder } from '../types'
import { money } from '../utils/format'
import { colorSwatch } from '../utils/variants'

const RECENT_ORDERS_KEY = 'muse-recent-orders'

const statusLabel: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const stepOrder: OrderStatus[] = ['pending', 'confirmed', 'shipping', 'completed']

function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

function readRecentOrders(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_ORDERS_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 5) : []
  } catch {
    return []
  }
}

export default function TrackOrder() {
  const [params, setParams] = useSearchParams()
  const { notify } = useStore()
  const initialCode = params.get('code') || ''
  const [code, setCode] = useState(initialCode)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [searched, setSearched] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recentCodes] = useState<string[]>(() => readRecentOrders())

  useEffect(() => {
    const nextCode = params.get('code')
    if (nextCode) setCode(nextCode)
  }, [params])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isConfigured) {
      setError('Cần cấu hình Supabase để tra cứu đơn hàng thật.')
      return
    }
    const cleanCode = code.trim().toUpperCase()
    const cleanPhone = phone.replace(/\s+/g, '').trim()
    if (cleanCode.length < 4) {
      setError('Vui lòng nhập mã đơn hàng hợp lệ (ví dụ: MS-20261123-XXXXXXXX).')
      return
    }
    if (!/^0\d{8,10}$/.test(cleanPhone)) {
      setError('Vui lòng nhập đúng số điện thoại đã dùng khi đặt hàng.')
      return
    }
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const found = await trackOrder(cleanCode, cleanPhone)
      setOrder(found)
      if (found) {
        setParams({ code: found.code }, { replace: true })
      } else {
        setError('Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại bạn vừa nhập. Vui lòng kiểm tra lại.')
      }
    } catch (cause) {
      setOrder(null)
      const msg = cause instanceof Error ? cause.message : 'Không thể tra cứu đơn hàng. Vui lòng thử lại.'
      setError(msg.includes('track_order')
        ? 'Chức năng tra cứu chưa được kích hoạt trên cơ sở dữ liệu. Vui lòng chạy migration mới nhất trong Supabase SQL Editor.'
        : msg)
    } finally {
      setLoading(false)
    }
  }

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      notify('Đã sao chép mã đơn hàng')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      notify('Không thể sao chép mã đơn hàng')
    }
  }

  const currentStepIndex = order ? stepOrder.indexOf(order.status) : -1
  const timeline = order ? [
    {
      key: 'pending',
      label: 'Chờ xác nhận',
      note: 'MUSE đã tiếp nhận đơn hàng',
      time: order.created_at,
      icon: ClipboardCheck,
    },
    {
      key: 'confirmed',
      label: 'Đã xác nhận',
      note: 'Đơn đã xác nhận và chuẩn bị hàng',
      time: order.confirmed_at,
      icon: PackageCheck,
    },
    {
      key: 'shipping',
      label: 'Đang giao hàng',
      note: 'Đơn hàng đang trên đường đến bạn',
      time: order.shipping_at,
      icon: Truck,
    },
    {
      key: 'completed',
      label: 'Hoàn thành',
      note: 'Giao hàng thành công',
      time: order.completed_at,
      icon: CheckCircle2,
    },
  ] : []

  const totalItems = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0

  return (
    <div className="container-wide commerce-page track-page">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <span>Theo dõi đơn hàng</span>
      </div>

      <div className="commerce-heading">
        <span className="eyebrow">ORDER TRACKING</span>
        <h1>Theo dõi <em>đơn hàng.</em></h1>
        <p>Nhập mã đơn hàng và số điện thoại đặt hàng để kiểm tra trạng thái xử lý mới nhất.</p>
      </div>

      <section className="track-search-card" aria-label="Biểu mẫu tra cứu đơn hàng">
        <form className="track-form" onSubmit={event => void submit(event)}>
          <label className="form-field">
            <span className="form-label">Mã đơn hàng <span className="req" aria-hidden="true">*</span></span>
            <input
              required
              autoComplete="off"
              enterKeyHint="next"
              value={code}
              onChange={event => setCode(event.target.value.toUpperCase())}
              placeholder="Ví dụ: MS-20261123-AB12CD34"
              maxLength={40}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Số điện thoại đặt hàng <span className="req" aria-hidden="true">*</span></span>
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="search"
              value={phone}
              onChange={event => setPhone(event.target.value)}
              placeholder="09xx xxx xxx"
              maxLength={15}
            />
          </label>

          <button
            className="button button-dark track-submit"
            type="submit"
            disabled={loading || !isConfigured}
          >
            <Search size={17} />
            <span>{loading ? 'ĐANG TRA CỨU...' : 'TRA CỨU ĐƠN'}</span>
          </button>
        </form>

        {recentCodes.length > 0 && (
          <div className="track-recent">
            <span>Đơn gần đây của bạn:</span>
            <div className="track-recent-chips">
              {recentCodes.map(recent => (
                <button
                  key={recent}
                  type="button"
                  className={code.trim().toUpperCase() === recent ? 'is-active' : undefined}
                  onClick={() => setCode(recent)}
                >
                  {recent}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isConfigured && (
          <p className="setup-note">
            <LockKeyhole size={17} /> Chế độ xem trước: kết nối Supabase để tra cứu đơn hàng thật.
          </p>
        )}

        {error && (
          <p className="form-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </p>
        )}
      </section>

      {order && (
        <section className="track-result" aria-live="polite">
          <div className="track-result-head">
            <div>
              <span className="eyebrow">MÃ ĐƠN HÀNG</span>
              <div className="track-code-row">
                <h2>{order.code}</h2>
                <button
                  type="button"
                  className="track-copy"
                  aria-label="Sao chép mã đơn hàng"
                  onClick={() => void copyCode(order.code)}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              <p className="track-placed-at">Đặt lúc {formatDateTime(order.created_at)} · {totalItems} sản phẩm</p>
            </div>
            <span className={`track-status-pill is-${order.status}`}>{statusLabel[order.status]}</span>
          </div>

          {order.status === 'cancelled' ? (
            <div className="track-cancelled-banner" role="status">
              <XCircle size={24} />
              <div>
                <strong>Đơn hàng đã bị hủy</strong>
                <p>
                  {order.cancelled_at
                    ? `Đơn hàng đã được hủy lúc ${formatDateTime(order.cancelled_at)}. `
                    : 'Đơn hàng này đã được hủy. '}
                  Nếu bạn cần hỗ trợ đặt lại hoặc có thắc mắc, vui lòng liên hệ MUSE STORE.
                </p>
              </div>
            </div>
          ) : (
            <ol className="track-timeline" aria-label="Tiến trình đơn hàng">
              {timeline.map((step, index) => {
                const Icon = step.icon
                const isDone = currentStepIndex > index || (order.status === 'completed' && index === currentStepIndex)
                const isCurrent = currentStepIndex === index && order.status !== 'completed'
                const stateClass = isDone ? 'is-done' : isCurrent ? 'is-current' : 'is-upcoming'
                return (
                  <li key={step.key} className={`track-step ${stateClass}`} aria-current={isCurrent ? 'step' : undefined}>
                    <div className="track-step-marker">
                      <span className="track-step-icon">
                        {isDone ? <Check size={16} strokeWidth={2.4} /> : <Icon size={17} />}
                      </span>
                      {index < timeline.length - 1 && <span className="track-step-line" aria-hidden="true" />}
                    </div>
                    <div className="track-step-body">
                      <strong>{step.label}</strong>
                      <small>{step.note}</small>
                      {step.time && <time dateTime={step.time}>{formatDateTime(step.time)}</time>}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          <div className="track-details-grid">
            <div className="track-panel">
              <h3>Sản phẩm trong đơn ({totalItems})</h3>
              <div className="track-items">
                {order.items.map(item => (
                  <div className="track-item" key={item.id}>
                    <div className="track-item-image">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} width={160} height={200} loading="lazy" decoding="async" />
                      ) : (
                        <span className="track-item-placeholder" aria-hidden="true"><Package size={20} /></span>
                      )}
                    </div>
                    <div className="track-item-info">
                      <strong>{item.product_name}</strong>
                      <span className="track-item-sku">{item.sku}</span>
                      {(item.color || item.size) && (
                        <div className="cart-variants">
                          {item.color && (
                            <span className="variant-chip">
                              <span className="color-dot" style={{ '--swatch': colorSwatch(item.color) } as CSSProperties} aria-hidden="true" />
                              {item.color}
                            </span>
                          )}
                          {item.size && <span className="variant-chip">Size {item.size}</span>}
                        </div>
                      )}
                      <small className="track-item-qty">{money(item.unit_price)} × {item.quantity}</small>
                    </div>
                    <strong className="track-item-total">{money(item.line_total)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <aside className="order-summary track-summary">
              <h2>Thông tin nhận hàng</h2>
              <dl className="track-receiver">
                <div>
                  <dt><UserRound size={15} /> Người nhận</dt>
                  <dd>{order.customer_name}</dd>
                </div>
                <div>
                  <dt><Phone size={15} /> Số điện thoại</dt>
                  <dd>{order.masked_phone}</dd>
                </div>
                <div>
                  <dt><MapPin size={15} /> Địa chỉ</dt>
                  <dd>{order.masked_address}</dd>
                </div>
                <div>
                  <dt><Banknote size={15} /> Thanh toán</dt>
                  <dd>{order.payment_method}</dd>
                </div>
                {order.notes && (
                  <div>
                    <dt>Ghi chú</dt>
                    <dd>{order.notes}</dd>
                  </div>
                )}
              </dl>

              <div className="summary-row">
                <span>Tạm tính ({totalItems} sản phẩm)</span>
                <strong>{money(order.total)}</strong>
              </div>
              <div className="summary-row">
                <span>Phí vận chuyển</span>
                <span>Xác nhận khi giao</span>
              </div>
              <div className="summary-total">
                <span>Tổng cộng</span>
                <strong>{money(order.total)}</strong>
              </div>
              <p>Một phần số điện thoại và địa chỉ được ẩn để bảo vệ quyền riêng tư của bạn.</p>
            </aside>
          </div>
        </section>
      )}

      {!order && searched && !loading && !error && (
        <div className="empty-state">
          <span>NOT FOUND</span>
          <h2>Không tìm thấy đơn hàng.</h2>
          <p>Vui lòng kiểm tra lại mã đơn hàng và số điện thoại bạn đã dùng lúc đặt mua.</p>
        </div>
      )}

      <div className="track-foot-links">
        <Link className="continue-link" to="/san-pham-moi"><ArrowLeft size={16} /> Tiếp tục mua sắm</Link>
        <Link className="continue-link" to="/gio-hang">Xem giỏ hàng <ArrowRight size={16} /></Link>
      </div>
    </div>
  )
}

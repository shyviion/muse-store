import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return <div className="not-found container-wide"><span className="eyebrow">ERROR / 404</span><h1>Trang này đã đi lạc<br /><em>một chút.</em></h1><p>Hãy quay về và tiếp tục tìm điều dành cho bạn.</p><Link className="button button-dark" to="/">VỀ TRANG CHỦ <ArrowRight size={17} /></Link></div>
}

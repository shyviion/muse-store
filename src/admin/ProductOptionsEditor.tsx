import { useState } from 'react'
import { optionKey, validateOptions } from '../utils/variants'

function OptionList({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  function add() {
    const items = draft.split(',').map(item => item.trim()).filter(Boolean)
    if (!items.length || !validateOptions([...values, ...items])) { setError('Tên không được trùng hoặc dài quá 100 ký tự.'); return }
    onChange([...values, ...items]); setDraft(''); setError('')
  }
  return <div className="admin-option-list"><label>{label}</label><div className="admin-option-add"><input aria-label={label} value={draft} placeholder={placeholder} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add() } }} /><button type="button" className="admin-button admin-button-light" onClick={add}>Thêm</button></div><small>Nhập tên rồi nhấn Thêm hoặc Enter; dùng dấu phẩy để thêm nhiều tên.</small>{error && <p role="alert" className="admin-form-error">{error}</p>}<div className="admin-option-tags">{values.map(value => <button type="button" key={value} onClick={() => onChange(values.filter(item => item !== value))} aria-label={'Bỏ ' + label.toLowerCase() + ' ' + value}>{value} ×</button>)}</div></div>
}

export default function ProductOptionsEditor({ colors, sizes, tracked, locked, stocks, onColors, onSizes, onTracked, onStock }: {
  colors: string[]; sizes: string[]; tracked: boolean; locked: boolean; stocks: Record<string, string>;
  onColors: (values: string[]) => void; onSizes: (values: string[]) => void; onTracked: (value: boolean) => void; onStock: (key: string, value: string) => void
}) {
  return <div className="admin-variant-editor"><OptionList label="Màu sắc" values={colors} onChange={onColors} placeholder="Đen, Kem, Hồng nude" /><OptionList label="Kích thước" values={sizes} onChange={onSizes} placeholder="S, M, L hoặc 36, 37, 38" /><label className="admin-variant-toggle"><input type="checkbox" checked={tracked} disabled={locked} onChange={event => onTracked(event.target.checked)} /> Quản lý tồn kho theo màu và size</label>{!tracked && <p>Sản phẩm đang dùng tồn kho chung. Bật tùy chọn trên khi đã có số lượng thực tế của từng màu–size.</p>}{tracked && <><p>Nhập tồn kho cho từng tổ hợp. Nhập 0 nếu hết hàng. Tổng tồn kho được cộng tự động.</p><div className="admin-table-scroll"><table className="admin-table admin-variant-table"><caption>{(colors.length || 1) * (sizes.length || 1)} tổ hợp màu–size</caption><thead><tr><th>MÀU / SIZE</th>{(sizes.length ? sizes : ['Một size']).map(size => <th key={size}>{size}</th>)}</tr></thead><tbody>{(colors.length ? colors : [null]).map(color => <tr key={color || 'shared'}><th>{color || 'Một màu'}</th>{(sizes.length ? sizes : [null]).map(size => <td key={size || 'shared'}><input aria-label={'Tồn kho ' + (color || 'Một màu') + ' – ' + (size || 'Một size')} type="number" min="0" max="2147483647" step="1" placeholder="Nhập số lượng" value={stocks[optionKey(color, size)] ?? ''} onChange={event => onStock(optionKey(color, size), event.target.value)} /></td>)}</tr>)}</tbody></table></div></>}</div>
}

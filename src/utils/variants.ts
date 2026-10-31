import type { Product, ProductVariantInput } from '../types'

export const optionKey = (color?: string | null, size?: string | null) => JSON.stringify([color || null, size || null])
export const activeVariants = (product: Product) => product.variants.filter(item => item.is_active !== false)
export const hasVariants = (product: Product) => product.variant_mode === 'tracked' || activeVariants(product).length > 0

export function variantStock(product: Product, size?: string | null, color?: string | null): number {
  if (product.sizes.length ? !size || !product.sizes.includes(size) : Boolean(size)) return 0
  if (product.colors.length ? (color ? !product.colors.includes(color) : product.kind === 'fashion' || hasVariants(product)) : Boolean(color)) return 0
  if (!hasVariants(product)) return product.stock
  const variant = activeVariants(product).find(item => optionKey(item.color, item.size) === optionKey(color, product.stock_by_color ? null : size))
  if (!variant) return 0
  return product.variant_mode === 'tracked'
    ? Math.min(product.stock, variant.stock ?? 0)
    : Math.min(product.stock, variant.stock ?? product.stock)
}

export function colorImages(product: Product, color?: string | null): string[] {
  const matching = color ? product.image_records.filter(item => item.color === color) : []
  if (matching.length) return [...matching].sort((a,b) => Number(Boolean(b.is_color_primary)) - Number(Boolean(a.is_color_primary)) || a.sort_order - b.sort_order).map(item => item.url)
  const shared = product.image_records.filter(item => !item.color)
  if (color && shared.length) return [...shared].sort((a,b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order).map(item => item.url)
  return product.images.length ? product.images : product.cover_image ? [product.cover_image] : []
}

export function optionAvailable(product: Product, size?: string, color?: string): boolean {
  const sizes = size ? [size] : product.sizes.length ? product.sizes : [undefined]
  const colors = color ? [color] : product.colors.length ? product.colors : [undefined]
  return colors.some(c => sizes.some(s => variantStock(product, s, c) > 0))
}

export function validateOptions(values: string[]): boolean {
  const normalized = values.map(item => item.trim().toLocaleLowerCase('vi'))
  return normalized.every(item => item.length > 0 && item.length <= 100) && new Set(normalized).size === normalized.length
}

export function variantMatrix(colors: string[], sizes: string[], stocks: Record<string, string>): ProductVariantInput[] {
  return (colors.length ? colors : [null]).flatMap(color => (sizes.length ? sizes : [null]).map(size => {
    const value = stocks[optionKey(color, size)]
    const stock = value?.trim() ? Number(value) : NaN
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 2147483647) throw new Error('Nhập số lượng nguyên không âm cho từng màu–size, kể cả 0 nếu hết hàng.')
    return { color, size, stock }
  }))
}

export function cartStockError(product: Product, lines: Array<{ size?: string; color?: string; quantity: number }>): string | null {
  const counts = new Map<string, number>()
  let total = 0
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) return 'Mỗi lựa chọn chỉ được đặt từ 1 đến 20 sản phẩm.'
    const key = optionKey(line.color, product.stock_by_color ? null : line.size)
    const count = (counts.get(key) ?? 0) + line.quantity
    counts.set(key, count)
    total += line.quantity
    if (count > Math.min(20, variantStock(product, line.size, line.color))) return 'Lựa chọn màu–size không còn đủ hàng. Vui lòng cập nhật giỏ hàng.'
  }
  return total > product.stock ? 'Tổng số lượng vượt quá tồn kho sản phẩm.' : null
}

// A legacy product with exactly one color has an unambiguous color quantity.
// Keep multi-color legacy stock unallocated until the admin enters each amount.
export function initialVariantStocks(product: Product): Record<string, string> {
  const variants = activeVariants(product)
  if (product.variant_mode !== 'tracked' && !variants.length && product.colors.length === 1) {
    return { [optionKey(product.colors[0], null)]: String(product.stock) }
  }
  return Object.fromEntries(variants.map(item => [optionKey(item.color, item.size), item.stock === null ? '' : String(item.stock)]))
}

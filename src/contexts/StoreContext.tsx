import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isConfigured, listBanners, listCategories, listProducts, supabase } from '../services/backend'
import { sampleCategories, sampleProducts } from '../data/sample'
import { cartStockError, colorImages } from '../utils/variants'
import type { Banner, Category, Product } from '../types'

export interface CartLine {
  key: string
  productId: string
  slug: string
  name: string
  image: string
  price: number
  size?: string
  color?: string
  quantity: number
}

interface StoreState {
  products: Product[]
  categories: Category[]
  banners: Banner[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  cart: CartLine[]
  addToCart: (product: Product, quantity?: number, size?: string, color?: string) => boolean
  updateCart: (key: string, quantity: number) => void
  removeFromCart: (key: string) => void
  clearCart: () => void
  favorites: string[]
  toggleFavorite: (id: string) => void
  toast: string | null
  notify: (text: string) => void
}

const StoreContext = createContext<StoreState | null>(null)

function fromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(isConfigured ? [] : sampleProducts)
  const [categories, setCategories] = useState<Category[]>(isConfigured ? [] : sampleCategories)
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(isConfigured)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartLine[]>(() => fromStorage('muse-cart', []))
  const [favorites, setFavorites] = useState<string[]>(() => fromStorage('muse-favorites', []))
  const [toast, setToast] = useState<string | null>(null)

  const notify = useCallback((text: string) => {
    setToast(text)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3300)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => { localStorage.setItem('muse-cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('muse-favorites', JSON.stringify(favorites)) }, [favorites])

  const refresh = useCallback(async () => {
    if (!isConfigured) return
    setLoading(true)
    try {
      const [nextProducts, nextCategories, nextBanners] = await Promise.all([listProducts(), listCategories(), listBanners()])
      setProducts(nextProducts)
      setCategories(nextCategories)
      setBanners(nextBanners)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải sản phẩm. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const api = supabase
    if (!api) return
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    const channel = api.channel('muse-catalog').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onFocus).subscribe()
    return () => { window.removeEventListener('focus', onFocus); void api.removeChannel(channel) }
  }, [refresh])

  const addToCart = useCallback((product: Product, quantity = 1, size?: string, color?: string) => {
    const key = JSON.stringify([product.id, size || null, color || null])
    const proposed = cart.filter(line => line.productId === product.id)
    const existing = proposed.find(line => line.key === key || (line.size === size && line.color === color))
    const next = existing ? proposed.map(line => line === existing ? { ...line, quantity: line.quantity + quantity } : line) : [...proposed, { size, color, quantity }]
    const error = cartStockError(product, next)
    if (error) { notify(error); return false }
    setCart(lines => {
      const current = lines.find(line => line.productId === product.id && line.size === size && line.color === color)
      if (current) return lines.map(line => line === current ? { ...line, quantity: line.quantity + quantity } : line)
      return [...lines, { key, productId: product.id, slug: product.slug, name: product.name, image: colorImages(product, color)[0] || '', price: product.price, size, color, quantity }]
    })
    notify('Đã thêm vào giỏ hàng')
    return true
  }, [cart, notify])

  const updateCart = useCallback((key: string, quantity: number) => {
    const target = cart.find(line => line.key === key)
    if (!target) return
    const product = products.find(item => item.id === target.productId)
    if (!product) { notify('Sản phẩm không còn được bán.'); return }
    const error = cartStockError(product, cart.filter(line => line.productId === target.productId).map(line => line.key === key ? { ...line, quantity } : line))
    if (error) { notify(error); return }
    setCart(lines => lines.map(line => line.key === key ? { ...line, quantity: Math.max(1, quantity) } : line))
  }, [cart, products, notify])

  const removeFromCart = useCallback((key: string) => { setCart(lines => lines.filter(line => line.key !== key)); notify('Đã xóa khỏi giỏ hàng') }, [notify])
  const clearCart = useCallback(() => setCart([]), [])
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(ids => {
      if (ids.includes(id)) { notify('Đã bỏ khỏi yêu thích'); return ids.filter(item => item !== id) }
      notify('Đã thêm vào yêu thích')
      return [...ids, id]
    })
  }, [notify])

  const state = useMemo(() => ({ products, categories, banners, loading, error, refresh, cart, addToCart, updateCart, removeFromCart, clearCart, favorites, toggleFavorite, toast, notify }), [products, categories, banners, loading, error, refresh, cart, addToCart, updateCart, removeFromCart, clearCart, favorites, toggleFavorite, toast, notify])
  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('StoreProvider is missing')
  return value
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { priceCart, type CartPricing } from './pricing'
import type { Settings } from './types'

/** Quita la pantalla de carga del logo (index.html) */
export function hideSplash() {
  ;(window as unknown as { __hideSplash?: () => void }).__hideSplash?.()
}

// ---------- Ajustes de la tienda ----------
interface SettingsCtx {
  settings: Settings | null
  reload(): Promise<void>
}

const SettingsContext = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const reload = useCallback(async () => {
    try {
      setSettings(await api.getSettings())
    } catch {
      /* se reintenta en la próxima carga */
    } finally {
      hideSplash()
    }
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const c = useContext(SettingsContext)
  if (!c) throw new Error('useSettings fuera de SettingsProvider')
  return c
}

// ---------- Carrito ----------
export interface CartItem {
  variant_id: string
  product_id: string
  name: string
  /** Nombre del tono. '' = sin tono */
  tone: string
  hex: string
  image_url: string | null
  price: number
  price_wholesale: number | null
  qty: number
}

interface CartCtx {
  items: CartItem[]
  count: number
  /** Totales con la regla del precio al mayor ya aplicada */
  pricing: CartPricing
  wholesaleMin: number
  add(item: Omit<CartItem, 'qty'>, qty?: number): void
  setQty(variantId: string, qty: number): void
  remove(variantId: string): void
  clear(): void
}

const CART_KEY = 'twins-cart'
const Cart = createContext<CartCtx | null>(null)

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [items, setItems] = useState<CartItem[]>(readCart)

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      /* sin almacenamiento */
    }
  }, [items])

  const add = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.variant_id === item.variant_id)
      if (found) return prev.map((i) => (i.variant_id === item.variant_id ? { ...i, ...item, qty: i.qty + qty } : i))
      return [...prev, { ...item, qty }]
    })
  }, [])

  const setQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.variant_id !== variantId) : prev.map((i) => (i.variant_id === variantId ? { ...i, qty } : i))))
  }, [])

  const remove = useCallback((variantId: string) => setItems((prev) => prev.filter((i) => i.variant_id !== variantId)), [])
  const clear = useCallback(() => setItems([]), [])

  const wholesaleMin = settings?.wholesale_min ?? 0
  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((a, i) => a + i.qty, 0),
      pricing: priceCart(items, wholesaleMin),
      wholesaleMin,
      add,
      setQty,
      remove,
      clear
    }),
    [items, wholesaleMin, add, setQty, remove, clear]
  )
  return <Cart.Provider value={value}>{children}</Cart.Provider>
}

export function useCart() {
  const c = useContext(Cart)
  if (!c) throw new Error('useCart fuera de CartProvider')
  return c
}

// ---------- Carga simple de datos ----------
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fn()
      .then((d) => {
        if (alive) {
          setData(d)
          setError(null)
        }
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload, setData }
}

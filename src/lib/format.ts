import type { Currency, Delivery, Order, OrderStatus, Product, Variant } from './types'

const usdFmt = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 })
const copFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const bsFmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const usd = (n: number) => `$${usdFmt.format(n)}`
export const cop = (n: number) => `${copFmt.format(n)} COP`
export const bs = (n: number) => `Bs ${bsFmt.format(n)}`

export interface Totals {
  usd: number
  bs: number | null
  cop: number | null
}

/** Total mostrado en la moneda del método de pago */
export function money(currency: Currency, t: Totals) {
  if (currency === 'COP') return t.cop != null ? cop(t.cop) : `${usd(t.usd)} en pesos`
  if (currency === 'BS') return t.bs != null ? bs(t.bs) : `${usd(t.usd)} en Bs`
  return usd(t.usd)
}

/** El total en la moneda del método, como número (para comparar con el efectivo que trae el cliente) */
export function amountIn(currency: Currency, t: Totals) {
  if (currency === 'COP') return t.cop ?? t.usd
  if (currency === 'BS') return t.bs ?? t.usd
  return t.usd
}

/** Convierte un monto en dólares a las otras monedas con las tasas cargadas */
export function convert(amountUsd: number, rates: { bs_rate: number | null; cop_rate: number | null }): Totals {
  return {
    usd: amountUsd,
    bs: rates.bs_rate != null ? Math.round(amountUsd * rates.bs_rate * 100) / 100 : null,
    cop: rates.cop_rate != null ? Math.round(amountUsd * rates.cop_rate) : null
  }
}

export const orderTotal = (o: Pick<Order, 'currency' | 'total_usd' | 'total_cop' | 'total_bs'>) =>
  money(o.currency, { usd: o.total_usd, cop: o.total_cop, bs: o.total_bs })

export const fmtFor: Record<Currency, (n: number) => string> = { USD: usd, COP: cop, BS: bs }

/** Lo que el cliente dijo que trae en efectivo, en la moneda del pedido (o null si no aplica) */
export function cashAmountText(o: Pick<Order, 'currency' | 'cash_amount'>) {
  return o.cash_amount == null ? null : fmtFor[o.currency](o.cash_amount)
}

/** Vuelto que hay que devolver, o null si paga exacto / no dio el monto */
export function changeDueText(o: Pick<Order, 'currency' | 'total_usd' | 'total_cop' | 'total_bs' | 'cash_amount'>) {
  if (o.cash_amount == null) return null
  const total = amountIn(o.currency, { usd: o.total_usd, bs: o.total_bs, cop: o.total_cop })
  const diff = Math.round((o.cash_amount - total) * 100) / 100
  return diff > 0 ? fmtFor[o.currency](diff) : null
}

export const totalStock = (p: Product) => p.variants.reduce((a, v) => a + v.stock, 0)
/** El producto tiene tonos para elegir (si no, tiene una sola fila sin nombre) */
export const hasTones = (p: Pick<Product, 'variants'>) => p.variants.some((v) => v.name !== '')
/** Tonos con al menos una unidad, en orden */
export const tonesInStock = (p: Product): Variant[] => p.variants.filter((v) => v.name !== '' && v.stock > 0)

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: 'Por confirmar',
  pagado: 'Pagado',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
}

export const DELIVERY_LABEL: Record<Delivery, string> = {
  pickup: 'Retiro personal',
  delivery: 'Delivery en la ciudad',
  envio: 'Envío nacional'
}

/** Dónde va el pedido, en una línea */
export function deliveryText(o: Pick<Order, 'delivery' | 'address' | 'state' | 'city' | 'agency' | 'id_number'>) {
  if (o.delivery === 'delivery') return `${DELIVERY_LABEL.delivery}${o.address ? ` · ${o.address}` : ''}`
  if (o.delivery === 'envio') {
    const where = [o.city, o.state].filter(Boolean).join(', ')
    return `${DELIVERY_LABEL.envio}${where ? ` · ${where}` : ''}${o.agency ? ` · ${o.agency}` : ''}${o.id_number ? ` · C.I. ${o.id_number}` : ''}`
  }
  return DELIVERY_LABEL.pickup
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 172800) return 'ayer'
  return new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
}

export const hoursText = (h: number) => (h === 1 ? '1 hora' : `${h} horas`)

/** Cuánto falta para que un pedido sin pagar se libere solo, en texto corto */
export function timeLeft(createdAt: string, hours: number) {
  if (!hours) return null
  const ms = new Date(createdAt).getTime() + hours * 3600_000 - Date.now()
  if (ms <= 0) return 'se libera en cualquier momento'
  const h = Math.floor(ms / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  if (h >= 1) return `se libera en ${h} h${m ? ` ${m} min` : ''}`
  return `se libera en ${Math.max(1, m)} min`
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Solo dígitos, para wa.me */
export const digits = (s: string) => s.replace(/\D/g, '')

export function errorMessage(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Algo salió mal. Intenta de nuevo.'
}

/**
 * Método sin datos escritos (ej. Zelle, cuando la dueña prefiere no publicar su correo):
 * a la clienta se le dice que los pida por WhatsApp, y el mensaje del pedido ya los pide.
 */
export function asksByWhatsApp(m: { cash: boolean; fields: { value: string }[] }) {
  return !m.cash && !m.fields.some((f) => f.value.trim())
}

import { cashAmountText, changeDueText, deliveryText, digits, money, usd } from './format'
import type { NewOrder, OrderResult } from './types'

interface MessageInput {
  storeName: string
  result: OrderResult
  items: { name: string; tone: string; qty: number; unit: number }[]
  /** El método no tiene datos publicados: el mensaje los pide */
  askPaymentData?: boolean
  order: Pick<NewOrder, 'customer_name' | 'customer_phone' | 'delivery' | 'address' | 'state' | 'city' | 'agency' | 'id_number' | 'payment_method' | 'cash_amount'>
}

export function orderMessage({ storeName, result, items, order, askPaymentData = false }: MessageInput) {
  const totals = { usd: result.total_usd, bs: result.total_bs, cop: result.total_cop }
  const o = { currency: result.currency, total_usd: result.total_usd, total_cop: result.total_cop, total_bs: result.total_bs, cash_amount: order.cash_amount }
  const paidWith = cashAmountText(o)
  const change = changeDueText(o)
  const extra = order.delivery === 'pickup' ? '' : order.delivery === 'delivery' ? ' + delivery' : ' + envío'
  const lines = [
    `*Pedido ${result.code}* · ${storeName}`,
    '',
    ...items.map((i) => `${i.qty}× ${i.name}${i.tone ? ` · Tono ${i.tone}` : ''} · ${usd(i.unit)} c/u`),
    '',
    `Entrega: ${deliveryText(order)}`,
    `Pago: ${order.payment_method}`,
    ...(result.wholesale ? [`Precio al mayor · ahorro ${usd(result.retail_usd - result.total_usd)}`] : []),
    `*Total: ${money(result.currency, totals)}*${extra}`,
    ...(paidWith ? [`Paga con: ${paidWith}${change ? ` (vuelto: ${change})` : ''}`] : []),
    ...(askPaymentData ? ['', `¿Me pasas los datos de ${order.payment_method} para hacer el pago?`] : []),
    '',
    `${order.customer_name.trim()} · ${order.customer_phone.trim()}`
  ]
  return lines.join('\n')
}

export function waLink(phone: string, text: string) {
  const n = digits(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

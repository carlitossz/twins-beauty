import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Icon, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtFor, usd } from '../../lib/format'
import { useAsync } from '../../lib/store'
import type { Currency, Order, OrderItem } from '../../lib/types'
import { ErrorBox, PageTitle } from './shared'

const MONTH_LABEL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const CURRENCY_LABEL: Record<Currency, string> = { USD: 'Dólares', BS: 'Bolívares', COP: 'Pesos' }
const CHANNEL_LABEL = { tienda: 'Tienda', externa: 'Externa' } as const

/** "2026-05" a partir de una fecha ISO, en hora local */
function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Cuánto costó esa línea, en la moneda real con la que se pagó el pedido */
function itemAmount(o: Order, i: OrderItem): { amount: number; currency: Currency } {
  const usdSub = i.unit_usd * i.qty
  if (o.currency === 'BS' && o.total_bs != null && o.total_usd > 0) return { amount: Math.round(usdSub * (o.total_bs / o.total_usd) * 100) / 100, currency: 'BS' }
  if (o.currency === 'COP' && o.total_cop != null && o.total_usd > 0) return { amount: Math.round(usdSub * (o.total_cop / o.total_usd)), currency: 'COP' }
  return { amount: Math.round(usdSub * 100) / 100, currency: 'USD' }
}

interface Row {
  code: string
  created_at: string
  product_name: string
  tone: string
  qty: number
  unit_usd: number
  wholesale: boolean
  customer: string
  amount: number
  currency: Currency
  channel: 'tienda' | 'externa'
}

export default function Reports() {
  const { data: orders, error, loading, reload } = useAsync(() => api.listOrders())
  const [month, setMonth] = useState(() => monthKey(new Date().toISOString()))

  // Solo cuenta como venta real lo pagado o entregado
  const sold = useMemo(() => (orders ?? []).filter((o) => (o.status === 'pagado' || o.status === 'entregado') && monthKey(o.created_at) === month), [orders, month])
  const totalUsd = sold.reduce((a, o) => a + o.total_usd, 0)
  const units = sold.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0)

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const o of sold) {
      for (const i of o.items) {
        const { amount, currency } = itemAmount(o, i)
        out.push({ code: o.code, created_at: o.created_at, product_name: i.product_name, tone: i.tone, qty: i.qty, unit_usd: i.unit_usd, wholesale: i.wholesale, customer: o.customer_name, amount, currency, channel: o.channel })
      }
    }
    return out.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [sold])

  // Lo más vendido del mes, sumando todos los tonos de cada producto
  const top = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.product_name, (m.get(r.product_name) ?? 0) + r.qty)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [rows])

  const [y, m] = month.split('-')
  const monthLabel = `${MONTH_LABEL[Number(m) - 1]} ${y}`
  const monthLabelCap = monthLabel[0].toUpperCase() + monthLabel.slice(1)

  function download() {
    const resumen = [
      ['Mes', monthLabelCap],
      ['Pedidos vendidos (pagados o entregados)', sold.length],
      ['Unidades vendidas', units],
      ['Total en dólares', Number(totalUsd.toFixed(2))],
      [],
      ['Más vendidos', 'Unidades'],
      ...top.map(([name, q]) => [name, q])
    ]
    const detalle = [
      ['Fecha', 'Pedido', 'Canal', 'Producto', 'Tono', 'Cantidad', 'Precio', 'Precio c/u ($)', 'Cliente', 'Monto', 'Moneda'],
      ...rows.map((r) => [
        new Date(r.created_at).toLocaleDateString('es-VE'),
        r.code,
        CHANNEL_LABEL[r.channel],
        r.product_name,
        r.tone || '—',
        r.qty,
        r.wholesale ? 'Mayor' : 'Detal',
        r.unit_usd,
        r.customer,
        r.amount,
        CURRENCY_LABEL[r.currency]
      ])
    ]
    const wsDetalle = XLSX.utils.aoa_to_sheet(detalle)
    wsDetalle['!cols'] = [{ wch: 11 }, { wch: 10 }, { wch: 9 }, { wch: 30 }, { wch: 20 }, { wch: 9 }, { wch: 8 }, { wch: 13 }, { wch: 22 }, { wch: 12 }, { wch: 11 }]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
    wsResumen['!cols'] = [{ wch: 40 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
    XLSX.writeFile(wb, `Ventas Twins Beauty ${monthLabelCap}.xlsx`)
  }

  return (
    <>
      <PageTitle title="Reportes" subtitle="Lo vendido de verdad: pedidos ya pagados o entregados, mes por mes, venta por venta." />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="a-label">
          Mes
          <input className="a-field" type="month" value={month} onChange={(e) => setMonth(e.target.value)} max={monthKey(new Date().toISOString())} />
        </label>
        <button type="button" className="a-btn-dark h-11" onClick={download} disabled={!orders || sold.length === 0}>
          <Icon name="download" size={16} /> Descargar Excel
        </button>
      </div>

      {loading && !orders && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {orders && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="a-card flex flex-col gap-0.5 p-4">
              <span className="text-xs font-semibold text-muted">Total vendido en {monthLabel}</span>
              <p className="text-2xl font-bold">{usd(totalUsd)}</p>
              <span className="text-xs text-muted">Sumado en dólares; abajo sale cada venta en su moneda real.</span>
            </div>
            <div className="a-card flex flex-col gap-0.5 p-4">
              <span className="text-xs font-semibold text-muted">Pedidos vendidos</span>
              <p className="text-2xl font-bold">{sold.length}</p>
              <span className="text-xs text-muted">{units} unidades en total</span>
            </div>
            <div className="a-card flex flex-col gap-1 p-4">
              <span className="text-xs font-semibold text-muted">Lo más vendido</span>
              {top.length === 0 ? (
                <span className="text-sm text-muted">—</span>
              ) : (
                top.slice(0, 3).map(([name, q]) => (
                  <span key={name} className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{name}</span>
                    <span>{q}</span>
                  </span>
                ))
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="a-card p-6 text-sm text-muted">No hay ventas pagadas o entregadas en {monthLabel}.</div>
          ) : (
            <div className="a-card overflow-x-auto p-0">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-4 py-3 font-semibold">Pedido</th>
                    <th className="px-4 py-3 font-semibold">Canal</th>
                    <th className="px-4 py-3 font-semibold">Producto</th>
                    <th className="px-4 py-3 font-semibold">Tono</th>
                    <th className="px-4 py-3 text-right font-semibold">Cant.</th>
                    <th className="px-4 py-3 font-semibold">Precio</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 text-right font-semibold">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted">{r.code}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">{r.channel === 'externa' ? <span className="rounded-md bg-sand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Externa</span> : 'Tienda'}</td>
                      <td className="px-4 py-2.5 font-semibold">{r.product_name}</td>
                      <td className="px-4 py-2.5 text-muted">{r.tone || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{r.qty}</td>
                      <td className="px-4 py-2.5">{r.wholesale ? 'Mayor' : 'Detal'}</td>
                      <td className="px-4 py-2.5">{r.customer}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold">{fmtFor[r.currency](r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}

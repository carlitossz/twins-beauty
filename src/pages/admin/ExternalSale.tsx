import { useMemo, useState } from 'react'
import { Icon, ProductImage, Spinner, ToneDot } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, hasTones, usd } from '../../lib/format'
import { priceCart } from '../../lib/pricing'
import { useAsync, useSettings } from '../../lib/store'
import type { Currency, Product, Variant } from '../../lib/types'
import { ErrorBox, PageTitle } from './shared'

const CURRENCY_LABEL: Record<Currency, string> = { USD: 'Dólares', BS: 'Bolívares', COP: 'Pesos' }

interface Line {
  variant_id: string
  product_name: string
  tone: string
  hex: string
  image_url: string | null
  price: number
  price_wholesale: number | null
  qty: number
}

export default function ExternalSale() {
  const { data: products, error, loading, reload } = useAsync(() => api.listProducts({ includeInactive: true }))
  const { settings } = useSettings()
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [customerName, setCustomerName] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  // null = se decide solo por la cantidad, igual que en la tienda
  const [wholesaleChoice, setWholesaleChoice] = useState<boolean | null>(null)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState<{ code: string } | null>(null)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (products ?? []).filter((p) => !q || `${p.name} ${p.variants.map((v) => v.name).join(' ')}`.toLowerCase().includes(q))
  }, [products, search])

  const min = settings?.wholesale_min ?? 0
  const auto = priceCart(lines, min)
  const wholesale = wholesaleChoice ?? auto.wholesale
  const pricing = priceCart(lines, min, wholesale)

  function add(p: Product, v: Variant) {
    setLines((c) => {
      const found = c.find((i) => i.variant_id === v.id)
      if ((found?.qty ?? 0) >= v.stock) return c
      if (found) return c.map((i) => (i.variant_id === v.id ? { ...i, qty: i.qty + 1 } : i))
      return [...c, { variant_id: v.id, product_name: p.name, tone: v.name, hex: v.hex, image_url: v.image_url ?? p.image_url, price: p.price, price_wholesale: p.price_wholesale, qty: 1 }]
    })
  }

  function bump(variantId: string, delta: number) {
    const stock = products?.flatMap((p) => p.variants).find((v) => v.id === variantId)?.stock ?? Infinity
    setLines((c) => c.map((i) => (i.variant_id === variantId ? { ...i, qty: Math.min(stock, i.qty + delta) } : i)).filter((i) => i.qty > 0))
  }

  async function submit() {
    if (!lines.length) return setFormError('Agrega al menos un producto a la venta.')
    setFormError('')
    setSending(true)
    try {
      const result = await api.createExternalSale({
        customer_name: customerName,
        currency,
        payment_method: paymentMethod,
        notes,
        wholesale,
        items: lines.map((i) => ({ variant_id: i.variant_id, qty: i.qty }))
      })
      setDone({ code: result.code })
      setLines([])
      setCustomerName('')
      setPaymentMethod('')
      setNotes('')
      setWholesaleChoice(null)
      reload()
    } catch (e) {
      setFormError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const title = <PageTitle title="Ventas externas" subtitle="Registra ventas que pasaron fuera de la app (en persona, por Instagram…), para que descuenten stock y salgan en Reportes." />

  if (done) {
    return (
      <>
        {title}
        <div className="a-card flex flex-col items-start gap-3 p-6">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-blush">
            <Icon name="check" size={22} />
          </span>
          <div>
            <p className="font-bold">Venta registrada como {done.code}</p>
            <p className="text-sm text-muted">El stock ya quedó descontado y la venta sale en Reportes de una vez.</p>
          </div>
          <button type="button" className="a-btn-dark" onClick={() => setDone(null)}>
            <Icon name="plus" size={16} /> Registrar otra venta
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {title}
      {loading && !products && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {products && (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <label className="a-label">
              Buscar producto o tono
              <span className="relative">
                <input className="a-field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej. Halo Glow, Wild Cherry…" />
                <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              </span>
            </label>
            <div className="flex flex-col gap-2">
              {shown.length === 0 && <p className="a-card p-4 text-sm text-muted">No se encontró ningún producto.</p>}
              {shown.map((p) => (
                <Picker key={p.id} product={p} open={openId === p.id} onToggle={() => setOpenId((id) => (id === p.id ? null : p.id))} onAdd={add} lines={lines} />
              ))}
            </div>
          </div>

          <div className="a-card flex w-full flex-col gap-4 p-4 lg:sticky lg:top-6 lg:w-[370px] lg:shrink-0">
            <h2 className="font-bold">Venta en curso</h2>
            {lines.length === 0 ? (
              <p className="text-sm text-muted">Todavía no has agregado productos.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lines.map((i, k) => (
                  <li key={i.variant_id} className="flex items-center gap-2 rounded-xl border border-line p-2">
                    <ProductImage src={i.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.product_name}</p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                        {i.tone && <ToneDot hex={i.hex} size={10} />}
                        {i.tone ? `${i.tone} · ` : ''}
                        {usd(pricing.unit[k])} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="Restar" className="grid h-8 w-8 place-items-center rounded-full border border-line2" onClick={() => bump(i.variant_id, -1)}>
                        <Icon name="minus" size={12} />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{i.qty}</span>
                      <button type="button" aria-label="Sumar" className="grid h-8 w-8 place-items-center rounded-full border border-line2" onClick={() => bump(i.variant_id, 1)}>
                        <Icon name="plus" size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {lines.some((l) => l.price_wholesale != null) && (
              <label className="flex items-center gap-3 rounded-xl bg-blush/70 px-3 py-2.5 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5 accent-cocoa" checked={wholesale} onChange={(e) => setWholesaleChoice(e.target.checked)} />
                Cobrar con precio al mayor
                {min > 0 && wholesaleChoice === null && <span className="ml-auto text-xs font-medium">{auto.wholesale ? 'llegó al mínimo' : `mínimo ${min}`}</span>}
              </label>
            )}

            {lines.length > 0 && (
              <div className="flex items-baseline justify-between border-t border-dashed border-line2 pt-3">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-xl font-bold">{usd(pricing.total)}</span>
              </div>
            )}

            <label className="a-label">
              Cliente (opcional)
              <input className="a-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ej. María, o vacío si no aplica" />
            </label>
            <label className="a-label">
              Moneda en que se cobró
              <span className="relative">
                <select className="a-select" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                  {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABEL[c]}
                    </option>
                  ))}
                </select>
                <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </span>
            </label>
            <label className="a-label">
              Forma de pago (opcional)
              <input className="a-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Ej. Efectivo, Pago móvil…" />
            </label>
            <label className="a-label">
              Notas (opcional)
              <textarea className="a-field h-16 py-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. vendido en persona" />
            </label>
            <p className="text-xs text-muted">Se usan los precios actuales de cada producto. La venta queda guardada como pagada y descuenta el stock de una vez.</p>
            {formError && <p className="text-sm font-semibold text-[#8A2B1E]">{formError}</p>}
            <button type="button" className="a-btn-dark h-11" disabled={sending || lines.length === 0} onClick={submit}>
              {sending ? <Spinner light /> : <Icon name="check" size={16} />} Registrar venta
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Picker({ product: p, open, onToggle, onAdd, lines }: { product: Product; open: boolean; onToggle: () => void; onAdd: (p: Product, v: Variant) => void; lines: Line[] }) {
  const withTones = hasTones(p)
  const left = (v: Variant) => v.stock - (lines.find((l) => l.variant_id === v.id)?.qty ?? 0)
  const single = !withTones ? p.variants[0] : undefined
  return (
    <div className="a-card overflow-hidden">
      <div className="flex items-center gap-3 p-2.5">
        <ProductImage src={p.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{p.name}</p>
          <p className="text-xs text-muted">
            {usd(p.price)}
            {p.price_wholesale != null && ` · mayor ${usd(p.price_wholesale)}`}
          </p>
        </div>
        {single ? (
          <button type="button" disabled={left(single) <= 0} onClick={() => onAdd(p, single)} className="a-btn h-9 shrink-0 px-3 disabled:opacity-40">
            <Icon name="plus" size={14} /> {left(single) > 0 ? `${left(single)} disp.` : 'Agotado'}
          </button>
        ) : (
          <button type="button" aria-expanded={open} onClick={onToggle} className="a-btn h-9 shrink-0 px-3">
            Tonos <Icon name="chevron" size={14} className={open ? 'rotate-180' : ''} />
          </button>
        )}
      </div>
      {open && withTones && (
        <div className="flex flex-wrap gap-1.5 border-t border-line p-3">
          {p.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={left(v) <= 0}
              onClick={() => onAdd(p, v)}
              className="flex items-center gap-1.5 rounded-full border border-line2 bg-white py-1 pl-1 pr-2.5 text-xs font-semibold disabled:opacity-30"
            >
              <ToneDot hex={v.hex} size={18} />
              {v.name}
              <span className="font-normal text-muted">{left(v) > 0 ? left(v) : '0'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

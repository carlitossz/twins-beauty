import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ShopShell } from '../../components/ShopLayout'
import { BackButton, Icon, PaymentDetailsBox, Spinner, ToneDot } from '../../components/ui'
import { api } from '../../lib/api'
import { amountIn, convert, errorMessage, hoursText, money, usd } from '../../lib/format'
import { useCart, useSettings } from '../../lib/store'
import type { Currency, Delivery } from '../../lib/types'
import { orderMessage } from '../../lib/whatsapp'

export const LAST_ORDER_KEY = 'twins-last-order'

/** El monto como se escribe en la app del banco: sin símbolo, con coma decimal en Bs. null si no hay tasa cargada */
export function bankAmount(currency: Currency, t: { usd: number; bs: number | null; cop: number | null }) {
  if (currency === 'BS') return t.bs != null ? t.bs.toFixed(2).replace('.', ',') : null
  if (currency === 'COP') return t.cop != null ? String(Math.round(t.cop)) : null
  return t.usd.toFixed(2)
}
const CUSTOMER_KEY = 'twins-customer'

interface SavedCustomer {
  name?: string
  phone?: string
  address?: string
  idNumber?: string
  state?: string
  city?: string
  agency?: string
}

function readCustomer(): SavedCustomer {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}') as SavedCustomer
  } catch {
    return {}
  }
}

export default function Checkout() {
  const cart = useCart()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const saved = readCustomer()
  const [name, setName] = useState(saved.name ?? '')
  const [phone, setPhone] = useState(saved.phone ?? '')
  const [delivery, setDelivery] = useState<Delivery>('pickup')
  const [address, setAddress] = useState(saved.address ?? '')
  const [idNumber, setIdNumber] = useState(saved.idNumber ?? '')
  const [state, setState] = useState(saved.state ?? '')
  const [city, setCity] = useState(saved.city ?? '')
  const [agency, setAgency] = useState(saved.agency ?? '')
  const [method, setMethod] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const detailsRef = useRef<HTMLDivElement>(null)

  // Al elegir un método de pago, la pantalla baja sola hasta sus datos
  useEffect(() => {
    if (!method) return
    const t = setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30)
    return () => clearTimeout(t)
  }, [method])

  useEffect(() => {
    setError('')
  }, [name, phone, delivery, address, idNumber, state, city, agency, method, cashAmount])

  if (cart.items.length === 0 && !sending) return <Navigate to="/carrito" replace />

  const methods = settings?.payment_methods.filter((m) => m.enabled) ?? []
  const selected = methods.find((m) => m.name === method)
  const totals = convert(cart.pricing.total, { bs_rate: settings?.bs_rate ?? null, cop_rate: settings?.cop_rate ?? null })
  const currency = selected?.currency ?? 'USD'
  const total = money(currency, totals)
  const totalInCurrency = amountIn(currency, totals)
  const cashNum = cashAmount.trim() === '' ? null : Number(cashAmount)
  const changeDue = cashNum != null && cashNum >= totalInCurrency ? cashNum - totalInCurrency : null
  const agencies = settings?.agencies ?? []
  const extraNote = delivery === 'delivery' ? ' · delivery aparte' : delivery === 'envio' ? ' · envío aparte' : ''

  const options: [Delivery, string, string, 'pin' | 'home' | 'truck'][] = [
    ['pickup', 'Retiro personal', settings?.pickup_info || 'Acordamos el punto de entrega', 'pin'],
    ['delivery', 'Delivery en la ciudad', settings?.delivery_info || 'Te lo llevamos a tu casa', 'home'],
    ['envio', 'Envío nacional', settings?.shipping_info || 'A cualquier estado por agencia', 'truck']
  ]

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !phone.trim()) return setError('Escribe tu nombre y tu WhatsApp.')
    if (delivery === 'delivery' && !address.trim()) return setError('Escribe la dirección de entrega.')
    if (delivery === 'envio' && (!idNumber.trim() || !state.trim() || !city.trim() || !agency.trim())) return setError('Para el envío necesitamos tu cédula, estado, ciudad y agencia.')
    if (!selected) return setError('Elige cómo vas a pagar.')
    if (selected.cash && cashNum != null && cashNum < totalInCurrency) return setError('Ese monto no alcanza para cubrir el total.')

    const order = {
      customer_name: name,
      customer_phone: phone,
      delivery,
      address: delivery === 'delivery' ? address : '',
      id_number: delivery === 'envio' ? idNumber : '',
      state: delivery === 'envio' ? state : '',
      city: delivery === 'envio' ? city : '',
      agency: delivery === 'envio' ? agency : '',
      payment_method: selected.name,
      items: cart.items.map((i) => ({ variant_id: i.variant_id, qty: i.qty })),
      cash_amount: selected.cash ? cashNum : null
    }

    setSending(true)
    try {
      const result = await api.createOrder(order)
      const message = orderMessage({
        storeName: settings?.store_name ?? 'Twins Beauty',
        result,
        items: cart.items.map((i, k) => ({ name: i.name, tone: i.tone, qty: i.qty, unit: cart.pricing.unit[k] })),
        order
      })
      const done = {
        code: result.code,
        message,
        total: money(result.currency, { usd: result.total_usd, bs: result.total_bs, cop: result.total_cop }),
        saving: result.wholesale ? usd(result.retail_usd - result.total_usd) : null,
        payment: selected.name,
        paymentAmount: bankAmount(result.currency, { usd: result.total_usd, bs: result.total_bs, cop: result.total_cop }),
        paymentCash: selected.cash,
        customerName: name.trim(),
        reserveHours: settings?.reserve_hours ?? 0
      }
      try {
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim(), idNumber: idNumber.trim(), state: state.trim(), city: city.trim(), agency: agency.trim() }))
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(done))
      } catch {
        /* sin almacenamiento */
      }
      cart.clear()
      navigate(`/pedido/${result.code}`, { replace: true, state: done })
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <ShopShell header="desktop">
      <header className="flex items-center gap-3 px-5 pb-2 pt-4 lg:pb-4 lg:pt-8">
        <span>
        <BackButton to="/carrito" label="Volver al carrito" />
        </span>
        <h1 className="text-[22px] font-bold lg:text-[32px]">Finalizar pedido</h1>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-7 px-5 pb-48 pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-10 lg:pb-16" noValidate>
        {/* Resumen: arriba en teléfono (con el botón fijo abajo); a la derecha y fijo en computadora */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:order-2">
          <section className="rounded-[20px] bg-white px-4 py-1 lg:px-6 lg:py-3">
          <h2 className="hidden pt-3 text-lg font-bold lg:block">Tu pedido</h2>
            {cart.items.map((i, k) => (
              <div key={i.variant_id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold">
                    {i.qty}× {i.name}
                  </span>
                  {i.tone && (
                    <span className="flex items-center gap-1.5 text-xs">
                      <ToneDot hex={i.hex} size={10} /> {i.tone}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold">{usd(cart.pricing.unit[k] * i.qty)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              {cart.pricing.wholesale ? <span className="text-xs font-semibold">Precio al mayor aplicado</span> : <span />}
              <Link to="/carrito" className="text-xs font-semibold underline">
                Cambiar
              </Link>
            </div>
          </section>
          <div className="fixed inset-x-0 bottom-0 z-10 lg:static lg:z-auto">
            <div className="mx-auto flex max-w-[34rem] flex-col gap-2.5 rounded-t-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(109,82,71,0.10)] lg:max-w-none lg:rounded-[28px] lg:p-6 lg:shadow-none">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs">
                  {cart.count} {cart.count === 1 ? 'producto' : 'productos'}
                  {extraNote}
                </span>
                <span className="text-[24px] font-bold">{total}</span>
              </div>
              <button type="submit" disabled={sending} className="btn-primary w-full">
                {sending ? <Spinner light /> : <Icon name="wa" />}
                {sending ? 'Apartando tus productos…' : 'Confirmar pedido'}
              </button>
              {!!settings?.reserve_hours && <p className="text-center text-[11px]">Te apartamos los productos por {hoursText(settings.reserve_hours)} mientras confirmas el pago.</p>}
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-7 lg:order-1">

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-3 text-[15px] font-bold">1 · ¿Cómo lo recibes?</legend>
            {options.map(([value, label, hint, icon]) => (
              <label key={value} className={`flex cursor-pointer items-center gap-3.5 rounded-[20px] border-2 bg-white px-4 py-3.5 ${delivery === value ? 'border-cocoa' : 'border-transparent'}`}>
                <input type="radio" name="delivery" value={value} checked={delivery === value} onChange={() => setDelivery(value)} className="sr-only" />
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${delivery === value ? 'bg-cocoa text-cream' : 'bg-sand'}`}>
                  <Icon name={icon} size={18} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs leading-snug">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-[15px] font-bold">2 · Tus datos</legend>
            <label className="label">
              Nombre y apellido
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ej. María Pérez" />
            </label>
            <label className="label">
              Teléfono (WhatsApp)
              <input className="field" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="0414 000 0000" />
            </label>
            {delivery === 'delivery' && (
              <label className="label animate-reveal">
                Dirección de entrega
                <input className="field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Sector, calle, punto de referencia" autoComplete="street-address" />
              </label>
            )}
            {delivery === 'envio' && (
              <div className="animate-reveal flex flex-col gap-3">
                <label className="label">
                  Cédula
                  <input className="field" inputMode="numeric" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="V-00.000.000" />
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="label">
                    Estado
                    <input className="field" value={state} onChange={(e) => setState(e.target.value)} placeholder="Ej. Mérida" autoComplete="address-level1" />
                  </label>
                  <label className="label">
                    Ciudad
                    <input className="field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej. El Vigía" autoComplete="address-level2" />
                  </label>
                </div>
                {agencies.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold">Agencia</span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Agencia de envío">
                      {agencies.map((a) => {
                        const on = agency.split(' · ')[0] === a
                        return (
                          <button key={a} type="button" aria-pressed={on} onClick={() => setAgency(a)} className={`chip ${on ? 'chip-on' : ''}`}>
                            {a}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <label className="label">
                  {agencies.length > 0 ? 'Oficina de la agencia (dirección o nombre)' : 'Agencia y oficina de envío'}
                  <input
                    className="field"
                    value={agencies.length > 0 ? agency.split(' · ').slice(1).join(' · ') : agency}
                    onChange={(e) => {
                      const office = e.target.value
                      if (agencies.length > 0) {
                        const base = agency.split(' · ')[0] || ''
                        setAgency(office ? `${base} · ${office}` : base)
                      } else setAgency(office)
                    }}
                    placeholder={agencies.length > 0 ? 'Ej. Oficina centro' : 'Ej. MRW, oficina centro'}
                  />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-[15px] font-bold">3 · ¿Cómo pagas?</legend>
            {!settings ? (
              <Spinner />
            ) : (
              <div className="flex flex-wrap gap-2">
                {methods.map((m) => (
                  <label key={m.name} className={`chip cursor-pointer ${method === m.name ? 'chip-on' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value={m.name}
                      checked={method === m.name}
                      onChange={() => {
                        setMethod(m.name)
                        if (!m.cash) setCashAmount('')
                      }}
                      className="sr-only"
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            )}
            {selected && (
              <div key={method} ref={detailsRef} className="animate-reveal scroll-mt-4">
                {selected.cash ? (
                  <div className="flex flex-col gap-2 rounded-[20px] bg-white p-4">
                    <span className="text-sm font-semibold">¿Vas a pagar con billete grande?</span>
                    <span className="text-xs">Escribe con cuánto pagas y te preparamos el vuelto. Si pagas exacto, déjalo vacío.</span>
                    <input className="field" type="number" inputMode="decimal" min="0" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder={`Total: ${total}`} />
                    {changeDue != null && changeDue > 0 && (
                      <span className="rounded-2xl bg-blush px-3 py-2 text-sm font-semibold">Te devolvemos {money(selected.currency, { usd: changeDue, bs: changeDue, cop: changeDue })} de vuelto.</span>
                    )}
                  </div>
                ) : (
                  <PaymentDetailsBox name={selected.name} note={selected.note} fields={selected.fields} cash={selected.cash} amount={bankAmount(selected.currency, totals)} />
                )}
              </div>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="rounded-2xl border border-[#E8B4A8] bg-[#FBE3DE] px-4 py-3 text-sm font-semibold text-[#8A2B1E]">
              {error}
            </p>
          )}

        </div>
      </form>
    </ShopShell>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { Icon, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { resetDemo } from '../../lib/demoApi'
import { digits, errorMessage, hoursText } from '../../lib/format'
import { useSettings } from '../../lib/store'
import type { Currency, PaymentMethod, Settings } from '../../lib/types'
import { ErrorBox, PageTitle, Toast, useConfirm } from './shared'

const CURRENCY_LABEL: Record<Currency, string> = { USD: 'Dólares', BS: 'Bolívares', COP: 'Pesos' }

export default function SettingsPage() {
  const { settings, reload } = useSettings()
  const [form, setForm] = useState<Settings | null>(settings)
  const [newAgency, setNewAgency] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    if (settings && !form) setForm(settings)
  }, [settings, form])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  if (!form)
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const setMethod = (i: number, patch: Partial<PaymentMethod>) => set('payment_methods', form.payment_methods.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  const addField = (i: number) => setMethod(i, { fields: [...form.payment_methods[i].fields, { label: '', value: '', copyable: true }] })
  const setField = (i: number, k: number, patch: Partial<PaymentMethod['fields'][number]>) =>
    setMethod(i, { fields: form.payment_methods[i].fields.map((f, j) => (j === k ? { ...f, ...patch } : f)) })
  const removeField = (i: number, k: number) => setMethod(i, { fields: form.payment_methods[i].fields.filter((_, j) => j !== k) })

  function addAgency() {
    const a = newAgency.trim()
    if (a && !form!.agencies.includes(a)) set('agencies', [...form!.agencies, a])
    setNewAgency('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const methods = form.payment_methods.filter((m) => m.name.trim())
    if (!methods.some((m) => m.enabled)) return setError('Deja al menos un método de pago activo.')
    if (new Set(methods.map((m) => m.name.trim())).size !== methods.length) return setError('Hay dos métodos de pago con el mismo nombre.')
    setSaving(true)
    setError('')
    try {
      await api.saveSettings({
        ...form,
        whatsapp: digits(form.whatsapp),
        payment_methods: methods.map((m) => ({ ...m, name: m.name.trim(), fields: m.fields.filter((f) => f.label.trim() || f.value.trim()) }))
      })
      await reload()
      setToast('Ajustes guardados')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const rateField = (key: 'bs_rate' | 'cop_rate', label: string, hint: string) => (
    <label className="a-label">
      {label}
      <input
        className="a-field"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={form[key] ?? ''}
        onChange={(e) => set(key, e.target.value === '' ? null : Number(e.target.value))}
        placeholder={hint}
      />
    </label>
  )

  return (
    <form onSubmit={submit} noValidate>
      <PageTitle title="Ajustes" subtitle="Lo que ven las clientas al hacer su pedido." />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="a-card flex flex-col gap-3 p-4">
          <h2 className="font-bold">Tienda</h2>
          <label className="a-label">
            Nombre de la tienda
            <input className="a-field" value={form.store_name} onChange={(e) => set('store_name', e.target.value)} />
          </label>
          <label className="a-label">
            WhatsApp donde llegan los pedidos
            <input className="a-field" type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="584141234567" />
            <span className="font-normal text-muted">Con código de país y sin espacios: 58 para Venezuela (ej. 584141234567).</span>
          </label>
          {!digits(form.whatsapp) && <p className="rounded-xl bg-blush px-3 py-2 text-xs font-semibold">Falta el número: sin él, la clienta tiene que elegir a quién enviar el pedido.</p>}
          {rateField('bs_rate', 'Tasa del día (bolívares por 1 dólar)', 'Vacío = se muestra el precio en $')}
          {rateField('cop_rate', 'Tasa en pesos (pesos por 1 dólar, opcional)', 'Vacío = no se calcula en pesos')}
        </section>

        <section className="a-card flex flex-col gap-3 p-4">
          <h2 className="font-bold">Precio al mayor</h2>
          <label className="a-label">
            Productos para precio al mayor
            <input
              className="a-field text-base font-semibold"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={form.wholesale_min}
              onChange={(e) => set('wholesale_min', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            />
            <span className="font-normal text-muted">
              {form.wholesale_min > 0
                ? `Si la clienta lleva ${form.wholesale_min} productos o más (se pueden mezclar), los que tienen precio al mayor se le cobran al mayor. Los que solo se venden al detal no cuentan.`
                : 'Con 0, la tienda no aplica precio al mayor.'}
            </span>
          </label>
          <h2 className="mt-2 font-bold">Apartado</h2>
          <label className="a-label">
            Horas que se apartan los productos
            <input className="a-field" type="number" inputMode="numeric" min="0" step="1" value={form.reserve_hours} onChange={(e) => set('reserve_hours', Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
            <span className="font-normal text-muted">
              {form.reserve_hours > 0
                ? `Si un pedido sigue "Por confirmar" después de ${hoursText(form.reserve_hours)}, se cancela solo y sus productos vuelven a la tienda.`
                : 'Con 0, los pedidos sin pagar quedan apartados hasta que los canceles a mano.'}
            </span>
          </label>
        </section>

        <section className="a-card flex flex-col gap-3 p-4 lg:col-span-2">
          <h2 className="font-bold">Entregas</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="a-label">
              Retiro personal
              <textarea className="a-field h-20 py-2" value={form.pickup_info} onChange={(e) => set('pickup_info', e.target.value)} />
            </label>
            <label className="a-label">
              Delivery en la ciudad
              <textarea className="a-field h-20 py-2" value={form.delivery_info} onChange={(e) => set('delivery_info', e.target.value)} />
            </label>
            <label className="a-label">
              Envío nacional
              <textarea className="a-field h-20 py-2" value={form.shipping_info} onChange={(e) => set('shipping_info', e.target.value)} />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold">Agencias de envío</span>
            <div className="flex gap-2">
              <input
                className="a-field max-w-xs"
                value={newAgency}
                onChange={(e) => setNewAgency(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAgency()
                  }
                }}
                placeholder="Ej. MRW"
              />
              <button type="button" className="a-btn shrink-0" onClick={addAgency}>
                <Icon name="plus" size={16} /> Agregar
              </button>
            </div>
            {form.agencies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.agencies.map((a) => (
                  <span key={a} className="flex items-center gap-2 rounded-full border border-line2 bg-cream py-1 pl-3 pr-1 text-sm font-semibold">
                    {a}
                    <button type="button" aria-label={`Quitar ${a}`} className="grid h-6 w-6 place-items-center rounded-full text-[#8A2B1E] hover:bg-[#FBE3DE]" onClick={() => set('agencies', form.agencies.filter((x) => x !== a))}>
                      <Icon name="x" size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted">Sin agencias en la lista: la clienta escribe la agencia y la oficina a mano.</span>
            )}
          </div>
        </section>

        <section className="a-card flex flex-col gap-3 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Métodos de pago</h2>
            <button type="button" className="a-btn h-9" onClick={() => set('payment_methods', [...form.payment_methods, { name: '', currency: 'USD', note: '', fields: [], enabled: true, cash: false }])}>
              <Icon name="plus" size={16} /> Agregar
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {form.payment_methods.map((m, i) => (
              <div key={i} className={`flex flex-col gap-2 rounded-xl border p-3 ${m.enabled ? 'border-line' : 'border-dashed border-line2 bg-cream/50'}`}>
                <div className="grid gap-2 sm:grid-cols-[auto_1fr_150px_auto] sm:items-center">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" className="h-5 w-5 accent-cocoa" checked={m.enabled} onChange={(e) => setMethod(i, { enabled: e.target.checked })} />
                    <span className="sm:sr-only">Activo</span>
                  </label>
                  <input className="a-field" aria-label="Nombre del método" value={m.name} onChange={(e) => setMethod(i, { name: e.target.value })} placeholder="Nombre, ej. Pago móvil" />
                  <span className="relative">
                    <select className="a-select" aria-label="Moneda" value={m.currency} onChange={(e) => setMethod(i, { currency: e.target.value as Currency })}>
                      {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
                        <option key={c} value={c}>
                          {CURRENCY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                  </span>
                  <button
                    type="button"
                    aria-label={`Quitar ${m.name || 'método'}`}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-line2 text-[#8A2B1E]"
                    onClick={() => set('payment_methods', form.payment_methods.filter((_, j) => j !== i))}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                <label className="a-label">
                  Nota (opcional)
                  <input className="a-field" value={m.note} onChange={(e) => setMethod(i, { note: e.target.value })} placeholder='Ej. "A la tasa del día"' />
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold">Datos para pagar</span>
                  {m.fields.map((f, k) => (
                    <div key={k} className="grid grid-cols-[1fr_1.4fr_auto_auto] items-center gap-1.5">
                      <input className="a-field" aria-label="Etiqueta" value={f.label} onChange={(e) => setField(i, k, { label: e.target.value })} placeholder="Ej. Teléfono" />
                      <input className="a-field" aria-label="Valor" value={f.value} onChange={(e) => setField(i, k, { value: e.target.value })} placeholder="Ej. 0414-1234567" />
                      <label className="flex items-center gap-1 text-[11px] font-semibold" title="¿La clienta lo puede copiar con un botón?">
                        <input type="checkbox" className="h-4 w-4 accent-cocoa" checked={f.copyable} onChange={(e) => setField(i, k, { copyable: e.target.checked })} />
                        Copiable
                      </label>
                      <button type="button" aria-label={`Quitar dato ${f.label || k + 1}`} className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-[#8A2B1E]" onClick={() => removeField(i, k)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="a-btn h-9 self-start" onClick={() => addField(i)}>
                    <Icon name="plus" size={14} /> Agregar dato
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" className="h-4 w-4 accent-cocoa" checked={m.cash} onChange={(e) => setMethod(i, { cash: e.target.checked })} />
                  Es efectivo en mano (la clienta puede decir con cuánto paga, para preparar el vuelto)
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            Marca "Copiable" solo en los datos que la clienta de verdad va a pegar en otro lado (teléfono, cédula, número de cuenta). El nombre del banco o del titular se deja sin marcar:
            se ve, pero sin botón de copiar.
          </p>
        </section>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {api.mode === 'demo' ? (
          <button
            type="button"
            className="a-btn text-[#8A2B1E]"
            onClick={async () => {
              if (await confirm('¿Borrar los pedidos de prueba y volver al catálogo inicial?', 'Sí, reiniciar')) {
                resetDemo()
                window.location.reload()
              }
            }}
          >
            Reiniciar datos de prueba
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={saving} className="a-btn-dark h-12 px-6 text-base">
          {saving ? 'Guardando…' : 'Guardar ajustes'}
        </button>
      </div>
      <Toast text={toast} />
      {dialog}
    </form>
  )
}

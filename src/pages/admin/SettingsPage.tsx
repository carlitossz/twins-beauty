import { useEffect, useState, type ReactNode } from 'react'
import { Icon, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { resetDemo } from '../../lib/demoApi'
import { bs, digits, errorMessage, hoursText } from '../../lib/format'
import { useSettings } from '../../lib/store'
import type { Currency, PaymentMethod, Settings } from '../../lib/types'
import { ErrorBox, PageTitle, Toast, useConfirm } from './shared'

// Ajustes pensados para alguien que no es "de sistemas": una lista corta de secciones,
// cada una se abre sola con pocas casillas y su propio botón de guardar.
// La tasa del día va arriba de todo porque es lo que más se cambia.

type View = 'lista' | 'whatsapp' | 'pagos' | 'mayor' | 'entregas' | 'otros' | { pago: number }

const CURRENCY_LABEL: Record<Currency, string> = { USD: 'Dólares', BS: 'Bolívares', COP: 'Pesos' }

export default function SettingsPage() {
  const { settings, reload } = useSettings()
  const [form, setForm] = useState<Settings | null>(settings)
  const [view, setView] = useState<View>('lista')
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

  // Al cambiar de sección, arriba de todo y sin errores viejos
  useEffect(() => {
    setError('')
    window.scrollTo({ top: 0 })
  }, [view])

  if (!form)
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  /** Guarda todo el formulario. Si sale bien, avisa y (si se pide) vuelve a la lista */
  async function save(next: Settings = form!, message = 'Guardado', back = true): Promise<boolean> {
    const methods = next.payment_methods.filter((m) => m.name.trim())
    if (!methods.some((m) => m.enabled)) {
      setError('Deja al menos un método de pago prendido.')
      return false
    }
    if (new Set(methods.map((m) => m.name.trim().toLowerCase())).size !== methods.length) {
      setError('Hay dos métodos de pago con el mismo nombre.')
      return false
    }
    setSaving(true)
    setError('')
    try {
      const clean: Settings = {
        ...next,
        whatsapp: digits(next.whatsapp),
        payment_methods: methods.map((m) => ({ ...m, name: m.name.trim(), fields: m.fields.filter((f) => f.label.trim() || f.value.trim()) }))
      }
      await api.saveSettings(clean)
      setForm(clean)
      await reload()
      setToast(message)
      if (back) setView('lista')
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  const enabled = form.payment_methods.filter((m) => m.enabled && m.name.trim())

  // ---------- Lista principal ----------
  if (view === 'lista') {
    return (
      <>
        <PageTitle title="Ajustes" subtitle="Toca una sección para cambiarla." />
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <RateCard form={form} saving={saving} onSave={(rate) => save({ ...form, bs_rate: rate }, 'Tasa del día guardada', false)} />

          {error && <ErrorBox message={error} />}

          <div className="a-card divide-y divide-line overflow-hidden">
            <Row
              icon="wa"
              title="WhatsApp de la tienda"
              summary={digits(form.whatsapp) ? `+${digits(form.whatsapp)}` : 'Falta el número: los pedidos no tienen a dónde llegar'}
              warn={!digits(form.whatsapp)}
              onClick={() => setView('whatsapp')}
            />
            <Row icon="card" title="Métodos de pago" summary={enabled.length ? `${enabled.map((m) => m.name).join(', ')}` : 'Ninguno prendido'} warn={!enabled.length} onClick={() => setView('pagos')} />
            <Row icon="sparkle" title="Precio al mayor" summary={form.wholesale_min > 0 ? `Desde ${form.wholesale_min} productos` : 'Apagado'} onClick={() => setView('mayor')} />
            <Row
              icon="truck"
              title="Entregas y envíos"
              summary={`Retiro, delivery y envío nacional${form.agencies.length ? ` · ${form.agencies.join(', ')}` : ''}`}
              onClick={() => setView('entregas')}
            />
            <Row icon="gear" title="Otros ajustes" summary="Nombre de la tienda, tasa en pesos y tiempo de apartado" onClick={() => setView('otros')} />
          </div>

          {api.mode === 'demo' && (
            <button
              type="button"
              className="a-btn self-start text-[#8A2B1E]"
              onClick={async () => {
                if (await confirm('¿Borrar los pedidos de prueba y volver al catálogo inicial?', 'Sí, reiniciar')) {
                  resetDemo()
                  window.location.reload()
                }
              }}
            >
              Reiniciar datos de prueba
            </button>
          )}
        </div>
        <Toast text={toast} />
        {dialog}
      </>
    )
  }

  // ---------- Editar un método de pago ----------
  if (typeof view === 'object') {
    const i = view.pago
    const m = form.payment_methods[i]
    if (!m) {
      setView('pagos')
      return null
    }
    const setM = (patch: Partial<PaymentMethod>) => set('payment_methods', form.payment_methods.map((x, j) => (j === i ? { ...x, ...patch } : x)))
    const setField = (k: number, patch: Partial<PaymentMethod['fields'][number]>) => setM({ fields: m.fields.map((f, j) => (j === k ? { ...f, ...patch } : f)) })

    return (
      <Section
        title={m.name.trim() || 'Nuevo método de pago'}
        back={() => {
          setForm(settings)
          setView('pagos')
        }}
        backLabel="Métodos de pago"
        error={error}
        saving={saving}
        onSave={async () => {
          if (!m.name.trim()) return setError('Ponle un nombre al método de pago.')
          if (await save(form, 'Método de pago guardado', false)) setView('pagos')
        }}
        extra={
          <button
            type="button"
            className="a-btn text-[#8A2B1E]"
            onClick={async () => {
              if (!(await confirm(`¿Quitar "${m.name || 'este método'}"? Las clientas ya no lo verán.`, 'Sí, quitar'))) return
              const next = { ...form, payment_methods: form.payment_methods.filter((_, j) => j !== i) }
              if (await save(next, 'Método quitado', false)) setView('pagos')
            }}
          >
            <Icon name="trash" size={16} /> Quitar
          </button>
        }
      >
        <label className="a-label">
          Nombre
          <input className="a-field h-12 text-base" value={m.name} onChange={(e) => setM({ name: e.target.value })} placeholder="Ej. Pago móvil" />
        </label>

        <div className="a-label">
          ¿En qué moneda paga la clienta?
          <div className="flex flex-wrap gap-2" role="group" aria-label="Moneda">
            {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
              <button key={c} type="button" aria-pressed={m.currency === c} onClick={() => setM({ currency: c })} className={chip(m.currency === c)}>
                {CURRENCY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          on={m.cash}
          onChange={(v) => setM({ cash: v })}
          title="Es efectivo en mano"
          hint="La clienta puede decir con cuánto paga y le sale el vuelto que hay que llevarle."
        />

        {!m.cash && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-bold">Datos para pagar</p>
              <p className="text-xs text-muted">Lo que la clienta necesita para hacer el pago. Prende "Copiar" solo en lo que va a pegar en su banco (teléfono, cédula, cuenta).</p>
            </div>
            {m.fields.map((f, k) => (
              <div key={k} className="flex flex-col gap-2 rounded-2xl border border-line bg-cream/50 p-3">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
                  <input className="a-field" aria-label="Qué dato es" value={f.label} onChange={(e) => setField(k, { label: e.target.value })} placeholder="Ej. Teléfono" />
                  <input className="a-field font-semibold" aria-label="El dato" value={f.value} onChange={(e) => setField(k, { value: e.target.value })} placeholder="Ej. 0414-1234567" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <Switch on={f.copyable} onChange={(v) => setField(k, { copyable: v })} label={`Botón de copiar para ${f.label || 'este dato'}`} small />
                    Botón de copiar
                  </label>
                  <button type="button" className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#8A2B1E] hover:bg-[#FBE3DE]" onClick={() => setM({ fields: m.fields.filter((_, j) => j !== k) })}>
                    <Icon name="trash" size={14} /> Quitar
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-mauve text-sm font-semibold" onClick={() => setM({ fields: [...m.fields, { label: '', value: '', copyable: true }] })}>
              <Icon name="plus" size={16} /> Agregar dato
            </button>
          </div>
        )}

        <label className="a-label">
          Nota para la clienta (opcional)
          <input className="a-field" value={m.note} onChange={(e) => setM({ note: e.target.value })} placeholder='Ej. "A la tasa del día"' />
        </label>
        {dialog}
      </Section>
    )
  }

  // ---------- Lista de métodos de pago ----------
  if (view === 'pagos') {
    return (
      <Section title="Métodos de pago" back={() => setView('lista')} error={error} hideSave>
        <p className="text-sm text-muted">Prende o apaga cada método con el interruptor. Toca uno para cambiar sus datos.</p>
        <div className="flex flex-col gap-2">
          {form.payment_methods.map((m, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-2xl border p-3 ${m.enabled ? 'border-line bg-white' : 'border-dashed border-line2 bg-cream/60'}`}>
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setView({ pago: i })}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${m.enabled ? 'bg-blush' : 'bg-sand'}`}>
                  <Icon name="card" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{m.name || 'Sin nombre'}</span>
                  <span className="block truncate text-xs text-muted">
                    {CURRENCY_LABEL[m.currency]}
                    {m.cash ? ' · efectivo' : m.fields.filter((f) => f.value.trim()).length ? ` · ${m.fields.filter((f) => f.value.trim()).length} datos` : ' · faltan los datos'}
                  </span>
                </span>
              </button>
              <Switch
                on={m.enabled}
                label={`${m.enabled ? 'Apagar' : 'Prender'} ${m.name}`}
                onChange={(v) => {
                  const next = { ...form, payment_methods: form.payment_methods.map((x, j) => (j === i ? { ...x, enabled: v } : x)) }
                  void save(next, v ? `${m.name} prendido` : `${m.name} apagado`, false)
                }}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-mauve text-sm font-semibold"
          onClick={() => {
            set('payment_methods', [...form.payment_methods, { name: '', currency: 'USD', note: '', fields: [], enabled: true, cash: false }])
            setView({ pago: form.payment_methods.length })
          }}
        >
          <Icon name="plus" size={16} /> Agregar método de pago
        </button>
        <Toast text={toast} />
      </Section>
    )
  }

  // ---------- Secciones simples ----------
  const common = {
    back: () => {
      setForm(settings)
      setView('lista')
    },
    error,
    saving,
    onSave: () => void save()
  }

  if (view === 'whatsapp') {
    return (
      <Section title="WhatsApp de la tienda" {...common}>
        <p className="text-sm text-muted">A este número llegan los pedidos y las preguntas de las clientas.</p>
        <label className="a-label">
          Número con código de país
          <input className="a-field h-12 text-lg font-semibold" type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="584141234567" />
          <span className="font-normal text-muted">Para Venezuela empieza con 58 y va sin el 0. Ej.: 0414-1234567 se escribe 584141234567.</span>
        </label>
      </Section>
    )
  }

  if (view === 'mayor') {
    return (
      <Section title="Precio al mayor" {...common}>
        <Toggle on={form.wholesale_min > 0} onChange={(v) => set('wholesale_min', v ? 6 : 0)} title="Usar precio al mayor" hint="Si está apagado, todo se cobra al detal." />
        {form.wholesale_min > 0 && (
          <>
            <div className="a-label">
              ¿Desde cuántos productos?
              <Stepper value={form.wholesale_min} min={2} onChange={(v) => set('wholesale_min', v)} />
            </div>
            <p className="rounded-2xl bg-blush px-4 py-3 text-sm">
              Si la clienta lleva <b>{form.wholesale_min} productos o más</b> (puede mezclar), los que tienen precio al mayor se le cobran al mayor. Las brochas, la crema y lo que solo se vende al detal no cuentan.
            </p>
          </>
        )}
      </Section>
    )
  }

  if (view === 'entregas') {
    return (
      <Section title="Entregas y envíos" {...common}>
        <p className="text-sm text-muted">Lo que lee la clienta debajo de cada forma de entrega.</p>
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
        <Agencies list={form.agencies} onChange={(v) => set('agencies', v)} />
      </Section>
    )
  }

  // otros
  return (
    <Section title="Otros ajustes" {...common}>
      <label className="a-label">
        Nombre de la tienda
        <input className="a-field" value={form.store_name} onChange={(e) => set('store_name', e.target.value)} />
        <span className="font-normal text-muted">Sale en los mensajes de WhatsApp de los pedidos.</span>
      </label>
      <label className="a-label">
        Tasa en pesos (opcional)
        <input
          className="a-field"
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          value={form.cop_rate ?? ''}
          onChange={(e) => set('cop_rate', e.target.value === '' ? null : Number(e.target.value))}
          placeholder="Vacío = no se calcula en pesos"
        />
        <span className="font-normal text-muted">Pesos por 1 dólar. Solo hace falta si aceptas pagos en pesos.</span>
      </label>
      <div className="a-label">
        Horas que se apartan los productos de un pedido sin pagar
        <Stepper value={form.reserve_hours} min={0} max={168} onChange={(v) => set('reserve_hours', v)} />
        <span className="font-normal text-muted">
          {form.reserve_hours > 0
            ? `Si un pedido sigue "Por confirmar" después de ${hoursText(form.reserve_hours)}, se cancela solo y los productos vuelven a la tienda.`
            : 'En 0 los pedidos sin pagar quedan apartados hasta que los canceles tú.'}
        </span>
      </div>
    </Section>
  )
}

// ---------- Piezas ----------

const chip = (on: boolean) => `h-10 rounded-full border px-4 text-sm font-semibold ${on ? 'border-cocoa bg-cocoa text-cream' : 'border-line2 bg-white'}`

/** La tasa del día, siempre a mano arriba de la lista */
function RateCard({ form, saving, onSave }: { form: Settings; saving: boolean; onSave: (rate: number | null) => void }) {
  const [value, setValue] = useState(form.bs_rate != null ? String(form.bs_rate) : '')
  useEffect(() => setValue(form.bs_rate != null ? String(form.bs_rate) : ''), [form.bs_rate])
  const num = value.trim() === '' ? null : Number(value.replace(',', '.'))
  const valid = num == null || (Number.isFinite(num) && num > 0)
  const changed = num !== form.bs_rate
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-cocoa p-5 text-cream">
      <div>
        <h2 className="text-lg font-bold">Tasa del día</h2>
        <p className="text-sm text-cream/80">Con esta tasa se calculan los precios en bolívares.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-base font-semibold">1 $ =</span>
        <label className="flex h-14 min-w-0 flex-1 basis-40 items-center gap-2 rounded-2xl bg-cream px-4 text-cocoa">
          <span className="font-semibold">Bs</span>
          <input className="w-full min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none" size={6} inputMode="decimal" aria-label="Bolívares por un dólar" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
        </label>
        <button type="button" disabled={saving || !valid || !changed} onClick={() => onSave(num)} className="h-14 w-full rounded-2xl bg-blush px-5 font-bold text-cocoa disabled:opacity-50 sm:w-auto">
          {saving ? 'Guardando…' : 'Guardar tasa'}
        </button>
      </div>
      <p className="text-xs text-cream/80">{num && valid ? `Ejemplo: un producto de $10 sale en ${bs(num * 10)}.` : 'Sin tasa, a la clienta le sale el precio en dólares para pagar en Bs.'}</p>
    </section>
  )
}

function Row({ icon, title, summary, onClick, warn = false }: { icon: 'wa' | 'card' | 'sparkle' | 'truck' | 'gear'; title: string; summary: string; onClick: () => void; warn?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-cream/60">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${warn ? 'bg-[#FBE3DE] text-[#8A2B1E]' : 'bg-blush'}`}>
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className={`block truncate text-sm ${warn ? 'font-semibold text-[#8A2B1E]' : 'text-muted'}`}>{summary}</span>
      </span>
      <Icon name="chevron" size={18} className="shrink-0 -rotate-90" />
    </button>
  )
}

/** Pantalla de una sección: volver, título, casillas y botón de guardar */
function Section({
  title,
  back,
  backLabel = 'Ajustes',
  children,
  error,
  saving = false,
  onSave,
  hideSave = false,
  extra
}: {
  title: string
  back: () => void
  backLabel?: string
  children: ReactNode
  error: string
  saving?: boolean
  onSave?: () => void
  hideSave?: boolean
  extra?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-24 md:pb-0">
      <button type="button" onClick={back} className="flex h-10 items-center gap-1.5 self-start rounded-full pr-3 text-sm font-semibold hover:bg-white">
        <Icon name="back" size={18} /> {backLabel}
      </button>
      <h1 className="text-[26px] font-extrabold leading-tight">{title}</h1>
      <div className="a-card flex flex-col gap-5 p-5">{children}</div>
      {error && <ErrorBox message={error} />}
      {!hideSave && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {extra ?? <span />}
          <div className="flex gap-2">
            <button type="button" className="a-btn h-12" onClick={back}>
              Cancelar
            </button>
            <button type="button" disabled={saving} onClick={onSave} className="a-btn-dark h-12 px-6 text-base">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Switch({ on, onChange, label, small = false }: { on: boolean; onChange: (v: boolean) => void; label: string; small?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`flex shrink-0 rounded-full p-[3px] transition ${small ? 'h-6 w-10' : 'h-8 w-14'} ${on ? 'justify-end bg-cocoa' : 'justify-start bg-line2'}`}
    >
      <span className={`rounded-full bg-white shadow ${small ? 'h-[18px] w-[18px]' : 'h-[26px] w-[26px]'}`} />
    </button>
  )
}

function Toggle({ on, onChange, title, hint }: { on: boolean; onChange: (v: boolean) => void; title: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-cream/70 p-4">
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <Switch on={on} onChange={onChange} label={title} />
    </div>
  )
}

function Stepper({ value, onChange, min = 0, max = 999 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="grid h-12 w-12 place-items-center rounded-full border border-line2 bg-white disabled:opacity-30">
        <Icon name="minus" size={18} />
      </button>
      <input
        className="h-12 w-20 rounded-xl border border-line2 bg-white text-center text-xl font-bold"
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Math.floor(Number(e.target.value) || 0))))}
      />
      <button type="button" aria-label="Más" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="grid h-12 w-12 place-items-center rounded-full bg-cocoa text-cream disabled:opacity-30">
        <Icon name="plus" size={18} />
      </button>
    </div>
  )
}

function Agencies({ list, onChange }: { list: string[]; onChange: (v: string[]) => void }) {
  const [value, setValue] = useState('')
  function add() {
    const a = value.trim()
    if (a && !list.includes(a)) onChange([...list, a])
    setValue('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-bold">Agencias para envíos nacionales</p>
        <p className="text-xs text-muted">La clienta las elige con un toque. Si no pones ninguna, ella escribe la agencia.</p>
      </div>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {list.map((a) => (
            <span key={a} className="flex items-center gap-1.5 rounded-full border border-line2 bg-cream py-1 pl-3.5 pr-1 text-sm font-semibold">
              {a}
              <button type="button" aria-label={`Quitar ${a}`} className="grid h-7 w-7 place-items-center rounded-full text-[#8A2B1E] hover:bg-[#FBE3DE]" onClick={() => onChange(list.filter((x) => x !== a))}>
                <Icon name="x" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="a-field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Ej. MRW"
          aria-label="Nueva agencia"
        />
        <button type="button" className="a-btn shrink-0" onClick={add}>
          <Icon name="plus" size={16} /> Agregar
        </button>
      </div>
    </div>
  )
}

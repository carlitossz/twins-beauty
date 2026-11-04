import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon, ProductImage, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { CATEGORIES } from '../../lib/catalog'
import { errorMessage } from '../../lib/format'
import type { ProductInput, ToneInput } from '../../lib/types'
import { ErrorBox, PageTitle, useConfirm } from './shared'

const PHOTO_SLOTS = [
  { label: 'Foto principal', hint: 'Sale en el catálogo.' },
  { label: 'Foto 2', hint: 'Opcional (abierto, textura…)' },
  { label: 'Foto 3', hint: 'Opcional' }
] as const

const BADGES = ['', 'Nuevo', 'Favorito', 'Oferta'] as const

/** Colores sugeridos para no tener que buscar el color exacto */
const PRESETS = ['#F1D5C0', '#E2BC9A', '#D2A27F', '#B57F59', '#8A5A3E', '#5E3B2B', '#F5A3A0', '#E9776A', '#E0283A', '#C9495A', '#9B6866', '#6E1630', '#E37AAE', '#F2843C', '#1A1A1A', '#4A2E22']

const EMPTY: ProductInput = {
  name: '',
  subtitle: '',
  brand: 'e.l.f.',
  category: 'Rostro',
  badge: '',
  description: '',
  price: 0,
  price_wholesale: null,
  images: [],
  swatch_url: null,
  active: true,
  hasTones: false,
  tones: [],
  stock: 0
}

const newTone = (): ToneInput => ({ name: '', hex: '#E2BC9A', image_url: null, grp: '', stock: 0 })

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductInput | null>(id ? null : EMPTY)
  const [brands, setBrands] = useState<string[]>(['e.l.f.'])
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [customCat, setCustomCat] = useState(false)
  const { confirm, dialog } = useConfirm()
  const lastToneRef = useRef<HTMLInputElement>(null)
  const [focusNew, setFocusNew] = useState(false)

  useEffect(() => {
    api
      .listProducts({ includeInactive: true })
      .then((list) => setBrands([...new Set(['e.l.f.', ...list.map((p) => p.brand).filter(Boolean)])]))
      .catch(() => {})
    if (!id) return
    api
      .getProduct(id)
      .then((p) => {
        if (!p) return setLoadError('Ese producto no existe')
        const withTones = p.variants.some((v) => v.name !== '')
        setForm({
          id: p.id,
          name: p.name,
          subtitle: p.subtitle,
          brand: p.brand,
          category: p.category,
          badge: p.badge,
          description: p.description,
          price: p.price,
          price_wholesale: p.price_wholesale,
          images: p.images,
          swatch_url: p.swatch_url,
          active: p.active,
          hasTones: withTones,
          tones: withTones ? p.variants.map((v) => ({ id: v.id, name: v.name, hex: v.hex || '#E2BC9A', image_url: v.image_url, grp: v.grp, stock: v.stock })) : [],
          stock: withTones ? 0 : (p.variants[0]?.stock ?? 0)
        })
        setCustomCat(!(CATEGORIES as readonly string[]).includes(p.category))
      })
      .catch((e) => setLoadError(errorMessage(e)))
  }, [id])

  useEffect(() => {
    if (focusNew) {
      lastToneRef.current?.focus()
      setFocusNew(false)
    }
  }, [focusNew])

  const totalUnits = useMemo(() => (form ? (form.hasTones ? form.tones.reduce((a, t) => a + (t.stock || 0), 0) : form.stock) : 0), [form])

  if (loadError) return <ErrorBox message={loadError} />
  if (!form)
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const setTone = (i: number, patch: Partial<ToneInput>) => setForm((f) => (f ? { ...f, tones: f.tones.map((t, j) => (j === i ? { ...t, ...patch } : t)) } : f))
  const moveTone = (i: number, d: -1 | 1) =>
    setForm((f) => {
      if (!f) return f
      const j = i + d
      if (j < 0 || j >= f.tones.length) return f
      const next = [...f.tones]
      ;[next[i], next[j]] = [next[j], next[i]]
      setExpanded(j)
      return { ...f, tones: next }
    })

  function addTone() {
    setForm((f) => (f ? { ...f, hasTones: true, tones: [...f.tones, newTone()] } : f))
    setExpanded(null)
    setFocusNew(true)
  }

  async function removeTone(i: number) {
    const t = form!.tones[i]
    if (t.stock > 0 && !(await confirm(`¿Quitar el tono "${t.name || 'sin nombre'}"? Tiene ${t.stock} en stock.`, 'Sí, quitar'))) return
    setForm((f) => (f ? { ...f, tones: f.tones.filter((_, j) => j !== i) } : f))
    setExpanded(null)
  }

  function setSlot(i: number, url: string) {
    setForm((f) => {
      if (!f) return f
      const next = [...f.images]
      while (next.length <= i) next.push('')
      next[i] = url
      while (next.length && !next[next.length - 1]) next.pop()
      return { ...f, images: next }
    })
  }

  async function upload(key: string, file: File | undefined, done: (url: string) => void) {
    if (!file) return
    setUploading(key)
    setError('')
    try {
      done(await api.uploadImage(file))
    } catch (e) {
      setError(`No se pudo subir la foto: ${errorMessage(e)}`)
    } finally {
      setUploading(null)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.name.trim()) return setError('Ponle un nombre al producto.')
    if (!(form.price > 0)) return setError('Escribe el precio al detal.')
    if (form.price_wholesale != null && !(form.price_wholesale > 0)) return setError('Revisa el precio al mayor, o déjalo vacío si no se vende al mayor.')
    if (form.hasTones) {
      if (form.tones.length === 0) return setError('Agrega al menos un tono, o apaga "Tiene tonos".')
      const names = form.tones.map((t) => t.name.trim().toLowerCase())
      if (names.some((n) => !n)) return setError('Hay un tono sin nombre.')
      if (new Set(names).size !== names.length) return setError('Hay dos tonos con el mismo nombre.')
    }
    setSaving(true)
    setError('')
    try {
      await api.saveProduct({ ...form, name: form.name.trim(), brand: form.brand.trim(), category: form.category.trim() || 'Rostro' })
      navigate('/admin/productos')
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  async function remove() {
    if (!form?.id) return
    if (!(await confirm(`¿Borrar "${form.name}"? Si solo quieres que no salga en la tienda, mejor apaga "Mostrar en la tienda".`, 'Sí, borrar'))) return
    try {
      await api.deleteProduct(form.id)
      navigate('/admin/productos')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const catOptions = [...CATEGORIES]

  return (
    <form onSubmit={submit} noValidate>
      <PageTitle
        title={id ? 'Editar producto' : 'Nuevo producto'}
        actions={
          <Link to="/admin/productos" className="a-btn">
            Volver
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <section className="a-card flex flex-col gap-4 p-4">
            <div>
              <h2 className="font-bold">Fotos del producto</h2>
              <p className="text-xs text-muted">Hasta 3. La principal es la que se ve en el catálogo.</p>
            </div>
            {PHOTO_SLOTS.map((slot, i) => {
              const url = form.images[i] || null
              const key = `foto-${i}`
              return (
                <div key={slot.label} className="flex items-center gap-3">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream">
                    {uploading === key ? <Spinner /> : <ProductImage src={url} alt={slot.label} className="h-20 w-20" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-sm font-semibold">{slot.label}</p>
                    <p className="text-xs text-muted">{slot.hint}</p>
                    <div className="flex items-center gap-2">
                      <input type="file" accept="image/*" className="sr-only" id={key} onChange={(e) => upload(key, e.target.files?.[0], (u) => setSlot(i, u))} />
                      <label htmlFor={key} className="a-btn h-9 cursor-pointer">
                        <Icon name="up" size={16} /> {url ? 'Cambiar' : 'Subir'}
                      </label>
                      {url && (
                        <button type="button" aria-label={`Quitar ${slot.label}`} className="grid h-9 w-9 place-items-center rounded-full text-[#8A2B1E] hover:bg-[#FBE3DE]" onClick={() => setSlot(i, '')}>
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>

          <section className="a-card flex flex-col gap-3 p-4">
            <div>
              <h2 className="font-bold">Carta de tonos (opcional)</h2>
              <p className="text-xs text-muted">Una foto con todos los tonos (como las de los brazos con swatches). La clienta la ve con el botón "Tonos".</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream">
                {uploading === 'swatch' ? <Spinner /> : <ProductImage src={form.swatch_url} alt="Carta de tonos" className="h-20 w-20" />}
              </div>
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" className="sr-only" id="swatch" onChange={(e) => upload('swatch', e.target.files?.[0], (u) => set('swatch_url', u))} />
                <label htmlFor="swatch" className="a-btn h-9 cursor-pointer">
                  <Icon name="up" size={16} /> {form.swatch_url ? 'Cambiar' : 'Subir'}
                </label>
                {form.swatch_url && (
                  <button type="button" aria-label="Quitar carta de tonos" className="grid h-9 w-9 place-items-center rounded-full text-[#8A2B1E] hover:bg-[#FBE3DE]" onClick={() => set('swatch_url', null)}>
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="a-card grid gap-3 p-4 sm:grid-cols-2">
            <label className="a-label sm:col-span-2">
              Nombre
              <input className="a-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Polvo Halo Glow" />
            </label>
            <label className="a-label">
              Marca
              <input className="a-field" list="marcas" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Ej. e.l.f." />
              <datalist id="marcas">
                {brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </label>
            <label className="a-label">
              Nombre original o presentación (opcional)
              <input className="a-field" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Ej. Halo Glow Powder Filter · 10 g" />
            </label>

            <div className="a-label sm:col-span-2">
              Categoría
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categoría">
                {catOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={!customCat && form.category === c}
                    onClick={() => {
                      setCustomCat(false)
                      set('category', c)
                    }}
                    className={`h-9 rounded-full border px-3.5 text-[13px] font-semibold ${!customCat && form.category === c ? 'border-cocoa bg-cocoa text-cream' : 'border-line2 bg-white'}`}
                  >
                    {c}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={customCat}
                  onClick={() => {
                    setCustomCat(true)
                    set('category', '')
                  }}
                  className={`h-9 rounded-full border px-3.5 text-[13px] font-semibold ${customCat ? 'border-cocoa bg-cocoa text-cream' : 'border-dashed border-line2 bg-white'}`}
                >
                  Otra…
                </button>
              </div>
              {customCat && <input className="a-field mt-1" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Escribe la categoría" autoFocus />}
            </div>

            <label className="a-label">
              Precio al detal ($)
              <input className="a-field text-base font-semibold" type="number" inputMode="decimal" min="0" step="0.5" value={form.price || ''} onChange={(e) => set('price', Number(e.target.value))} placeholder="Ej. 12" />
            </label>
            <label className="a-label">
              Precio al mayor ($)
              <input
                className="a-field text-base font-semibold"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={form.price_wholesale ?? ''}
                onChange={(e) => set('price_wholesale', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="Vacío = no se vende al mayor"
              />
            </label>

            <div className="a-label sm:col-span-2">
              Etiqueta en el catálogo
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Etiqueta">
                {BADGES.map((b) => (
                  <button
                    key={b || 'ninguna'}
                    type="button"
                    aria-pressed={form.badge === b}
                    onClick={() => set('badge', b)}
                    className={`h-9 rounded-full border px-3.5 text-[13px] font-semibold ${form.badge === b ? 'border-cocoa bg-cocoa text-cream' : 'border-line2 bg-white'}`}
                  >
                    {b || 'Ninguna'}
                  </button>
                ))}
              </div>
            </div>

            <label className="a-label sm:col-span-2">
              Descripción (opcional)
              <textarea className="a-field h-20 py-2" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Para qué sirve, acabado, cobertura…" />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
              <input type="checkbox" className="h-5 w-5 accent-cocoa" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              Mostrar en la tienda
            </label>
          </section>

          <section className="a-card flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Tonos o colores</h2>
                <p className="text-xs text-muted">Cada tono lleva su propia cantidad. En la tienda solo salen los que tienen stock.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.hasTones}
                aria-label="Tiene tonos"
                onClick={() => {
                  const on = !form.hasTones
                  setForm((f) => (f ? { ...f, hasTones: on, tones: on && f.tones.length === 0 ? [newTone()] : f.tones } : f))
                  if (on && form.tones.length === 0) setFocusNew(true)
                }}
                className={`flex h-8 w-14 shrink-0 rounded-full p-[3px] transition ${form.hasTones ? 'justify-end bg-cocoa' : 'justify-start bg-line2'}`}
              >
                <span className="h-[26px] w-[26px] rounded-full bg-white shadow" />
              </button>
            </div>

            {form.hasTones ? (
              <>
                <ul className="flex flex-col gap-2">
                  {form.tones.map((t, i) => {
                    const open = expanded === i
                    return (
                      <li key={t.id ?? `nuevo-${i}`} className="rounded-2xl bg-cream/70 p-2">
                        <div className="flex items-center gap-2">
                          <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(109,82,71,0.3)]" style={{ background: t.hex }} title="Cambiar color">
                            <span className="sr-only">Color de {t.name || 'este tono'}</span>
                            <input type="color" value={t.hex} onChange={(e) => setTone(i, { hex: e.target.value.toUpperCase() })} className="absolute inset-0 cursor-pointer opacity-0" />
                          </label>
                          <input
                            ref={i === form.tones.length - 1 ? lastToneRef : undefined}
                            className="a-field h-10 min-w-0 flex-1"
                            aria-label="Nombre del tono"
                            value={t.name}
                            onChange={(e) => setTone(i, { name: e.target.value })}
                            placeholder="Nombre del tono"
                          />
                          <div className="flex shrink-0 items-center">
                            <button type="button" aria-label={`Restar una unidad de ${t.name || 'este tono'}`} onClick={() => setTone(i, { stock: Math.max(0, t.stock - 1) })} className="grid h-10 w-9 place-items-center">
                              <Icon name="minus" size={16} />
                            </button>
                            <input
                              className="h-10 w-11 rounded-lg border border-line2 bg-white text-center text-base font-bold"
                              type="number"
                              inputMode="numeric"
                              min="0"
                              aria-label={`Cantidad de ${t.name || 'este tono'}`}
                              value={t.stock}
                              onChange={(e) => setTone(i, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                            />
                            <button type="button" aria-label={`Sumar una unidad de ${t.name || 'este tono'}`} onClick={() => setTone(i, { stock: t.stock + 1 })} className="grid h-10 w-9 place-items-center">
                              <Icon name="plus" size={16} />
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-label={open ? 'Cerrar opciones del tono' : 'Más opciones del tono'}
                            aria-expanded={open}
                            onClick={() => setExpanded(open ? null : i)}
                            className="grid h-10 w-9 shrink-0 place-items-center rounded-lg hover:bg-white"
                          >
                            <Icon name="chevron" size={16} className={open ? 'rotate-180' : ''} />
                          </button>
                        </div>

                        {open && (
                          <div className="mt-2 flex flex-col gap-3 border-t border-line px-1 pb-1 pt-3">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-semibold">Colores sugeridos</span>
                              <div className="flex flex-wrap gap-1.5">
                                {PRESETS.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    aria-label={`Usar color ${c}`}
                                    onClick={() => setTone(i, { hex: c })}
                                    className="h-8 w-8 rounded-full"
                                    style={{ background: c, boxShadow: t.hex === c ? '0 0 0 2px #FAF2E2, 0 0 0 4px #6D5247' : 'inset 0 0 0 1px rgba(109,82,71,0.25)' }}
                                  />
                                ))}
                              </div>
                            </div>
                            <label className="a-label">
                              Grupo (opcional)
                              <input className="a-field" value={t.grp} onChange={(e) => setTone(i, { grp: e.target.value })} placeholder='Ej. "Con brillo", "Claros"' />
                            </label>
                            <div className="flex items-center gap-3">
                              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                                {uploading === `tono-${i}` ? <Spinner /> : <ProductImage src={t.image_url} alt="" className="h-14 w-14" />}
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold">Foto de este tono (opcional)</span>
                                <div className="flex items-center gap-2">
                                  <input type="file" accept="image/*" className="sr-only" id={`tono-${i}`} onChange={(e) => upload(`tono-${i}`, e.target.files?.[0], (u) => setTone(i, { image_url: u }))} />
                                  <label htmlFor={`tono-${i}`} className="a-btn h-9 cursor-pointer">
                                    <Icon name="image" size={16} /> {t.image_url ? 'Cambiar' : 'Subir'}
                                  </label>
                                  {t.image_url && (
                                    <button type="button" aria-label="Quitar foto del tono" className="grid h-9 w-9 place-items-center rounded-full text-[#8A2B1E] hover:bg-[#FBE3DE]" onClick={() => setTone(i, { image_url: null })}>
                                      <Icon name="trash" size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" className="a-btn h-9" disabled={i === 0} onClick={() => moveTone(i, -1)}>
                                Subir en la lista
                              </button>
                              <button type="button" className="a-btn h-9" disabled={i === form.tones.length - 1} onClick={() => moveTone(i, 1)}>
                                Bajar
                              </button>
                              <button type="button" className="a-btn ml-auto h-9 text-[#8A2B1E]" onClick={() => removeTone(i)}>
                                <Icon name="trash" size={14} /> Quitar tono
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-mauve text-sm font-semibold" onClick={addTone}>
                  <Icon name="plus" size={16} /> Agregar tono
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-cream/70 px-3 py-2">
                <span className="flex-1 text-sm font-semibold">Cantidad disponible</span>
                <button type="button" aria-label="Restar una unidad" onClick={() => set('stock', Math.max(0, form.stock - 1))} className="grid h-10 w-10 place-items-center rounded-full border border-line2 bg-white">
                  <Icon name="minus" size={16} />
                </button>
                <input
                  className="h-10 w-14 rounded-lg border border-line2 bg-white text-center text-base font-bold"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  aria-label="Cantidad disponible"
                  value={form.stock}
                  onChange={(e) => set('stock', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
                <button type="button" aria-label="Sumar una unidad" onClick={() => set('stock', form.stock + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-cocoa text-cream">
                  <Icon name="plus" size={16} />
                </button>
              </div>
            )}
            <p className="border-t border-dashed border-line2 pt-3 text-sm font-semibold">Total en inventario: {totalUnits} unidades</p>
          </section>

          {error && <ErrorBox message={error} />}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {id ? (
              <button type="button" onClick={remove} className="a-btn text-[#8A2B1E]">
                <Icon name="trash" size={16} /> Borrar
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={saving || uploading !== null} className="a-btn-dark h-12 px-6 text-base">
              {saving ? 'Guardando…' : 'Guardar producto'}
            </button>
          </div>
        </div>
      </div>
      {dialog}
    </form>
  )
}

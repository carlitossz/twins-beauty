import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CartButton, ShopShell } from '../../components/ShopLayout'
import { BackButton, Icon, ProductImage, Spinner, Star, ToneDot } from '../../components/ui'
import { api } from '../../lib/api'
import { hasTones, tonesInStock, totalStock, usd } from '../../lib/format'
import { useAsync, useCart, useSettings } from '../../lib/store'
import type { Variant } from '../../lib/types'
import { waLink } from '../../lib/whatsapp'

export default function ProductDetail() {
  const { id = '' } = useParams()
  const { data: p, loading } = useAsync(() => api.getProduct(id), [id])
  const { settings } = useSettings()
  const cart = useCart()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [activeImg, setActiveImg] = useState(0)
  // true = la foto grande muestra la foto del tono elegido (si tiene)
  const [toneView, setToneView] = useState(true)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState('')

  const tones = useMemo(() => (p ? tonesInStock(p) : []), [p])
  const withTones = p ? hasTones(p) : false

  // Al abrir, queda elegido el primer tono disponible
  useEffect(() => {
    setPickedId(null)
    setActiveImg(0)
    setToneView(true)
    setQty(1)
  }, [id])
  useEffect(() => {
    if (p && !pickedId) setPickedId(withTones ? (tones[0]?.id ?? null) : (p.variants[0]?.id ?? null))
  }, [p, pickedId, withTones, tones])

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(''), 3500)
    return () => clearTimeout(t)
  }, [added])

  if (loading && !p) {
    return (
      <ShopShell header={false}>
        <div className="grid min-h-screen place-items-center">
          <Spinner />
        </div>
      </ShopShell>
    )
  }

  if (!p || !p.active) {
    return (
      <ShopShell>
        <div className="flex flex-col items-start gap-3 px-5 py-10">
          <h1 className="text-xl font-bold">Este producto ya no está disponible</h1>
          <Link to="/" className="btn-primary h-12">
            Ver el catálogo
          </Link>
        </div>
      </ShopShell>
    )
  }

  const variant: Variant | undefined = p.variants.find((v) => v.id === pickedId)
  const inCart = cart.items.find((i) => i.variant_id === variant?.id)?.qty ?? 0
  const available = variant ? variant.stock - inCart : 0
  const soldOut = totalStock(p) === 0

  const gallery = p.images.filter(Boolean)
  if (gallery.length === 0 && p.image_url) gallery.push(p.image_url)
  const slides = [...gallery, ...(p.swatch_url ? [p.swatch_url] : [])]
  // La foto del tono elegido (si la hay) manda sobre el álbum mientras no se toque otra miniatura
  const toneImage = withTones && variant?.image_url && toneView ? variant.image_url : null
  const mainImg = toneImage ?? slides[activeImg] ?? null
  const showingSwatch = !!p.swatch_url && mainImg === p.swatch_url

  const groups = groupTones(tones)

  function pick(v: Variant) {
    setPickedId(v.id)
    setQty(1)
    setToneView(true)
  }

  function addToCart() {
    if (!variant || available <= 0) return
    const n = Math.min(qty, available)
    cart.add(
      {
        variant_id: variant.id,
        product_id: p!.id,
        name: p!.name,
        tone: variant.name,
        hex: variant.hex,
        image_url: variant.image_url ?? p!.image_url,
        price: p!.price,
        price_wholesale: p!.price_wholesale
      },
      n
    )
    setAdded(`${n} ${p!.name}${variant.name ? ` · ${variant.name}` : ''}`)
    setQty(1)
  }

  const askText = `Hola, ¿les va a llegar ${p.name}${variant?.name ? ` en el tono ${variant.name}` : ''}?`
  const wholesaleMin = settings?.wholesale_min ?? 0

  return (
    <ShopShell header="desktop">
      <nav aria-label="Ruta" className="hidden items-center gap-3 px-5 pt-6 text-sm lg:flex">
        <Link to="/" className="mr-2 flex h-11 items-center gap-2 rounded-full border-[1.5px] border-cocoa pl-3 pr-4 font-semibold transition hover:bg-white">
          <Icon name="back" size={18} /> Volver al catálogo
        </Link>
        <Link to="/" className="font-semibold underline-offset-4 hover:underline">
          Catálogo
        </Link>
        <span aria-hidden="true">/</span>
        <span>{p.category}</span>
        <span aria-hidden="true">/</span>
        <span className="font-semibold">{p.name}</span>
      </nav>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-12 lg:px-5 lg:pt-6 2xl:grid-cols-[minmax(0,680px)_minmax(0,1fr)] 2xl:gap-16">
      <div className="relative px-5 pt-4 lg:sticky lg:top-28 lg:px-0 lg:pt-0">
        <div className="relative aspect-square overflow-hidden rounded-[28px] bg-white">
          <ProductImage key={mainImg ?? 'x'} src={mainImg} alt={showingSwatch ? `Carta de tonos de ${p.name}` : p.name} className="animate-img-in h-full w-full" fit={showingSwatch ? 'contain' : 'cover'} />
          <div className="absolute left-3 right-3 top-3 flex justify-between lg:hidden">
            <BackButton to="/" label="Volver al catálogo" />
            <CartButton />
          </div>
          {withTones && variant && !showingSwatch && (
            <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-cream py-1.5 pl-1.5 pr-3 text-xs font-semibold">
              <ToneDot hex={variant.hex} size={22} />
              {variant.name}
            </span>
          )}
        </div>

        {slides.length > 1 && (
          <div className="mt-3 flex gap-2">
            {slides.map((src, i) => {
              const isSwatch = src === p.swatch_url && i === slides.length - 1
              const on = i === activeImg && !toneImage
              return (
                <button
                  key={src + i}
                  type="button"
                  aria-label={isSwatch ? 'Ver carta de tonos' : `Ver foto ${i + 1}`}
                  aria-pressed={on}
                  onClick={() => {
                    setActiveImg(i)
                    setToneView(false)
                  }}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-white lg:h-20 lg:w-20 ${on ? 'border-cocoa' : 'border-transparent'}`}
                >
                  <ProductImage src={src} alt="" className="h-full w-full" />
                  {isSwatch && <span className="absolute inset-x-0 bottom-0 bg-cocoa/85 py-0.5 text-center text-[9px] font-semibold text-cream">Tonos</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <main className="animate-rise-in flex flex-col gap-5 px-5 pb-40 pt-5 lg:px-0 lg:pb-16 lg:pt-0">
        <section className="flex flex-col gap-1">
          <span className="text-[12.5px] font-medium">{p.brand} · Original</span>
          <h1 className="text-[25px] font-bold leading-tight lg:text-[34px]">{p.name}</h1>
          {p.subtitle && <span className="text-[13px]">{p.subtitle}</span>}
          <span className="mt-2 text-[28px] font-bold">{usd(p.price)}</span>
        </section>

        {p.price_wholesale != null && wholesaleMin > 0 && (
          <div className="-mt-2 flex items-center gap-3 rounded-2xl bg-blush px-4 py-3">
            <Star size={26} color="#6D5247" className="shrink-0" />
            <span className="text-[13px] leading-snug">
              <b className="font-bold">{usd(p.price_wholesale)} al mayor</b> llevando {wholesaleMin} productos o más en tu carrito (puedes mezclar).
            </span>
          </div>
        )}

        {withTones && tones.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-bold">
                Tono: <span className="font-medium">{variant?.name}</span>
              </h2>
              {variant && <span className="shrink-0 text-xs font-semibold">{variant.stock === 1 ? '¡Queda 1!' : `Quedan ${variant.stock}`}</span>}
            </div>
            {groups.map(([grp, list]) => (
              <div key={grp || '__'} className="flex flex-col gap-2">
                {groups.length > 1 && <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">{grp || 'Otros'}</span>}
                <div role="radiogroup" aria-label={grp ? `Tonos ${grp}` : 'Tonos'} className="grid grid-cols-6 gap-x-2 gap-y-3 lg:grid-cols-8 2xl:grid-cols-10">
                  {list.map((v) => {
                    const on = v.id === variant?.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={v.name}
                        title={v.name}
                        onClick={() => pick(v)}
                        className="justify-self-center rounded-full transition duration-200 hover:scale-110 active:scale-90"
                        style={{
                          width: 46,
                          height: 46,
                          background: v.hex || '#EAD9CC',
                          boxShadow: on ? '0 0 0 3px #FAF2E2, 0 0 0 5px #6D5247' : 'inset 0 0 0 1px rgba(109,82,71,0.25)'
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs leading-relaxed">
              Los colores en pantalla son referenciales.{p.swatch_url ? ' Toca "Tonos" en las fotos para ver la carta real.' : ''} ¿Dudas con tu tono? Escríbenos y te asesoramos.
            </p>
          </section>
        )}

        {!soldOut && (
          <div className="animate-bar-in fixed inset-x-0 bottom-0 z-10 border-t border-line bg-cream lg:static lg:z-auto lg:border-0 lg:bg-transparent">
            <div className="mx-auto flex max-w-[34rem] flex-col gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 lg:mx-0 lg:max-w-none lg:px-0 lg:pb-0 lg:pt-0">
              {added && (
                <div role="status" className="animate-reveal flex items-center justify-between gap-3 rounded-2xl bg-blush px-4 py-2.5 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2 font-semibold">
                    <Icon name="check" size={16} className="shrink-0" />
                    <span className="truncate">Agregado: {added}</span>
                  </span>
                  <Link to="/carrito" className="shrink-0 font-bold underline">
                    Ver carrito
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-14 items-center rounded-full border-[1.5px] border-cocoa">
                  <button type="button" aria-label="Quitar uno" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="grid h-full w-12 place-items-center disabled:opacity-30">
                    <Icon name="minus" size={18} />
                  </button>
                  <span className="w-6 text-center text-base font-bold" aria-live="polite">
                    {qty}
                  </span>
                  <button type="button" aria-label="Agregar uno" onClick={() => setQty((q) => Math.min(Math.max(1, available), q + 1))} disabled={qty >= available} className="grid h-full w-12 place-items-center disabled:opacity-30">
                    <Icon name="plus" size={18} />
                  </button>
                </div>
                {available > 0 ? (
                  <button type="button" onClick={addToCart} className="btn-primary flex-1 px-4">
                    Agregar · {usd(p.price * qty)}
                  </button>
                ) : (
                  <Link to="/carrito" className="btn-primary flex-1 px-4 text-[14px]">
                    Ya tienes todos en el carrito
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {soldOut && (
          <div className="flex flex-col gap-3 rounded-[20px] bg-white p-4">
            <span className="text-sm font-bold">Por ahora está agotado</span>
            <span className="text-xs">Escríbenos y te avisamos apenas llegue.</span>
            <a href={waLink(settings?.whatsapp ?? '', askText)} target="_blank" rel="noreferrer" className="btn-ghost h-12">
              <Icon name="wa" /> Preguntar por WhatsApp
            </a>
          </div>
        )}

        {p.description && (
          <section className="flex flex-col gap-1.5">
            <h2 className="text-[15px] font-bold">Sobre el producto</h2>
            <p className="text-[13px] leading-relaxed">{p.description}</p>
          </section>
        )}

        {settings && (
          <ul className="flex flex-col gap-2.5 border-t border-line pt-5 text-[12.5px] leading-snug">
            <li className="flex gap-2.5">
              <Icon name="truck" size={18} className="mt-px shrink-0" />
              <span>
                <b className="font-semibold">Retiro, delivery o envío nacional</b> · lo eliges al confirmar el pedido
              </span>
            </li>
            <li className="flex gap-2.5">
              <Icon name="card" size={18} className="mt-px shrink-0" />
              <span>
                <b className="font-semibold">Pagas con</b>{' '}
                {settings.payment_methods
                  .filter((m) => m.enabled)
                  .map((m) => m.name)
                  .join(', ')}
              </span>
            </li>
          </ul>
        )}
      </main>
      </div>
    </ShopShell>
  )
}

/** Agrupa los tonos por su grupo (ej. "Clásicos" / "Con brillo"), respetando el orden */
function groupTones(list: Variant[]): [string, Variant[]][] {
  const out: [string, Variant[]][] = []
  for (const v of list) {
    const g = out.find(([k]) => k === v.grp)
    if (g) g[1].push(v)
    else out.push([v.grp, [v]])
  }
  return out
}

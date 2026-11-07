import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShopShell, WhatsAppFab } from '../../components/ShopLayout'
import { Icon, ProductImage, Spinner, Star, ToneDot } from '../../components/ui'
import { api } from '../../lib/api'
import { CATEGORIES } from '../../lib/catalog'
import { hasTones, plural, tonesInStock, totalStock, usd } from '../../lib/format'
import { useAsync, useCart, useSettings } from '../../lib/store'
import type { Product } from '../../lib/types'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Catalog() {
  const { data: products, loading, error, reload } = useAsync(() => api.listProducts())
  const { settings } = useSettings()
  const cart = useCart()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('Todo')

  const cats = useMemo(() => {
    const present = new Set((products ?? []).map((p) => p.category))
    const known = CATEGORIES.filter((c) => present.has(c))
    const other = [...present].filter((c) => !(CATEGORIES as readonly string[]).includes(c))
    return ['Todo', ...known, ...other]
  }, [products])

  const shown = useMemo(() => {
    const q = norm(query.trim())
    return (products ?? [])
      .filter((p) => cat === 'Todo' || p.category === cat)
      .filter((p) => !q || norm(`${p.name} ${p.subtitle} ${p.brand} ${p.category} ${p.variants.map((v) => v.name).join(' ')}`).includes(q))
      .sort((a, b) => Number(totalStock(b) > 0) - Number(totalStock(a) > 0))
  }, [products, cat, query])

  // Productos destacados que rotan en el banner
  const featured = useMemo(() => (products ?? []).filter((p) => totalStock(p) > 0 && p.image_url).sort((a, b) => Number(!!b.badge) - Number(!!a.badge)).slice(0, 5), [products])
  const [heroIndex, setHeroIndex] = useState(0)
  useEffect(() => {
    if (featured.length <= 1) return
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % featured.length), 4000)
    return () => clearInterval(t)
  }, [featured.length])
  const hero = featured[heroIndex % Math.max(1, featured.length)]

  const available = shown.filter((p) => totalStock(p) > 0).length
  const wholesaleMin = settings?.wholesale_min ?? 0

  const search = (
    <label className="flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-line2 bg-white px-4">
      <Icon name="search" size={18} />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar producto o tono"
        aria-label="Buscar productos"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#9A7F74]"
      />
    </label>
  )

  const wholesaleNote = wholesaleMin > 0 && (
    <p className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-mauve px-4 py-3 text-[13px] leading-snug">
      <Star size={22} color="#6D5247" className="shrink-0" />
      <span>
        <b className="font-semibold">Precio al mayor</b> llevando {wholesaleMin} productos o más (puedes mezclar).
      </span>
    </p>
  )

  return (
    <ShopShell>
      <main className="flex flex-col gap-4 px-5 pb-32 lg:gap-8 lg:pb-20 lg:pt-6">
        {/* Teléfono: buscador, banner, aviso del mayor y categorías en fila */}
        <div className="flex flex-col gap-4 lg:hidden">
          {search}
          {!query && <Hero hero={hero} featured={[]} />}
          {!query && wholesaleNote}
          <nav aria-label="Categorías" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {cats.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`chip ${cat === c ? 'chip-on' : ''}`}>
                {c}
              </button>
            ))}
          </nav>
        </div>

        {/* Computadora: banner ancho con varios productos */}
        <div className="hidden lg:block">
          <Hero hero={hero} featured={featured} />
        </div>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-10 2xl:gap-14">
          {/* Computadora: buscador y categorías a un lado */}
          <aside className="hidden lg:sticky lg:top-28 lg:flex lg:flex-col lg:gap-5">
            {search}
            <nav aria-label="Categorías" className="flex flex-col gap-1">
              <span className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.1em]">Categorías</span>
              {cats.map((c) => {
                const n = c === 'Todo' ? (products ?? []).length : (products ?? []).filter((p) => p.category === c).length
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={cat === c}
                    onClick={() => setCat(c)}
                    className={`flex h-11 items-center justify-between rounded-2xl px-3 text-left text-[14px] transition ${cat === c ? 'bg-cocoa font-semibold text-cream' : 'font-medium hover:bg-white'}`}
                  >
                    {c}
                    <span className={`text-xs ${cat === c ? 'text-cream/80' : 'text-muted'}`}>{n}</span>
                  </button>
                )
              })}
            </nav>
            {wholesaleNote}
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            {loading && !products && (
              <div className="grid place-items-center py-16">
                <Spinner />
              </div>
            )}

            {error && (
              <div className="flex flex-col items-start gap-3 rounded-[20px] bg-white p-5 text-sm">
                <span className="font-semibold">No pudimos cargar el catálogo.</span>
                <button type="button" className="btn-ghost h-10" onClick={reload}>
                  Reintentar
                </button>
              </div>
            )}

            {products && (
              <>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-bold lg:text-2xl">{query ? `Resultados para "${query}"` : cat === 'Todo' ? 'Todo el catálogo' : cat}</h2>
                  <span className="text-xs font-medium lg:text-sm">{plural(available, 'disponible', 'disponibles')}</span>
                </div>

                {shown.length === 0 ? (
                  <div className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-dashed border-line2 bg-white p-5 text-sm">
                    <span className="font-semibold">No encontramos ese producto</span>
                    <span className="text-muted">Escríbenos por WhatsApp y te ayudamos a buscarlo.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-9 xl:grid-cols-4 2xl:grid-cols-5">
                    {shown.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {/* En computadora el total ya se ve en la cabecera */}
      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
          <Link
            to="/carrito"
            className="mx-auto flex h-[58px] max-w-[32rem] items-center justify-between rounded-full bg-cocoa pl-6 pr-2.5 text-cream shadow-[0_10px_28px_rgba(109,82,71,0.35)]"
          >
            <span className="text-[15px] font-semibold">Ver carrito · {cart.count}</span>
            <span className="flex h-10 items-center rounded-full bg-blush px-4 text-[15px] font-bold text-cocoa">{usd(cart.pricing.total)}</span>
          </Link>
        </div>
      )}
      <WhatsAppFab raised={cart.count > 0} />
    </ShopShell>
  )
}

/** Banner rosado. En teléfono rota un producto; en computadora muestra varios en fila */
function Hero({ hero, featured }: { hero: Product | undefined; featured: Product[] }) {
  const wide = featured.length > 0
  return (
    <section className={`relative flex overflow-hidden rounded-[24px] bg-blush p-5 ${wide ? 'min-h-[260px] items-center gap-8 px-10 py-10' : 'min-h-[188px]'}`}>
      <Star size={wide ? 220 : 130} className={`animate-spin-slow absolute ${wide ? '-right-16 -top-20' : '-right-8 -top-8'}`} />
      <Star size={wide ? 80 : 54} color="#AC8A81" className={`absolute ${wide ? 'bottom-[-22px] left-[42%]' : 'bottom-[-14px] right-[118px]'}`} />
      <div className={`relative z-[1] flex flex-col gap-2 ${wide ? 'max-w-[440px] shrink-0' : 'max-w-[60%]'}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">Maquillaje 100% original</p>
        <h1 className={`font-bold leading-[1.12] ${wide ? 'text-[40px] 2xl:text-[46px]' : 'text-[25px]'}`}>Tu glow favorito, a un toque</h1>
        <p className={`leading-snug ${wide ? 'text-[15px]' : 'text-[12.5px]'}`}>Envíos a toda Venezuela · Delivery y entregas en la ciudad</p>
      </div>
      {wide ? (
        <div className="relative z-[1] ml-auto flex gap-4">
          {featured.slice(0, 4).map((p, i) => (
            <Link
              key={p.id}
              to={`/producto/${p.id}`}
              aria-label={`Ver ${p.name}`}
              className={`animate-hero-in h-[150px] w-[150px] overflow-hidden rounded-[22px] bg-white shadow-[0_10px_24px_rgba(109,82,71,0.18)] transition hover:-translate-y-1 xl:h-[170px] xl:w-[170px] 2xl:h-[200px] 2xl:w-[200px] ${i === 3 ? 'hidden 2xl:block' : ''}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <ProductImage src={p.image_url} alt={p.name} className="h-full w-full" />
            </Link>
          ))}
        </div>
      ) : (
        hero && (
          <Link
            key={hero.id}
            to={`/producto/${hero.id}`}
            aria-label={`Ver ${hero.name}`}
            className="animate-hero-in absolute bottom-4 right-4 z-[1] h-[112px] w-[112px] overflow-hidden rounded-[22px] bg-white shadow-[0_10px_24px_rgba(109,82,71,0.18)]"
          >
            <ProductImage src={hero.image_url} alt={hero.name} className="h-full w-full" />
          </Link>
        )
      )}
    </section>
  )
}

function ProductCard({ product: p }: { product: Product }) {
  const withTones = hasTones(p)
  const inStock = tonesInStock(p)
  const soldOut = totalStock(p) === 0
  return (
    <Link to={`/producto/${p.id}`} className={`group flex flex-col gap-2 ${soldOut ? 'opacity-60' : ''}`}>
      <div className="relative aspect-square overflow-hidden rounded-[20px] bg-white">
        <ProductImage src={p.image_url} alt={p.name} className="h-full w-full transition duration-300 lg:group-hover:scale-105" />
        {soldOut ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold">Agotado</span>
        ) : (
          p.badge && <span className="absolute left-2.5 top-2.5 rounded-full bg-blush px-2.5 py-1 text-[11px] font-semibold">{p.badge}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <span className="text-[11px] font-medium tracking-[0.02em]">{p.brand}</span>
        <span className="text-[14px] font-semibold leading-tight">{p.name}</span>
        {withTones && inStock.length > 0 && (
          <span className="mt-1 flex items-center gap-1">
            {inStock.slice(0, 5).map((v) => (
              <ToneDot key={v.id} hex={v.hex} />
            ))}
            <span className="ml-0.5 text-[11px] font-medium">{plural(inStock.length, 'tono', 'tonos')}</span>
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[17px] font-bold">{usd(p.price)}</span>
          {p.price_wholesale != null && <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold">Mayor {usd(p.price_wholesale)}</span>}
        </span>
      </div>
    </Link>
  )
}

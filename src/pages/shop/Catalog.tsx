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

  return (
    <ShopShell>
      <main className="flex flex-col gap-4 px-5 pb-32">
        <label className="flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-line2 bg-white px-4">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca un producto o un tono"
            aria-label="Buscar productos"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#9A7F74]"
          />
        </label>

        {!query && (
          <section className="relative flex min-h-[188px] overflow-hidden rounded-[24px] bg-blush p-5">
            <Star size={130} className="animate-spin-slow absolute -right-8 -top-8" />
            <Star size={54} color="#AC8A81" className="absolute bottom-[-14px] right-[118px]" />
            <div className="relative z-[1] flex max-w-[60%] flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">Maquillaje 100% original</p>
              <h1 className="text-[25px] font-bold leading-[1.12]">Tu glow favorito, a un toque</h1>
              <p className="text-[12.5px] leading-snug">Envíos a toda Venezuela · Delivery y entregas en la ciudad</p>
            </div>
            {hero && (
              <Link
                key={hero.id}
                to={`/producto/${hero.id}`}
                aria-label={`Ver ${hero.name}`}
                className="animate-hero-in absolute bottom-4 right-4 z-[1] h-[112px] w-[112px] overflow-hidden rounded-[22px] bg-white shadow-[0_10px_24px_rgba(109,82,71,0.18)]"
              >
                <ProductImage src={hero.image_url} alt={hero.name} className="h-full w-full" />
              </Link>
            )}
          </section>
        )}

        {wholesaleMin > 0 && !query && (
          <p className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-mauve px-4 py-3 text-[13px] leading-snug">
            <Star size={22} color="#6D5247" className="shrink-0" />
            <span>
              <b className="font-semibold">Precio al mayor</b> llevando {wholesaleMin} productos o más (puedes mezclar).
            </span>
          </p>
        )}

        <nav aria-label="Categorías" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {cats.map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`chip ${cat === c ? 'chip-on' : ''}`}>
              {c}
            </button>
          ))}
        </nav>

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
              <h2 className="text-lg font-bold">{cat === 'Todo' ? 'Todo el catálogo' : cat}</h2>
              <span className="text-xs font-medium">{plural(available, 'disponible', 'disponibles')}</span>
            </div>

            {shown.length === 0 ? (
              <div className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-dashed border-line2 bg-white p-5 text-sm">
                <span className="font-semibold">No encontramos ese producto</span>
                <span className="text-muted">Escríbenos por WhatsApp y te ayudamos a buscarlo.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3.5 gap-y-5">
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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

function ProductCard({ product: p }: { product: Product }) {
  const withTones = hasTones(p)
  const inStock = tonesInStock(p)
  const soldOut = totalStock(p) === 0
  return (
    <Link to={`/producto/${p.id}`} className={`flex flex-col gap-2 ${soldOut ? 'opacity-60' : ''}`}>
      <div className="relative aspect-square overflow-hidden rounded-[20px] bg-white">
        <ProductImage src={p.image_url} alt={p.name} className="h-full w-full" />
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

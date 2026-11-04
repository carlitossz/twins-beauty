import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, ProductImage, Spinner, ToneDot } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, hasTones, plural, totalStock } from '../../lib/format'
import { useAsync } from '../../lib/store'
import type { Product, Variant } from '../../lib/types'
import { ErrorBox, PageTitle, Toast } from './shared'

type Filter = 'todos' | 'ultima' | 'agotados'

export default function Inventory() {
  const { data: products, error, loading, reload, setData } = useAsync(() => api.listProducts({ includeInactive: true }))
  const [filter, setFilter] = useState<Filter>('todos')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const match = (v: Variant) => (filter === 'ultima' ? v.stock === 1 : filter === 'agotados' ? v.stock === 0 : true)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (products ?? []).filter((p) => !q || `${p.name} ${p.variants.map((v) => v.name).join(' ')}`.toLowerCase().includes(q)).filter((p) => p.variants.some(match))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, filter, query])

  const total = (products ?? []).filter((p) => p.active).reduce((a, p) => a + totalStock(p), 0)
  const autoOpen = filter !== 'todos' || query.trim() !== ''

  // Cambia el número en pantalla al instante y guarda medio segundo después del último toque
  function bump(p: Product, v: Variant, delta: number) {
    const next = Math.max(0, v.stock + delta)
    if (next === v.stock) return
    setData((prev) => prev?.map((x) => (x.id === p.id ? { ...x, variants: x.variants.map((y) => (y.id === v.id ? { ...y, stock: next } : y)) } : x)) ?? prev)
    clearTimeout(timers.current[v.id])
    timers.current[v.id] = setTimeout(async () => {
      try {
        await api.setStock(v.id, next)
        setToast(`Guardado · ${p.name}${v.name ? ` ${v.name}` : ''}: ${next}`)
      } catch (e) {
        setToast(`No se guardó: ${errorMessage(e)}`)
        reload()
      }
    }, 500)
  }

  return (
    <>
      <PageTitle
        title="Inventario"
        subtitle={`${plural(total, 'unidad', 'unidades')} en stock · toca + o − y se guarda solo`}
        actions={
          <Link to="/admin/productos/nuevo" className="a-btn-dark">
            <Icon name="plus" size={16} /> Nuevo producto
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="a-field max-w-xs" type="search" placeholder="Buscar producto o tono" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar producto o tono" />
        {(
          [
            ['todos', 'Todos'],
            ['ultima', 'Última unidad'],
            ['agotados', 'Agotados']
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={`h-10 rounded-full border px-4 text-sm font-semibold ${filter === k ? 'border-cocoa bg-cocoa text-cream' : 'border-line2 bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !products && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {products && shown.length === 0 && <div className="a-card p-6 text-sm text-muted">No hay productos en esta lista.</div>}

      <div className="flex flex-col gap-3">
        {shown.map((p) => {
          const tones = hasTones(p)
          const isOpen = autoOpen || !!open[p.id] || !tones
          const list = p.variants.filter(match)
          const zero = p.variants.filter((v) => v.stock === 0).length
          return (
            <article key={p.id} className={`a-card flex flex-col gap-3 p-4 ${p.active ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                <ProductImage src={p.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.name}</p>
                  <p className="text-xs text-muted">
                    {tones ? `${plural(p.variants.length, 'tono', 'tonos')}${zero ? ` · ${zero} en 0` : ''}` : 'Sin tonos'}
                    {!p.active && ' · Oculto en la tienda'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold leading-none">{totalStock(p)}</p>
                  <p className="text-[11px] text-muted">total</p>
                </div>
                <Link to={`/admin/productos/${p.id}`} aria-label={`Editar ${p.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line2">
                  <Icon name="edit" size={16} />
                </Link>
              </div>

              {tones && !autoOpen && (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sand/70 text-sm font-semibold"
                >
                  {isOpen ? 'Ocultar tonos' : 'Ver y ajustar tonos'}
                  <Icon name="chevron" size={16} className={isOpen ? 'rotate-180' : ''} />
                </button>
              )}

              {isOpen && (
                <div className={tones ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3' : ''}>
                  {list.map((v) => (
                    <StockRow key={v.id} product={p} variant={v} bump={bump} />
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
      <Toast text={toast} />
    </>
  )
}

function StockRow({ product, variant: v, bump }: { product: Product; variant: Variant; bump: (p: Product, v: Variant, delta: number) => void }) {
  const label = v.name || 'Unidades'
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 ${v.stock === 0 ? 'border-dashed border-line2 bg-cream/60' : v.stock === 1 ? 'border-star bg-blush/60' : 'border-line bg-white'}`}>
      {v.name && <ToneDot hex={v.hex} size={22} />}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
      <button
        type="button"
        aria-label={`Restar una unidad de ${product.name}${v.name ? ` ${v.name}` : ''}`}
        onClick={() => bump(product, v, -1)}
        disabled={v.stock === 0}
        className="grid h-10 w-10 place-items-center rounded-full border border-line2 bg-white disabled:opacity-30"
      >
        <Icon name="minus" size={16} />
      </button>
      <span className={`w-7 text-center text-lg font-bold ${v.stock === 0 ? 'text-muted' : ''}`}>{v.stock}</span>
      <button
        type="button"
        aria-label={`Sumar una unidad de ${product.name}${v.name ? ` ${v.name}` : ''}`}
        onClick={() => bump(product, v, 1)}
        className="grid h-10 w-10 place-items-center rounded-full bg-cocoa text-cream"
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}

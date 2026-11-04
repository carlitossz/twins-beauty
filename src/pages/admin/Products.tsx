import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, ProductImage, Spinner, ToneDot } from '../../components/ui'
import { api } from '../../lib/api'
import { hasTones, plural, totalStock, usd } from '../../lib/format'
import { useAsync } from '../../lib/store'
import { ErrorBox, PageTitle } from './shared'

export default function Products() {
  const { data: products, error, loading, reload } = useAsync(() => api.listProducts({ includeInactive: true }))
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (products ?? []).filter((p) => !q || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q))
  }, [products, query])

  return (
    <>
      <PageTitle
        title="Productos"
        subtitle="Agrega productos nuevos, cambia fotos, precios y tonos, u ocúltalos de la tienda."
        actions={
          <Link to="/admin/productos/nuevo" className="a-btn-dark">
            <Icon name="plus" size={16} /> Nuevo producto
          </Link>
        }
      />
      <input className="a-field mb-4 max-w-sm" type="search" placeholder="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar producto" />
      {loading && !products && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {products && products.length === 0 && (
        <div className="a-card flex flex-col items-start gap-3 p-6 text-sm">
          <p>Todavía no hay productos.</p>
          <Link to="/admin/productos/nuevo" className="a-btn-dark">
            Agregar el primero
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => {
          const tones = hasTones(p)
          const stock = totalStock(p)
          return (
            <Link key={p.id} to={`/admin/productos/${p.id}`} className="a-card flex flex-col gap-2 p-2.5 transition hover:border-mauve">
              <div className="relative aspect-square overflow-hidden rounded-xl">
                <ProductImage src={p.image_url} alt={p.name} className="h-full w-full" />
                {!p.active && <span className="absolute left-2 top-2 rounded-full bg-cocoa px-2 py-0.5 text-[10px] font-bold text-cream">OCULTO</span>}
              </div>
              <div className="flex flex-col gap-0.5 px-1 pb-1">
                <span className="text-sm font-bold leading-tight">{p.name}</span>
                <span className="text-xs text-muted">
                  {usd(p.price)} detal · {p.price_wholesale != null ? `${usd(p.price_wholesale)} mayor` : 'sin mayor'}
                </span>
                {tones ? (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    {p.variants.slice(0, 4).map((v) => (
                      <ToneDot key={v.id} hex={v.hex} size={10} />
                    ))}
                    {plural(p.variants.length, 'tono', 'tonos')} · {stock} uds
                  </span>
                ) : (
                  <span className="text-xs text-muted">{stock ? `${stock} uds` : 'Agotado'}</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShopShell } from '../../components/ShopLayout'
import { BackButton, Icon, ProductImage, Star, ToneDot } from '../../components/ui'
import { api } from '../../lib/api'
import { plural, usd } from '../../lib/format'
import { useAsync, useCart } from '../../lib/store'

export default function CartPage() {
  const cart = useCart()
  // Stock y precios actuales, para no dejar pedir más de lo que hay y cobrar el precio de hoy
  const { data: products } = useAsync(() => api.listProducts(), [])

  useEffect(() => {
    if (!products) return
    for (const i of cart.items) {
      const p = products.find((x) => x.id === i.product_id)
      if (p && (p.price !== i.price || p.price_wholesale !== i.price_wholesale)) {
        cart.add({ ...i, price: p.price, price_wholesale: p.price_wholesale }, 0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const stockOf = (variantId: string) => {
    if (!products) return Infinity
    for (const p of products) {
      const v = p.variants.find((x) => x.id === variantId)
      if (v) return v.stock
    }
    return 0
  }
  const problems = cart.items.filter((i) => i.qty > stockOf(i.variant_id))
  const { pricing, wholesaleMin } = cart
  const showProgress = wholesaleMin > 0 && pricing.eligibleUnits > 0
  const pct = Math.min(100, Math.round((pricing.eligibleUnits / Math.max(1, wholesaleMin)) * 100))

  return (
    <ShopShell header={false}>
      <header className="flex items-center gap-3 px-5 pb-2 pt-4">
        <BackButton to="/" label="Seguir comprando" />
        <h1 className="text-[22px] font-bold">Tu carrito</h1>
      </header>

      {cart.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
          <Star size={72} />
          <p className="text-lg font-bold">Tu carrito está vacío</p>
          <p className="max-w-[16rem] text-sm">Elige tus productos favoritos y tu tono para empezar.</p>
          <Link to="/" className="btn-primary mt-2 h-12">
            Ver el catálogo
          </Link>
        </div>
      ) : (
        <>
          <main className="flex flex-col gap-3.5 px-5 pb-56 pt-2">
            {showProgress && (
              <div className="flex flex-col gap-2.5 rounded-[20px] bg-blush p-4">
                <span className="text-[13px] font-semibold leading-snug">
                  {pricing.wholesale
                    ? '¡Precio al mayor activado! Ya estás ahorrando.'
                    : `Agrega ${plural(pricing.missing, 'producto más', 'productos más')} y pagas precio al mayor`}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={wholesaleMin} aria-valuenow={Math.min(pricing.eligibleUnits, wholesaleMin)} aria-label="Avance al precio al mayor">
                  <div className="h-full rounded-full bg-cocoa transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium">
                  {Math.min(pricing.eligibleUnits, wholesaleMin)} de {wholesaleMin} productos · se pueden mezclar
                </span>
              </div>
            )}

            {cart.items.map((i, idx) => {
              const stock = stockOf(i.variant_id)
              const unit = pricing.unit[idx]
              const atWholesale = pricing.wholesale && i.price_wholesale != null
              return (
                <div key={i.variant_id} className="flex items-center gap-3.5 rounded-[20px] bg-white p-3">
                  <Link to={`/producto/${i.product_id}`} className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-2xl">
                    <ProductImage src={i.image_url} alt={i.name} className="h-full w-full" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold leading-tight">{i.name}</span>
                    {i.tone && (
                      <span className="flex items-center gap-1.5 text-xs">
                        <ToneDot hex={i.hex} />
                        <span className="truncate">{i.tone}</span>
                      </span>
                    )}
                    <span className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-[15px] font-bold">{usd(unit)}</span>
                      <span className="text-[11px] font-semibold">{atWholesale ? 'c/u · precio mayor' : i.price_wholesale == null ? 'c/u · solo detal' : 'c/u'}</span>
                    </span>
                    {i.qty > stock && <span className="text-xs font-semibold text-[#8A2B1E]">{stock === 0 ? 'Se agotó este tono' : `Solo queda${stock === 1 ? '' : 'n'} ${stock}`}</span>}
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`Sumar un ${i.name}${i.tone ? ` ${i.tone}` : ''}`}
                      onClick={() => cart.setQty(i.variant_id, i.qty + 1)}
                      disabled={i.qty >= stock}
                      className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-cocoa disabled:opacity-30"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                    <span className="text-sm font-bold">{i.qty}</span>
                    <button
                      type="button"
                      aria-label={i.qty === 1 ? `Quitar ${i.name}${i.tone ? ` ${i.tone}` : ''}` : `Restar un ${i.name}`}
                      onClick={() => cart.setQty(i.variant_id, i.qty - 1)}
                      className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-cocoa"
                    >
                      <Icon name={i.qty === 1 ? 'trash' : 'minus'} size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
            <Link to="/" className="self-start text-sm font-semibold underline">
              Agregar más productos
            </Link>
          </main>

          <div className="fixed inset-x-0 bottom-0 z-10">
            <div className="mx-auto flex max-w-[34rem] flex-col gap-2.5 rounded-t-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(109,82,71,0.10)]">
              {pricing.wholesale && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal al detal</span>
                    <span>{usd(pricing.retail)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Descuento al mayor</span>
                    <span>−{usd(pricing.retail - pricing.total)}</span>
                  </div>
                </>
              )}
              <div className={`flex items-baseline justify-between ${pricing.wholesale ? 'border-t border-dashed border-line2 pt-2' : ''}`}>
                <span className="text-base font-semibold">Total · {plural(cart.count, 'producto', 'productos')}</span>
                <span className="text-[26px] font-bold">{usd(pricing.total)}</span>
              </div>
              {problems.length > 0 ? (
                <span className="btn-primary w-full bg-line2 text-center text-sm text-cocoa">Ajusta los productos marcados para continuar</span>
              ) : (
                <Link to="/pedido" className="btn-primary w-full">
                  Continuar con el pedido
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </ShopShell>
  )
}

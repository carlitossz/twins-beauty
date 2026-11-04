import { Link } from 'react-router-dom'
import { Icon, ProductImage, Spinner, ToneDot } from '../../components/ui'
import { api } from '../../lib/api'
import { bs, cop, orderTotal, plural, timeAgo, totalStock, usd } from '../../lib/format'
import { useAsync } from '../../lib/store'
import { useOrderAlerts } from './orderAlerts'
import { ErrorBox, PageTitle, StatusBadge } from './shared'

export default function Dashboard() {
  const { tick, permission, enableNotifications } = useOrderAlerts()
  const { data, error, loading, reload } = useAsync(() => Promise.all([api.listProducts({ includeInactive: true }), api.listOrders()]), [tick])

  if (loading && !data)
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  if (error || !data) return <ErrorBox message={error ?? 'No se pudo cargar'} onRetry={reload} />

  const [products, orders] = data
  const active = products.filter((p) => p.active)
  const stock = active.reduce((a, p) => a + totalStock(p), 0)
  const pending = orders.filter((o) => o.status === 'pendiente')
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const sold = orders.filter((o) => (o.status === 'pagado' || o.status === 'entregado') && new Date(o.created_at) >= monthStart)
  const units = sold.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0)
  const byCurrency = {
    USD: sold.filter((o) => o.currency === 'USD').reduce((a, o) => a + o.total_usd, 0),
    BS: sold.filter((o) => o.currency === 'BS').reduce((a, o) => a + (o.total_bs ?? 0), 0),
    BSnoRate: sold.filter((o) => o.currency === 'BS' && o.total_bs == null).reduce((a, o) => a + o.total_usd, 0),
    COP: sold.filter((o) => o.currency === 'COP').reduce((a, o) => a + (o.total_cop ?? 0), 0)
  }
  const lastUnits = active.flatMap((p) => p.variants.filter((v) => v.stock === 1).map((v) => ({ p, v })))
  const empty = active.filter((p) => totalStock(p) === 0)

  return (
    <>
      <PageTitle
        title="Inicio"
        subtitle={pending.length ? `Tienes ${plural(pending.length, 'pedido', 'pedidos')} por confirmar` : 'No hay pedidos pendientes'}
        actions={
          <>
            <button type="button" className="a-btn" onClick={reload} aria-label="Actualizar">
              <Icon name="refresh" size={16} />
            </button>
            <Link to="/admin/productos/nuevo" className="a-btn-dark">
              <Icon name="plus" size={16} /> Nuevo producto
            </Link>
          </>
        }
      />

      {permission !== 'granted' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-blush p-4 text-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cocoa text-cream">
            <Icon name="bag" size={18} />
          </span>
          <div className="min-w-0 flex-1 basis-56">
            <p className="font-bold">Aviso de pedidos nuevos</p>
            <p>
              {permission === 'denied'
                ? 'Las notificaciones están bloqueadas en este navegador. Con el panel abierto igual suena y aparece el aviso.'
                : permission === 'unsupported'
                  ? 'Con el panel abierto, cada pedido nuevo suena y aparece arriba. En iPhone, instala la app en la pantalla de inicio para recibir notificaciones.'
                  : 'Con el panel abierto, cada pedido nuevo suena y aparece arriba. Activa las notificaciones para enterarte aunque estés en otra pestaña.'}
            </p>
          </div>
          {permission === 'default' && (
            <button type="button" className="a-btn-dark" onClick={() => void enableNotifications()}>
              Activar notificaciones
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Unidades en stock" value={String(stock)} note={plural(active.length, 'producto activo', 'productos activos')} />
        <Kpi label="Por confirmar" value={String(pending.length)} note={plural(pending.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0), 'unidad apartada', 'unidades apartadas')} />
        <Kpi label="Vendidos este mes" value={String(units)} note={plural(sold.length, 'pedido pagado', 'pedidos pagados')} />
        <Kpi label="Última unidad" value={plural(lastUnits.length, 'tono', 'tonos')} note={empty.length ? `${plural(empty.length, 'producto agotado', 'productos agotados')}` : 'Revisa si reponer'} highlight />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="a-card min-w-0 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Por confirmar</h2>
            <Link to="/admin/pedidos" className="text-sm font-semibold underline">
              Ver pedidos
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted">Cuando una clienta haga un pedido aparece aquí, con los productos ya apartados.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.slice(0, 6).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-bold">
                      {o.code} · {o.customer_name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {o.items.map((i) => `${i.product_name}${i.tone ? ` (${i.tone})` : ''}`).join(', ')} · {timeAgo(o.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{orderTotal(o)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="a-card flex flex-col gap-2.5 p-5">
            <h2 className="text-lg font-bold">Cobrado este mes</h2>
            <Row label="Dólares" value={usd(byCurrency.USD)} />
            <Row label="Bolívares" value={bs(byCurrency.BS)} />
            {byCurrency.BSnoRate > 0 && <Row label="Bs sin tasa cargada" value={`${usd(byCurrency.BSnoRate)} en Bs`} />}
            {byCurrency.COP > 0 && <Row label="Pesos" value={cop(byCurrency.COP)} />}
            <p className="text-xs text-muted">Cada moneda se suma aparte, para que cuadre con la caja y las cuentas.</p>
          </section>

          <section className="a-card flex flex-col gap-2 p-5">
            <h2 className="text-lg font-bold">Última unidad</h2>
            {lastUnits.length === 0 ? (
              <p className="text-sm text-muted">Ningún tono está en su última unidad.</p>
            ) : (
              lastUnits.slice(0, 8).map(({ p, v }) => (
                <div key={v.id} className="flex items-center gap-3 text-sm">
                  <ProductImage src={p.image_url} alt="" className="h-9 w-9 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    {v.name && (
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <ToneDot hex={v.hex} size={10} /> {v.name}
                      </span>
                    )}
                  </span>
                  <span className="rounded-full bg-blush px-2 py-0.5 text-xs font-bold">1</span>
                </div>
              ))
            )}
            <Link to="/admin/inventario" className="mt-1 text-sm font-semibold underline">
              Ir al inventario
            </Link>
          </section>
        </div>
      </div>
    </>
  )
}

function Kpi({ label, value, note, highlight = false }: { label: string; value: string; note: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl p-4 ${highlight ? 'bg-blush' : 'border border-line bg-white'}`}>
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className="text-[28px] font-bold leading-none">{value}</span>
      <span className="text-xs text-muted">{note}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

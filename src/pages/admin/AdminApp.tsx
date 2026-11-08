import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { DemoBanner, Icon, Iso, Logo, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { DEMO_PASSWORD } from '../../lib/demoApi'
import { errorMessage } from '../../lib/format'
import Dashboard from './Dashboard'
import ExternalSale from './ExternalSale'
import Inventory from './Inventory'
import { OrderAlertsProvider, useOrderAlerts } from './orderAlerts'
import Orders from './Orders'
import ProductForm from './ProductForm'
import Products from './Products'
import Reports from './Reports'
import SettingsPage from './SettingsPage'

const NAV = [
  { to: '/admin', label: 'Inicio', icon: 'home', end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: 'list', end: false },
  { to: '/admin/inventario', label: 'Inventario', short: 'Stock', icon: 'box', end: false },
  { to: '/admin/productos', label: 'Productos', icon: 'palette', end: false },
  { to: '/admin/externas', label: 'Externas', icon: 'bag', end: false },
  { to: '/admin/reportes', label: 'Reportes', icon: 'chart', end: false },
  { to: '/admin/ajustes', label: 'Ajustes', icon: 'gear', end: false }
] as const

export default function AdminApp() {
  const [email, setEmail] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    api
      .getSessionEmail()
      .then(setEmail)
      .catch(() => setEmail(null))
  }, [])

  if (email === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream">
        <Spinner />
      </div>
    )
  }
  if (!email) return <Login onDone={setEmail} />

  async function logout() {
    await api.signOut()
    setEmail(null)
  }

  return (
    <OrderAlertsProvider>
      <AdminShell email={email} onLogout={logout} />
    </OrderAlertsProvider>
  )
}

function AdminShell({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { pathname } = useLocation()
  const { pending } = useOrderAlerts()

  return (
    <div className="min-h-screen bg-cream text-cocoa">
      <DemoBanner />
      <div className="md:flex">
        {/* Menú lateral (computadora) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 bg-cocoa px-4 py-6 text-cream md:flex">
          <div className="flex items-center justify-between px-2">
            <Logo height={34} variant="cream" />
            <span className="rounded-md border border-cream/40 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em]">PANEL</span>
          </div>
          <nav aria-label="Panel" className="flex flex-col gap-0.5">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold ${isActive ? 'bg-cream text-cocoa' : 'hover:bg-cocoa2'}`}
              >
                <Icon name={n.icon} size={18} />
                {n.label}
                {n.to === '/admin/pedidos' && pending.length > 0 && (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-blush px-1.5 text-[11px] font-bold text-cocoa">{pending.length}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 px-2 text-xs">
            <a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer" className="font-semibold underline">
              Ver la tienda
            </a>
            <span className="truncate text-cream/75">{email}</span>
            <button type="button" onClick={onLogout} className="flex h-9 items-center gap-2 font-semibold text-cream/85 hover:text-cream">
              <Icon name="out" size={16} /> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Barra superior (teléfono) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-cream/95 px-4 py-2.5 backdrop-blur md:hidden">
          <span className="flex items-center gap-2.5">
            <Iso size={36} />
            <span className="text-sm font-bold">Panel Twins Beauty</span>
          </span>
          <div className="flex items-center gap-2">
            <a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer" className="rounded-full border border-line2 bg-white px-3 py-1.5 text-xs font-semibold">
              Ver tienda
            </a>
            <button type="button" onClick={onLogout} aria-label="Cerrar sesión" className="grid h-9 w-9 place-items-center rounded-full border border-line2 bg-white">
              <Icon name="out" size={16} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-10 md:pb-12 md:pt-8">
          <div key={pathname} className="animate-page-in mx-auto max-w-6xl">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="pedidos" element={<Orders />} />
              <Route path="inventario" element={<Inventory />} />
              <Route path="productos" element={<Products />} />
              <Route path="productos/nuevo" element={<ProductForm />} />
              <Route path="productos/:id" element={<ProductForm />} />
              <Route path="externas" element={<ExternalSale />} />
              <Route path="reportes" element={<Reports />} />
              <Route path="ajustes" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Menú inferior (teléfono) */}
      <nav aria-label="Panel" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(109,82,71,0.10)] md:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="flex h-[68px] flex-col items-center justify-center gap-1 text-[10px] font-semibold">
            {({ isActive }) => (
              <>
                <span className={`relative grid h-7 w-10 place-items-center rounded-full ${isActive ? 'bg-blush' : ''}`}>
                  <Icon name={n.icon} size={19} />
                  {n.to === '/admin/pedidos' && pending.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-cocoa px-1 text-[10px] font-bold text-cream">{pending.length}</span>
                  )}
                </span>
                <span className="md:hidden">{'short' in n ? n.short : n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function Login({ onDone }: { onDone: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const demo = api.mode === 'demo'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.signIn(email.trim(), password)
      onDone((await api.getSessionEmail()) ?? email)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-mauve">
      <DemoBanner />
      <div className="grid min-h-[calc(100vh-30px)] place-items-center px-5 py-10">
        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5 rounded-[28px] bg-cream p-7">
          <div className="flex flex-col items-center gap-3">
            <Iso size={72} />
            <Logo height={40} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">Entrar al panel</h1>
            <p className="text-sm">Pedidos, inventario y productos de la tienda.</p>
          </div>
          {!demo && (
            <label className="a-label">
              Correo
              <input className="a-field h-12 text-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
          )}
          <label className="a-label">
            Contraseña
            <input className="a-field h-12 text-base" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {demo && (
            <p className="rounded-xl bg-blush px-3 py-2 text-xs">
              Versión de prueba: la contraseña es <b>{DEMO_PASSWORD}</b>
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-[#FBE3DE] px-3 py-2 text-sm font-semibold text-[#8A2B1E]">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary h-12 text-base">
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

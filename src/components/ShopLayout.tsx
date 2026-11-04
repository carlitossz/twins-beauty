import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCart, useSettings } from '../lib/store'
import { waLink } from '../lib/whatsapp'
import { DemoBanner, Icon, Logo } from './ui'

export function CartButton() {
  const { count } = useCart()
  return (
    <Link
      to="/carrito"
      aria-label={count ? `Ver carrito, ${count} ${count === 1 ? 'producto' : 'productos'}` : 'Ver carrito'}
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cocoa text-cream"
    >
      <Icon name="bag" size={20} />
      {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-blush px-1 text-[11px] font-bold text-cocoa">{count}</span>}
    </Link>
  )
}

export function WhatsAppFab({ raised = false }: { raised?: boolean }) {
  const { settings } = useSettings()
  const href = waLink(settings?.whatsapp ?? '', `Hola ${settings?.store_name ?? 'Twins Beauty'}, tengo una pregunta`)
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribir por WhatsApp"
      className={`fixed right-4 z-20 grid h-14 w-14 place-items-center rounded-full border-[1.5px] border-cocoa bg-cream text-cocoa shadow-[0_8px_22px_rgba(109,82,71,0.25)] md:right-[max(1rem,calc(50%-15rem))] ${
        raised ? 'bottom-24' : 'bottom-5'
      }`}
    >
      <Icon name="wa" size={24} />
    </a>
  )
}

/** Contenedor de la tienda: ancho de teléfono, centrado en pantallas grandes */
export function ShopShell({ children, header = true }: { children: ReactNode; header?: boolean }) {
  return (
    <div className="min-h-screen bg-cream">
      <DemoBanner />
      <div className="mx-auto min-h-screen max-w-[34rem]">
        {header && (
          <header className="sticky top-0 z-10 flex items-center justify-between bg-cream/95 px-5 pb-3 pt-4 backdrop-blur">
            <span className="w-11" aria-hidden="true" />
            <Link to="/" aria-label="Twins Beauty, inicio">
              <Logo height={38} />
            </Link>
            <CartButton />
          </header>
        )}
        {children}
      </div>
    </div>
  )
}

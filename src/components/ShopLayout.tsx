import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usd } from '../lib/format'
import { useCart, useSettings } from '../lib/store'
import { waLink } from '../lib/whatsapp'
import { DemoBanner, Icon, Logo } from './ui'

/** Botón del carrito. En computadora muestra también el total */
export function CartButton() {
  const { count, pricing } = useCart()
  return (
    <Link
      to="/carrito"
      aria-label={count ? `Ver carrito, ${count} ${count === 1 ? 'producto' : 'productos'}` : 'Ver carrito'}
      className="relative flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-cocoa text-cream transition active:scale-95 lg:px-4"
    >
      <Icon name="bag" size={20} />
      {count > 0 && <span className="hidden text-sm font-semibold lg:inline">{usd(pricing.total)}</span>}
      {count > 0 && <span key={count} className="animate-pop absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-blush px-1 text-[11px] font-bold text-cocoa">{count}</span>}
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
      className={`fixed right-4 z-20 grid h-14 w-14 place-items-center rounded-full border-[1.5px] border-cocoa bg-cream text-cocoa shadow-[0_8px_22px_rgba(109,82,71,0.25)] lg:hidden ${
        raised ? 'bottom-24' : 'bottom-5'
      }`}
    >
      <Icon name="wa" size={24} />
    </a>
  )
}

/**
 * Contenedor de la tienda.
 * Teléfono: una columna del ancho de la pantalla. Computadora (lg): página ancha, centrada, con su propia cabecera.
 * Las pantallas que no se adaptan a columnas (ej. la de "Gracias") usan narrow.
 * header="desktop": la cabecera sale solo en computadora (en teléfono la pantalla trae sus propios botones).
 */
export function ShopShell({ children, header = true, narrow = false }: { children: ReactNode; header?: boolean | 'desktop'; narrow?: boolean }) {
  const { settings } = useSettings()
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-cream">
      <DemoBanner />
      {header && (
        <header className={`sticky top-0 z-10 bg-cream/95 backdrop-blur lg:border-b lg:border-line ${header === 'desktop' ? 'hidden lg:block' : ''}`}>
          <div className={`mx-auto flex items-center justify-between px-5 pb-3 pt-4 lg:py-4 ${narrow ? 'max-w-[34rem]' : 'max-w-[34rem] lg:max-w-[1560px] lg:px-10'}`}>
            <span className="w-11 lg:hidden" aria-hidden="true" />
            <Link to="/" aria-label="Twins Beauty, inicio">
              <Logo height={38} className="lg:h-[42px]" />
            </Link>
            <div className="flex items-center gap-3">
              <a
                href={waLink(settings?.whatsapp ?? '', `Hola ${settings?.store_name ?? 'Twins Beauty'}, tengo una pregunta`)}
                target="_blank"
                rel="noreferrer"
                className="hidden h-11 items-center gap-2 rounded-full border-[1.5px] border-cocoa px-4 text-sm font-semibold lg:flex"
              >
                <Icon name="wa" size={18} /> Escríbenos
              </a>
              <CartButton />
            </div>
          </div>
        </header>
      )}
      <div key={pathname} className={`animate-page-in mx-auto min-h-screen ${narrow ? 'max-w-[34rem]' : 'max-w-[34rem] lg:max-w-[1560px] lg:px-5'}`}>{children}</div>
    </div>
  )
}

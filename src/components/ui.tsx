import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, configError } from '../lib/api'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

export function Logo({ height = 36, variant = 'cocoa', className = '' }: { height?: number; variant?: 'cocoa' | 'blush' | 'cream'; className?: string }) {
  return <img src={asset(`logo/wordmark-${variant}.png`)} alt="Twins Beauty" style={{ height }} className={`w-auto ${className}`} />
}

export function Iso({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <img src={asset('logo/iso.png')} alt="" width={size} height={size} className={`rounded-full ${className}`} />
}

/** Estrella de 12 puntas del brandboard */
export function Star({ size = 40, color = '#F7A8E6', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <polygon
        fill={color}
        points="50,0 57,23.9 75,6.7 69.1,30.9 93.3,25 76.1,43 100,50 76.1,57 93.3,75 69.1,69.1 75,93.3 57,76.1 50,100 43,76.1 25,93.3 30.9,69.1 6.7,75 23.9,57 0,50 23.9,43 6.7,25 30.9,30.9 25,6.7 43,23.9"
      />
    </svg>
  )
}

type IconName =
  | 'back'
  | 'bag'
  | 'search'
  | 'wa'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'check'
  | 'x'
  | 'home'
  | 'box'
  | 'list'
  | 'gear'
  | 'out'
  | 'up'
  | 'edit'
  | 'refresh'
  | 'pin'
  | 'truck'
  | 'card'
  | 'chevron'
  | 'copy'
  | 'chart'
  | 'download'
  | 'heart'
  | 'sparkle'
  | 'palette'
  | 'send'
  | 'image'

const PATHS: Record<IconName, ReactNode> = {
  back: <path d="M15 5l-7 7 7 7" />,
  bag: (
    <>
      <path d="M5 8h14l-1.2 12H6.2z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  wa: (
    <>
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
      <path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1.2-1.2 2 .9c-.2 1.3-1.3 2-2.5 1.8C11 15 9 13 8.5 10.3 8.3 9 9 8 10.3 7.8l.9 2z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  home: <path d="M4 11l8-7 8 7v9H4z" />,
  box: (
    <>
      <path d="M3 7l9-4 9 4-9 4z" />
      <path d="M3 7v10l9 4 9-4V7M12 11v10" />
    </>
  ),
  list: <path d="M6 4h12v16l-3-2-3 2-3-2-3 2zM9 9h6M9 13h4" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </>
  ),
  out: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  up: (
    <>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 15v5h16v-5" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  pin: (
    <>
      <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-9.6-9.3C.9 7.2 3 3.5 6.6 3.5c2 0 3.4 1.1 4.2 2.4h2.4c.8-1.3 2.2-2.4 4.2-2.4 3.6 0 5.7 3.7 4.2 7.2C19.5 15.4 12 20 12 20z" />,
  sparkle: <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1.2" />
      <circle cx="10" cy="7" r="1.2" />
      <circle cx="15" cy="7.5" r="1.2" />
    </>
  ),
  send: <path d="M4 12l16-8-6 16-2.5-6.5z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-9 9" />
    </>
  )
}

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {PATHS[name]}
    </svg>
  )
}

export function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block h-7 w-7 animate-spin rounded-full border-[3px] ${light ? 'border-cream/40 border-t-cream' : 'border-line2 border-t-cocoa'}`}
    />
  )
}

export function BackButton({ to, label = 'Volver' }: { to: string; label?: string }) {
  return (
    <Link to={to} aria-label={label} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-cocoa bg-cream/80 text-cocoa backdrop-blur">
      <Icon name="back" />
    </Link>
  )
}

export function ProductImage({ src, alt, className = '', fit = 'cover' }: { src: string | null; alt: string; className?: string; fit?: 'cover' | 'contain' }) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-white text-line2 ${className}`} role="img" aria-label={alt}>
        <Star size={48} color="#EAD9CC" />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" className={`${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`} />
}

/** Circulito con el color de un tono */
export function ToneDot({ hex, size = 12, className = '' }: { hex: string; size?: number; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(109,82,71,0.28)] ${className}`} style={{ width: size, height: size, background: hex || '#EAD9CC' }} />
}

/**
 * Datos de un método de pago: nota + renglones, cada uno con botón de copiar solo si corresponde.
 * Con 2 datos o más sale además "Copiar todos los datos": copia un bloque con todo (y el monto, si se conoce)
 * para pegarlo de una vez en la app del banco o mandárselo a quien va a pagar.
 */
export function PaymentDetailsBox({
  name,
  note,
  fields,
  cash,
  amount
}: {
  name?: string
  note: string
  fields: { label: string; value: string; copyable: boolean }[]
  cash: boolean
  /** Monto a pagar ya en la moneda del método, sin símbolo (ej. "1234,56") */
  amount?: string | null
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const shown = fields.filter((f) => f.value.trim())
  if (!note && shown.length === 0) return null

  const allText = [name, ...shown.map((f) => (f.label ? `${f.label}: ${f.value.trim()}` : f.value.trim())), ...(amount ? [`Monto: ${amount}`] : [])].filter(Boolean).join('\n')

  async function copy(value: string, i: number) {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      /* el navegador no dejó copiar; el texto sigue visible para copiarlo a mano */
    }
    setCopiedIdx(i)
    setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1500)
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-white p-4">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Datos para pagar</span>
      {note && <p className="text-[13px] text-muted">{note}</p>}
      {shown.length >= 2 && (
        <button
          type="button"
          onClick={() => copy(allText, -1)}
          className={`flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition ${copiedIdx === -1 ? 'bg-blush text-cocoa' : 'bg-cocoa text-cream'}`}
        >
          <Icon name={copiedIdx === -1 ? 'check' : 'copy'} size={17} />
          {copiedIdx === -1 ? '¡Datos copiados! Pégalos en tu banco' : amount ? 'Copiar todos los datos y el monto' : 'Copiar todos los datos'}
        </button>
      )}
      {shown.map((f, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            {f.label && <span className="text-[11px] font-medium text-muted">{f.label}</span>}
            <span className="truncate text-[15px] font-semibold">{f.value}</span>
          </span>
          {f.copyable && (
            <button
              type="button"
              onClick={() => copy(f.value, i)}
              aria-label={`Copiar ${f.label || 'dato'}`}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-xs font-semibold transition ${
                copiedIdx === i ? 'border-cocoa bg-cocoa text-cream' : 'border-cocoa text-cocoa'
              }`}
            >
              <Icon name={copiedIdx === i ? 'check' : 'copy'} size={14} />
              {copiedIdx === i ? 'Copiado' : 'Copiar'}
            </button>
          )}
        </div>
      ))}
      {!cash && (
        <p className="mt-1 flex items-start gap-2 rounded-2xl bg-blush px-3 py-2.5 text-[12px] font-semibold leading-snug">
          <Icon name="wa" size={15} className="mt-px shrink-0" />
          Después de pagar, envía la captura del comprobante por WhatsApp para confirmarte más rápido.
        </p>
      )}
    </div>
  )
}

export function DemoBanner() {
  if (configError) {
    return <div className="bg-[#8A2B1E] px-4 py-2 text-center text-xs font-semibold text-white">{configError} Mientras tanto la app corre en modo prueba.</div>
  }
  if (api.mode !== 'demo') return null
  return <div className="bg-cocoa px-4 py-1.5 text-center text-[11px] font-semibold text-cream">Versión de prueba · los datos se guardan solo en este navegador</div>
}

/** Método cuyos datos se dan por WhatsApp (no están publicados en la página, ej. Zelle) */
export function PaymentByWhatsAppBox({ name, note, sent = false }: { name: string; note: string; sent?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] bg-blush p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cocoa text-cream">
        <Icon name="wa" size={20} />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold">Los datos de {name} te los pasamos por WhatsApp</span>
        <span className="text-[13px] leading-snug">
          {sent
            ? `Al enviar el pedido por WhatsApp ya van pedidos los datos de ${name}. Ahí te los pasamos para que hagas el pago.`
            : `Haz tu pedido y, al enviarlo por WhatsApp, te pasamos los datos de ${name} para que pagues. El mensaje ya los pide por ti.`}
        </span>
        {note && <span className="text-[12px] text-muted">{note}</span>}
      </div>
    </div>
  )
}

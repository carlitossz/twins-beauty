import { Link, useLocation, useParams } from 'react-router-dom'
import { DemoBanner, Icon, Logo, PaymentDetailsBox, Star } from '../../components/ui'
import { hoursText } from '../../lib/format'
import { useSettings } from '../../lib/store'
import { waLink } from '../../lib/whatsapp'
import { LAST_ORDER_KEY } from './Checkout'

interface Done {
  code: string
  message: string
  total: string
  saving: string | null
  payment: string
  paymentCash: boolean
  customerName: string
  reserveHours?: number
}

function readDone(code: string, state: unknown): Done | null {
  if (state && typeof state === 'object' && (state as Done).code === code) return state as Done
  try {
    const d = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null') as Done | null
    return d && d.code === code ? d : null
  } catch {
    return null
  }
}

export default function OrderDone() {
  const { code = '' } = useParams()
  const { state } = useLocation()
  const { settings } = useSettings()
  const done = readDone(code, state)
  const method = settings?.payment_methods.find((m) => m.name === done?.payment)

  return (
    <div className="min-h-screen bg-mauve">
      <DemoBanner />
      <div className="relative mx-auto flex min-h-screen max-w-[34rem] flex-col items-center gap-6 overflow-hidden px-5 pb-12 pt-8">
        <Star size={220} color="#FEDDF8" className="animate-spin-slow pointer-events-none absolute -right-24 top-28" />
        <Link to="/" aria-label="Twins Beauty, inicio" className="relative">
          <Logo height={44} variant="blush" />
        </Link>

        <section className="relative flex w-full flex-col gap-4 rounded-[26px] bg-cream px-6 pb-6 pt-7 shadow-[0_16px_40px_rgba(77,55,47,0.25)]">
          <div className="flex flex-col items-center">
            <h1 className="font-script text-[64px] font-normal leading-none">Gracias</h1>
            <span className="text-sm font-medium">por ser mi cliente</span>
          </div>
          <p className="text-center text-sm leading-relaxed">
            Tu pedido <b className="font-bold">{code}</b> está apartado
            {done && (
              <>
                {' '}
                · Total <b className="font-bold">{done.total}</b>
              </>
            )}
            .{done?.saving && <span className="block font-semibold">Ahorraste {done.saving} con el precio al mayor.</span>}
          </p>

          {done ? (
            <>
              <div className="flex flex-col gap-1 rounded-[20px] bg-white p-4">
                <span className="text-sm font-bold">Último paso: envíanos el pedido por WhatsApp</span>
                <span className="text-[13px]">Ahí te confirmamos el pago y la entrega.</span>
                {!!done.reserveHours && (
                  <span className="mt-1 text-[12px] font-semibold">
                    Tus productos quedan apartados por {hoursText(done.reserveHours)}. Si no se confirma el pago en ese tiempo, se liberan para otras clientas.
                  </span>
                )}
              </div>
              <a href={waLink(settings?.whatsapp ?? '', done.message)} target="_blank" rel="noreferrer" className="btn-primary w-full">
                <Icon name="wa" size={22} /> Enviar pedido por WhatsApp
              </a>
              {method && !method.cash && <PaymentDetailsBox note={method.note} fields={method.fields} cash={false} />}
              <details className="rounded-[20px] bg-white p-4 text-sm">
                <summary className="cursor-pointer font-semibold">Ver el mensaje</summary>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed">{done.message}</pre>
              </details>
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="flex items-center gap-1.5 text-[13px] font-medium">
                  Pedido empaquetado para <Icon name="heart" size={14} className="fill-cocoa" />
                </span>
                <span className="border-b-2 border-cocoa pb-1.5 text-base font-semibold">{done.customerName}</span>
                <span className="pt-1 text-center text-xs">@twinsbeauty.sc</span>
              </div>
            </>
          ) : (
            <a href={waLink(settings?.whatsapp ?? '', `Hola, hice el pedido ${code}`)} target="_blank" rel="noreferrer" className="btn-primary w-full">
              <Icon name="wa" size={22} /> Escribir por WhatsApp
            </a>
          )}
        </section>

        <Link to="/" className="relative flex h-14 w-full items-center justify-center rounded-full bg-cocoa text-[15px] font-semibold text-cream">
          Volver a la tienda
        </Link>
      </div>
    </div>
  )
}

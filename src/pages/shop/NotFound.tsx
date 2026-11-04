import { Link } from 'react-router-dom'
import { ShopShell } from '../../components/ShopLayout'
import { Star } from '../../components/ui'

export default function NotFound() {
  return (
    <ShopShell>
      <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
        <Star size={72} />
        <h1 className="text-xl font-bold">Esta página no existe</h1>
        <Link to="/" className="btn-primary mt-2 h-12">
          Ir al catálogo
        </Link>
      </div>
    </ShopShell>
  )
}

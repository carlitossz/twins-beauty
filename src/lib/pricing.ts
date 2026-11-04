// Regla del precio al mayor, igual que en la base de datos (_fill_order_items):
// si el pedido lleva wholesale_min productos o más CON precio al mayor (se pueden mezclar),
// esos productos se cobran al mayor. Los que solo se venden al detal siguen a su precio.

export interface PricedLine {
  qty: number
  price: number
  price_wholesale: number | null
}

export interface CartPricing {
  /** Productos del carrito que cuentan para el mayor */
  eligibleUnits: number
  /** Cuántos faltan para llegar al mayor (0 si ya llegó o si no hay precio al mayor) */
  missing: number
  wholesale: boolean
  /** Total a pagar en dólares */
  total: number
  /** Lo que costaría todo al detal */
  retail: number
  /** Precio por unidad que se cobra en cada línea, en el mismo orden */
  unit: number[]
}

export function priceCart(lines: PricedLine[], wholesaleMin: number, force?: boolean): CartPricing {
  const eligibleUnits = lines.reduce((a, l) => a + (l.price_wholesale != null ? l.qty : 0), 0)
  const enabled = wholesaleMin > 0
  const wholesale = force ?? (enabled && eligibleUnits >= wholesaleMin)
  const unit = lines.map((l) => (wholesale && l.price_wholesale != null ? l.price_wholesale : l.price))
  const round = (n: number) => Math.round(n * 100) / 100
  const total = round(lines.reduce((a, l, i) => a + unit[i] * l.qty, 0))
  const retail = round(lines.reduce((a, l) => a + l.price * l.qty, 0))
  return {
    eligibleUnits,
    missing: enabled && !wholesale && eligibleUnits > 0 ? wholesaleMin - eligibleUnits : 0,
    wholesale: wholesale && retail !== total,
    total,
    retail,
    unit
  }
}

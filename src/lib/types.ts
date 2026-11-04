export type Currency = 'USD' | 'COP' | 'BS'

/** Un tono del producto. Si el producto no tiene tonos, tiene una sola fila con name = '' */
export interface Variant {
  id: string
  product_id: string
  /** Nombre del tono. '' = producto sin tonos */
  name: string
  /** Color del circulito, ej. #E2BC9A */
  hex: string
  /** Foto opcional de ese tono: si existe, la foto grande cambia al elegirlo */
  image_url: string | null
  /** Grupo opcional para ordenar, ej. "Con brillo" o "Claros" */
  grp: string
  sort: number
  stock: number
}

export interface Product {
  id: string
  name: string
  /** Nombre oficial o presentación, ej. "Halo Glow Powder Filter · 10 g" */
  subtitle: string
  brand: string
  category: string
  badge: string
  description: string
  /** Precio al detal, en dólares */
  price: number
  /** Precio al mayor en dólares. null = solo se vende al detal */
  price_wholesale: number | null
  /** Foto principal: siempre es la primera de "images" que no esté vacía */
  image_url: string | null
  /** Hasta 3 fotos del producto */
  images: string[]
  /** Foto opcional con la carta de tonos */
  swatch_url: string | null
  active: boolean
  sort: number
  created_at: string
  variants: Variant[]
}

export interface PaymentField {
  /** Ej. "Banco", "Teléfono", "Cédula" */
  label: string
  value: string
  /** Si le sale al cliente con botón de copiar (teléfono, cédula) o solo como texto (nombre del banco) */
  copyable: boolean
}

export interface PaymentMethod {
  name: string
  currency: Currency
  /** Texto corto, no copiable, ej. "A la tasa del día" */
  note: string
  fields: PaymentField[]
  enabled: boolean
  /** Es efectivo en mano: el cliente puede decir con cuánto paga para preparar el vuelto */
  cash: boolean
}

export interface Settings {
  store_name: string
  whatsapp: string
  bs_rate: number | null
  cop_rate: number | null
  /** Cuántos productos (con precio al mayor) hacen falta para cobrar al mayor. 0 = sin precio al mayor */
  wholesale_min: number
  pickup_info: string
  delivery_info: string
  shipping_info: string
  /** Agencias para envío nacional. Vacío = el cliente la escribe */
  agencies: string[]
  payment_methods: PaymentMethod[]
  /** Horas que un pedido sin pagar mantiene apartados sus productos. 0 = no se libera solo */
  reserve_hours: number
}

export type OrderStatus = 'pendiente' | 'pagado' | 'entregado' | 'cancelado'
export type Delivery = 'pickup' | 'delivery' | 'envio'

export interface OrderItem {
  id: string
  product_id: string | null
  variant_id: string | null
  product_name: string
  /** Tono pedido, copiado al momento de la compra. '' = sin tono */
  tone: string
  qty: number
  unit_usd: number
  wholesale: boolean
}

export type OrderChannel = 'tienda' | 'externa'

export interface Order {
  id: string
  code: string
  customer_name: string
  customer_phone: string
  id_number: string
  delivery: Delivery
  address: string
  state: string
  city: string
  agency: string
  payment_method: string
  currency: Currency
  total_usd: number
  retail_usd: number
  total_bs: number | null
  total_cop: number | null
  wholesale: boolean
  cash_amount: number | null
  status: OrderStatus
  channel: OrderChannel
  notes: string
  created_at: string
  items: OrderItem[]
}

export type PendingOrder = Pick<Order, 'id' | 'code' | 'customer_name' | 'currency' | 'total_usd' | 'total_bs' | 'total_cop' | 'created_at'>

export interface NewOrder {
  customer_name: string
  customer_phone: string
  delivery: Delivery
  address: string
  id_number: string
  state: string
  city: string
  agency: string
  payment_method: string
  items: { variant_id: string; qty: number }[]
  /** Con cuánto va a pagar el cliente (solo efectivo), para calcular el vuelto. null = paga exacto o no aplica */
  cash_amount: number | null
}

export interface OrderResult {
  code: string
  total_usd: number
  retail_usd: number
  wholesale: boolean
  total_bs: number | null
  total_cop: number | null
  currency: Currency
}

/** Venta que pasó fuera de la app, registrada a mano por el admin */
export interface ExternalSaleInput {
  customer_name: string
  currency: Currency
  payment_method: string
  notes: string
  /** Cobrar con precio al mayor */
  wholesale: boolean
  items: { variant_id: string; qty: number }[]
}

/** Un tono tal como se edita en el panel */
export interface ToneInput {
  /** id del tono si ya existe */
  id?: string
  name: string
  hex: string
  image_url: string | null
  grp: string
  stock: number
}

/** Datos para crear o editar un producto desde el panel */
export interface ProductInput {
  id?: string
  name: string
  subtitle: string
  brand: string
  category: string
  badge: string
  description: string
  price: number
  price_wholesale: number | null
  images: string[]
  swatch_url: string | null
  active: boolean
  /** true = el producto tiene tonos (cada uno con su stock) */
  hasTones: boolean
  tones: ToneInput[]
  /** Stock cuando el producto NO tiene tonos */
  stock: number
}

export interface Api {
  mode: 'supabase' | 'demo'
  getSettings(): Promise<Settings>
  listProducts(opts?: { includeInactive?: boolean }): Promise<Product[]>
  getProduct(id: string): Promise<Product | null>
  createOrder(order: NewOrder): Promise<OrderResult>
  // Admin
  getSessionEmail(): Promise<string | null>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  listOrders(): Promise<Order[]>
  /** Pedidos por confirmar, sin detalle: lo usa el aviso de pedidos nuevos */
  pendingOrders(): Promise<PendingOrder[]>
  createExternalSale(sale: ExternalSaleInput): Promise<OrderResult>
  setOrderStatus(orderId: string, status: OrderStatus): Promise<void>
  setStock(variantId: string, stock: number): Promise<void>
  saveProduct(input: ProductInput): Promise<string>
  deleteProduct(id: string): Promise<void>
  uploadImage(file: File): Promise<string>
  saveSettings(settings: Settings): Promise<void>
}

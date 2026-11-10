// Modo demo: todo se guarda en el navegador. Sirve para enseñar la app sin base de datos.
// Las cantidades son de ejemplo: las reales se cargan desde el panel.
import { CATALOG } from './catalog'
import { convert } from './format'
import { priceCart } from './pricing'
import type { Api, Currency, Order, OrderResult, Product, Settings, Variant } from './types'

export const DEMO_PASSWORD = 'twins2026'

const KEY = 'twins-demo-v1'
const SESSION_KEY = 'twins-demo-session'

interface DemoDb {
  settings: Settings
  products: Product[]
  orders: Order[]
  nextCode: number
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

/** Número "al azar" pero siempre igual para el mismo texto, para que la demo no cambie en cada carga */
function pseudo(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return Math.abs(h)
}

function seed(): DemoDb {
  const now = Date.now()
  const products: Product[] = CATALOG.map((c, i) => {
    const id = `p${i + 1}`
    const variants: Variant[] = c.tones?.length
      ? c.tones.map((t, k) => ({
          id: `${id}-t${k}`,
          product_id: id,
          name: t.name,
          hex: t.hex,
          image_url: t.image ? asset(t.image) : null,
          grp: t.grp ?? '',
          sort: k,
          stock: [0, 1, 2, 3, 4][pseudo(c.slug + t.name) % 5]
        }))
      : [{ id: `${id}-u`, product_id: id, name: '', hex: '', image_url: null, grp: '', sort: 0, stock: 2 + (pseudo(c.slug) % 5) }]
    return {
      id,
      name: c.name,
      subtitle: c.subtitle,
      brand: c.brand,
      category: c.category,
      badge: c.badge ?? '',
      description: c.description ?? '',
      price: c.price,
      price_wholesale: c.wholesale,
      image_url: asset(c.image),
      images: [asset(c.image)],
      swatch_url: c.swatch ? asset(c.swatch) : null,
      active: !c.hidden,
      sort: i,
      created_at: new Date(now - i * 60000).toISOString(),
      variants
    }
  })
  return {
    settings: {
      store_name: 'Twins Beauty',
      whatsapp: '',
      bs_rate: null,
      cop_rate: null,
      wholesale_min: 6,
      reserve_hours: 24,
      pickup_info: 'Acordamos el punto de entrega por WhatsApp.',
      delivery_info: 'Te lo llevamos a tu casa. El costo depende de la zona; te lo confirmamos por WhatsApp.',
      shipping_info: 'Enviamos a todo el país por agencia. El envío lo pagas al recibir.',
      agencies: [],
      payment_methods: [
        {
          name: 'Pago móvil',
          currency: 'BS',
          note: 'A la tasa del día.',
          fields: [
            { label: 'Banco', value: 'Banco de ejemplo', copyable: false },
            { label: 'Teléfono', value: '0414-0000000', copyable: true },
            { label: 'Cédula', value: 'V-00000000', copyable: true }
          ],
          enabled: true,
          cash: false
        },
        { name: 'Efectivo $', currency: 'USD', note: 'Pagas en dólares al recibir.', fields: [], enabled: true, cash: true },
        { name: 'Zelle', currency: 'USD', note: '', fields: [], enabled: true, cash: false },
        { name: 'Binance', currency: 'USD', note: '', fields: [{ label: 'ID Binance Pay', value: '000000000', copyable: true }], enabled: true, cash: false }
      ]
    },
    products,
    orders: [],
    nextCode: 1
  }
}

// Respaldo en memoria por si el navegador bloquea el almacenamiento
let memory: DemoDb | null = null
let memorySession = false

function load(): DemoDb {
  let db: DemoDb | null = null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) db = JSON.parse(raw) as DemoDb
  } catch {
    /* sin almacenamiento */
  }
  if (!db) {
    if (!memory) memory = seed()
    db = memory
  }
  return db
}

/** Igual que release_expired_orders() en la base de datos */
function releaseExpired(db: DemoDb) {
  const hours = db.settings.reserve_hours
  if (!hours) return 0
  const limit = Date.now() - hours * 3600_000
  let count = 0
  for (const o of db.orders) {
    if (o.status !== 'pendiente' || new Date(o.created_at).getTime() >= limit) continue
    giveBack(db, o)
    o.status = 'cancelado'
    o.notes = `${o.notes} Liberado automáticamente: no se confirmó el pago en ${hours} h.`.trim()
    count += 1
  }
  if (count) save(db)
  return count
}

function giveBack(db: DemoDb, o: Order) {
  for (const it of o.items) {
    const v = db.products.flatMap((p) => p.variants).find((x) => x.id === it.variant_id)
    if (v) v.stock += it.qty
  }
}

function loadFresh() {
  const db = load()
  releaseExpired(db)
  return db
}

function save(db: DemoDb) {
  memory = db
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
}

const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120))
const uid = () => Math.random().toString(36).slice(2, 10)

/** Igual que _fill_order_items() en la base de datos: valida, descuenta stock y arma las líneas */
function fillItems(db: DemoDb, items: { variant_id: string; qty: number }[], force: boolean | undefined, requireActive: boolean) {
  if (!items.length) throw new Error('El carrito está vacío')
  const found = items.map((it) => {
    const p = db.products.find((x) => x.variants.some((v) => v.id === it.variant_id))
    const v = p?.variants.find((x) => x.id === it.variant_id)
    if (!p || !v || (requireActive && !p.active)) throw new Error('Uno de los productos ya no está disponible')
    if (v.stock < it.qty) throw new Error(`Ya no queda stock de ${p.name}${v.name ? ` (${v.name})` : ''}`)
    return { p, v, qty: it.qty }
  })
  const pricing = priceCart(
    found.map((f) => ({ qty: f.qty, price: f.p.price, price_wholesale: f.p.price_wholesale })),
    db.settings.wholesale_min,
    force
  )
  const lines: Order['items'] = found.map((f, i) => {
    f.v.stock -= f.qty
    return {
      id: uid(),
      product_id: f.p.id,
      variant_id: f.v.id,
      product_name: f.p.name,
      tone: f.v.name,
      qty: f.qty,
      unit_usd: pricing.unit[i],
      wholesale: pricing.wholesale && f.p.price_wholesale != null
    }
  })
  return { lines, pricing }
}

function newCode(db: DemoDb) {
  const code = `TB-${String(db.nextCode).padStart(4, '0')}`
  db.nextCode += 1
  return code
}

export function createDemoApi(): Api {
  return {
    mode: 'demo',

    getSettings: () => wait(load().settings),

    listProducts: (opts) => {
      const all = [...loadFresh().products].sort((a, b) => a.sort - b.sort)
      return wait(opts?.includeInactive ? all : all.filter((p) => p.active))
    },

    getProduct: (id) => wait(loadFresh().products.find((p) => p.id === id) ?? null),

    async createOrder(o) {
      const db = loadFresh()
      if (!o.customer_name.trim() || !o.customer_phone.trim()) throw new Error('Escribe tu nombre y tu WhatsApp')
      if (o.delivery === 'delivery' && !o.address.trim()) throw new Error('Escribe la dirección de entrega')
      if (o.delivery === 'envio' && (!o.id_number.trim() || !o.state.trim() || !o.city.trim() || !o.agency.trim()))
        throw new Error('Para el envío necesitamos cédula, estado, ciudad y agencia')
      const pm = db.settings.payment_methods.find((m) => m.name === o.payment_method && m.enabled)
      if (!pm) throw new Error('Ese método de pago no está disponible')
      if (o.cash_amount != null && !pm.cash) throw new Error('Ese método de pago no es en efectivo')

      // Se trabaja sobre una copia: si algo falla, el stock no se toca
      const draft = structuredClone(db)
      const { lines, pricing } = fillItems(draft, o.items, undefined, true)
      const totals = convert(pricing.total, draft.settings)
      const selected = pm.currency === 'COP' ? (totals.cop ?? totals.usd) : pm.currency === 'BS' ? (totals.bs ?? totals.usd) : totals.usd
      if (o.cash_amount != null && o.cash_amount < selected) throw new Error('Ese monto no alcanza para cubrir el total')

      const code = newCode(draft)
      draft.orders.unshift({
        id: uid(),
        code,
        customer_name: o.customer_name.trim(),
        customer_phone: o.customer_phone.trim(),
        id_number: o.id_number.trim(),
        delivery: o.delivery,
        address: o.address.trim(),
        state: o.state.trim(),
        city: o.city.trim(),
        agency: o.agency.trim(),
        payment_method: o.payment_method,
        currency: pm.currency,
        total_usd: totals.usd,
        retail_usd: pricing.retail,
        total_bs: totals.bs,
        total_cop: totals.cop,
        wholesale: pricing.wholesale,
        cash_amount: o.cash_amount,
        status: 'pendiente',
        channel: 'tienda',
        notes: '',
        created_at: new Date().toISOString(),
        items: lines
      })
      save(draft)
      const result: OrderResult = { code, total_usd: totals.usd, retail_usd: pricing.retail, wholesale: pricing.wholesale, total_bs: totals.bs, total_cop: totals.cop, currency: pm.currency }
      return wait(result)
    },

    async createExternalSale(s) {
      const db = loadFresh()
      const draft = structuredClone(db)
      const { lines, pricing } = fillItems(draft, s.items, s.wholesale, false)
      const totals = convert(pricing.total, draft.settings)
      const code = newCode(draft)
      draft.orders.unshift({
        id: uid(),
        code,
        customer_name: s.customer_name.trim() || 'Venta externa',
        customer_phone: '',
        id_number: '',
        delivery: 'pickup',
        address: '',
        state: '',
        city: '',
        agency: '',
        payment_method: s.payment_method.trim() || 'Venta externa',
        currency: s.currency as Currency,
        total_usd: totals.usd,
        retail_usd: pricing.retail,
        total_bs: totals.bs,
        total_cop: totals.cop,
        wholesale: pricing.wholesale,
        cash_amount: null,
        status: 'pagado',
        channel: 'externa',
        notes: s.notes,
        created_at: new Date().toISOString(),
        items: lines
      })
      save(draft)
      const result: OrderResult = { code, total_usd: totals.usd, retail_usd: pricing.retail, wholesale: pricing.wholesale, total_bs: totals.bs, total_cop: totals.cop, currency: s.currency }
      return wait(result)
    },

    async getSessionEmail() {
      try {
        return sessionStorage.getItem(SESSION_KEY) ? 'demo@twinsbeauty' : null
      } catch {
        return memorySession ? 'demo@twinsbeauty' : null
      }
    },

    async signIn(_email, password) {
      if (password !== DEMO_PASSWORD) throw new Error('Contraseña incorrecta')
      memorySession = true
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* sin almacenamiento */
      }
    },

    async signOut() {
      memorySession = false
      try {
        sessionStorage.removeItem(SESSION_KEY)
      } catch {
        /* sin almacenamiento */
      }
    },

    listOrders: () => wait(loadFresh().orders),

    pendingOrders: () =>
      wait(
        loadFresh()
          .orders.filter((o) => o.status === 'pendiente')
          .map(({ id, code, customer_name, currency, total_usd, total_bs, total_cop, created_at }) => ({ id, code, customer_name, currency, total_usd, total_bs, total_cop, created_at }))
      ),

    async setOrderStatus(orderId, status) {
      const db = load()
      const o = db.orders.find((x) => x.id === orderId)
      if (!o) throw new Error('Pedido no encontrado')
      if (o.status === 'cancelado') throw new Error('Un pedido cancelado no se puede reabrir; crea uno nuevo')
      if (status === 'cancelado') giveBack(db, o)
      o.status = status
      save(db)
    },

    async setStock(variantId, stock) {
      const db = load()
      const v = db.products.flatMap((p) => p.variants).find((x) => x.id === variantId)
      if (v) v.stock = Math.max(0, stock)
      save(db)
    },

    async saveProduct(input) {
      const db = load()
      const { id, hasTones: withTones, tones, stock, images, ...fields } = input
      const payload = { ...fields, images, image_url: images.find(Boolean) ?? null }
      let p = id ? db.products.find((x) => x.id === id) : undefined
      if (!p) {
        p = { ...payload, id: `p${uid()}`, sort: -1, created_at: new Date().toISOString(), variants: [] }
        db.products.unshift(p)
      } else {
        Object.assign(p, payload)
      }
      const prod = p
      prod.variants = withTones
        ? tones.map((t, i) => ({
            id: t.id ?? prod.variants.find((v) => v.name === t.name.trim())?.id ?? `${prod.id}-${uid()}`,
            product_id: prod.id,
            name: t.name.trim(),
            hex: t.hex,
            image_url: t.image_url,
            grp: t.grp.trim(),
            sort: i,
            stock: Math.max(0, Math.floor(t.stock))
          }))
        : [{ id: prod.variants.find((v) => v.name === '')?.id ?? `${prod.id}-u`, product_id: prod.id, name: '', hex: '', image_url: null, grp: '', sort: 0, stock: Math.max(0, Math.floor(stock)) }]
      save(db)
      return prod.id
    },

    async deleteProduct(id) {
      const db = load()
      db.products = db.products.filter((p) => p.id !== id)
      save(db)
    },

    uploadImage(file) {
      // En la demo la foto se guarda reducida dentro del navegador
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('No se pudo leer la foto'))
        reader.onload = () => {
          const image = new Image()
          image.onerror = () => reject(new Error('Ese archivo no es una imagen'))
          image.onload = () => {
            const scale = Math.min(1, 600 / Math.max(image.width, image.height))
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(image.width * scale)
            canvas.height = Math.round(image.height * scale)
            canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/webp', 0.8))
          }
          image.src = String(reader.result)
        }
        reader.readAsDataURL(file)
      })
    },

    async saveSettings(s) {
      const db = load()
      db.settings = s
      save(db)
    }
  }
}

export function resetDemo() {
  memory = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* sin almacenamiento */
  }
}

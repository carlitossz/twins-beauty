import { createClient } from '@supabase/supabase-js'
import type { Api, Order, OrderResult, PendingOrder, Product, ProductInput, Settings, Variant } from './types'

const PRODUCT_SELECT = '*, variants(*)'

const num = (v: unknown) => (v == null ? null : Number(v))

function normalizeProduct(p: Product): Product {
  return {
    ...p,
    price: Number(p.price),
    price_wholesale: num(p.price_wholesale),
    images: p.images ?? (p.image_url ? [p.image_url] : []),
    variants: [...(p.variants ?? [])].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
  }
}

function normalizeResult(data: Record<string, unknown>): OrderResult {
  return {
    code: String(data.code),
    currency: data.currency as OrderResult['currency'],
    total_usd: Number(data.total_usd),
    retail_usd: Number(data.retail_usd ?? data.total_usd),
    wholesale: Boolean(data.wholesale),
    total_bs: num(data.total_bs),
    total_cop: num(data.total_cop)
  }
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key)

  // Libera los pedidos vencidos antes de leer stock. Como mucho una vez por minuto por visitante.
  let lastRelease = 0
  async function releaseExpired() {
    if (Date.now() - lastRelease < 60_000) return
    lastRelease = Date.now()
    try {
      await sb.rpc('release_expired_orders')
    } catch {
      /* no bloquea la tienda */
    }
  }

  return {
    mode: 'supabase',

    async getSettings() {
      const { data, error } = await sb.from('settings').select('*').eq('id', 1).single()
      fail(error)
      return {
        ...data,
        bs_rate: num(data.bs_rate),
        cop_rate: num(data.cop_rate),
        wholesale_min: Number(data.wholesale_min ?? 0),
        reserve_hours: Number(data.reserve_hours ?? 0),
        agencies: data.agencies ?? []
      } as Settings
    },

    async listProducts(opts) {
      await releaseExpired()
      let q = sb.from('products').select(PRODUCT_SELECT).order('sort').order('created_at', { ascending: false })
      if (!opts?.includeInactive) q = q.eq('active', true)
      const { data, error } = await q
      fail(error)
      return (data as Product[]).map(normalizeProduct)
    },

    async getProduct(id) {
      await releaseExpired()
      const { data, error } = await sb.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle()
      fail(error)
      return data ? normalizeProduct(data as Product) : null
    },

    async createOrder(o) {
      const { data, error } = await sb.rpc('create_order', {
        p_customer_name: o.customer_name,
        p_customer_phone: o.customer_phone,
        p_delivery: o.delivery,
        p_address: o.address,
        p_payment_method: o.payment_method,
        p_items: o.items,
        p_cash_amount: o.cash_amount,
        p_id_number: o.id_number,
        p_state: o.state,
        p_city: o.city,
        p_agency: o.agency
      })
      fail(error)
      return normalizeResult(data)
    },

    async createExternalSale(s) {
      const { data, error } = await sb.rpc('create_external_sale', {
        p_customer_name: s.customer_name,
        p_currency: s.currency,
        p_payment_method: s.payment_method,
        p_items: s.items,
        p_notes: s.notes,
        p_wholesale: s.wholesale
      })
      fail(error)
      return normalizeResult(data)
    },

    async getSessionEmail() {
      const { data } = await sb.auth.getSession()
      const email = data.session?.user.email ?? null
      if (!email) return null
      const { data: admin } = await sb.from('admins').select('email').limit(1)
      return admin && admin.length ? email : null
    },

    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Correo o contraseña incorrectos')
      const { data: admin } = await sb.from('admins').select('email').limit(1)
      if (!admin || !admin.length) {
        await sb.auth.signOut()
        throw new Error('Este correo no tiene permiso de administrador')
      }
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async listOrders() {
      lastRelease = 0
      await releaseExpired()
      const { data, error } = await sb.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false }).limit(500)
      fail(error)
      return (data as Order[]).map((o) => ({
        ...o,
        total_usd: Number(o.total_usd),
        retail_usd: Number(o.retail_usd),
        total_bs: num(o.total_bs),
        total_cop: num(o.total_cop),
        cash_amount: num(o.cash_amount),
        items: o.items.map((i) => ({ ...i, unit_usd: Number(i.unit_usd) }))
      }))
    },

    async pendingOrders() {
      await releaseExpired()
      const { data, error } = await sb
        .from('orders')
        .select('id, code, customer_name, currency, total_usd, total_bs, total_cop, created_at')
        .eq('status', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(50)
      fail(error)
      return (data as PendingOrder[]).map((o) => ({ ...o, total_usd: Number(o.total_usd), total_bs: num(o.total_bs), total_cop: num(o.total_cop) }))
    },

    async setOrderStatus(orderId, status) {
      const { error } = await sb.rpc('set_order_status', { p_order_id: orderId, p_status: status })
      fail(error)
    },

    async setStock(variantId, stock) {
      const { error } = await sb.from('variants').update({ stock: Math.max(0, stock) }).eq('id', variantId)
      fail(error)
    },

    async saveProduct(input: ProductInput) {
      const { id, hasTones, tones, stock, images, ...fields } = input
      // La foto principal siempre es la primera del álbum que no esté vacía
      const payload = { ...fields, images, image_url: images.find(Boolean) ?? null }
      let productId = id
      if (productId) {
        const { error } = await sb.from('products').update(payload).eq('id', productId)
        fail(error)
      } else {
        const { data, error } = await sb.from('products').insert(payload).select('id').single()
        fail(error)
        productId = (data as { id: string }).id
      }

      const rows: Omit<Variant, 'id'>[] = hasTones
        ? tones.map((t, i) => ({ product_id: productId!, name: t.name.trim(), hex: t.hex, image_url: t.image_url, grp: t.grp.trim(), sort: i, stock: Math.max(0, Math.floor(t.stock)) }))
        : [{ product_id: productId!, name: '', hex: '', image_url: null, grp: '', sort: 0, stock: Math.max(0, Math.floor(stock)) }]

      const { error: upErr } = await sb.from('variants').upsert(rows, { onConflict: 'product_id,name' })
      fail(upErr)

      // Los tonos que se quitaron de la lista se borran (si no, quedarían "fantasma")
      const keep = rows.map((r) => r.name)
      const { data: existing, error: exErr } = await sb.from('variants').select('id, name').eq('product_id', productId)
      fail(exErr)
      const orphans = (existing ?? []).filter((v: { name: string }) => !keep.includes(v.name)).map((v: { id: string }) => v.id)
      if (orphans.length) {
        const { error: delErr } = await sb.from('variants').delete().in('id', orphans)
        fail(delErr)
      }
      return productId!
    },

    async deleteProduct(id) {
      const { error } = await sb.from('products').delete().eq('id', id)
      fail(error)
    },

    async uploadImage(file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error } = await sb.storage.from('productos').upload(path, file, { cacheControl: '31536000', contentType: file.type })
      fail(error)
      return sb.storage.from('productos').getPublicUrl(path).data.publicUrl
    },

    async saveSettings(s) {
      const { error } = await sb
        .from('settings')
        .update({ ...s, updated_at: new Date().toISOString() })
        .eq('id', 1)
      fail(error)
    }
  }
}

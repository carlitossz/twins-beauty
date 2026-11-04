# Twins Beauty

Tienda web instalable (PWA) de **Twins Beauty** (@twinsbeauty.sc): maquillaje original con tonos, precio al detal y al mayor, pedidos por WhatsApp y un panel admin pensado para que la dueña lo maneje sola desde el teléfono.

Hecha con React + Vite + Tailwind, Supabase (base de datos, login y fotos) y publicada en Cloudflare Pages (su plan gratis permite uso comercial).

## Lo que hace

**Tienda**
- Catálogo por categorías (Labios, Rostro, Ojos y cejas, Brochas, Skincare) con buscador por producto o tono.
- Cada producto tiene sus tonos con circulito de color y stock propio. Solo se muestran los que tienen stock.
- Foto opcional por tono (cambia la foto grande al elegirlo) y "carta de tonos" con la foto real de swatches.
- Precio al detal y al mayor. Llevando *N* productos con precio al mayor (se pueden mezclar), el carrito cambia solo al mayor y muestra cuánto falta y cuánto se ahorra.
- Retiro personal, delivery en la ciudad o envío nacional (cédula, estado, ciudad y agencia).
- Pago móvil, efectivo (con cálculo de vuelto), Zelle, Binance… con botón de copiar solo en los datos marcados como copiables.
- El pedido aparta el stock y se envía por WhatsApp. Confirmación con la tarjeta "Gracias por ser mi cliente".

**Panel admin** (`/admin`)
- Inicio con pedidos por confirmar, cobrado del mes y tonos en su última unidad. Aviso con sonido y notificación cuando entra un pedido.
- Pedidos: confirmar pago, marcar entregado, cancelar (devuelve stock) y escribirle a la clienta.
- Inventario con + / − por tono que se guarda solo.
- Productos: fotos, precios, etiqueta, y tonos (color, nombre, cantidad, grupo, foto). Interruptor "¿tiene tonos?" para los que no llevan.
- Ventas externas (en persona, Instagram…) que descuentan stock y salen en reportes, con opción de cobrar al mayor.
- Reportes por mes con descarga a Excel, venta por venta.
- Ajustes: WhatsApp, tasa del día, mínimo para precio al mayor, textos de entrega, agencias y métodos de pago.

## Ponerla a andar

1. **Supabase**: crea un proyecto y en *SQL Editor* corre `supabase/schema.sql` y después `supabase/seed.sql` (carga los 23 productos con sus tonos, con stock en 0).
2. **Usuario admin**: en *Authentication → Users* crea el usuario de la dueña (correo y contraseña) y en el SQL Editor:
   ```sql
   insert into public.admins (email) values ('correo-de-la-duena@gmail.com');
   ```
3. **Variables**: copia `.env.example` como `.env.local` y pega la URL (sin `/rest/v1`) y la *publishable key* (Supabase → Project Settings → API Keys). En el hosting van como variables de entorno con los mismos nombres.
4. `npm install` y `npm run dev`.
5. Entrar a `/admin`, completar **Ajustes** (WhatsApp, métodos de pago, mínimo al mayor) y cargar las cantidades en **Inventario**.

Sin variables de Supabase la app corre en **modo demo**: todo se guarda en el navegador y la contraseña del panel es `twins2026`. `npm run build:demo` genera esa versión para enseñarla sin base de datos.

## Publicar en Cloudflare Pages

1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** y elegir `twins-beauty`.
2. Framework preset **Vite** (o a mano: build command `npm run build`, output `dist`).
3. Variables de entorno (Production y Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` = `https://<nombre-del-proyecto>.pages.dev` (o el dominio propio cuando lo haya)
4. Save and Deploy. Cada `git push` a `main` vuelve a publicar solo.

No hace falta archivo de redirecciones: como no hay `404.html`, Cloudflare manda todas las rutas (`/admin`, `/producto/...`) a la app. `public/_headers` controla la caché y `.nvmrc` fija Node 22.

## Catálogo inicial

Los productos, precios y tonos viven en `src/lib/catalog.ts`. Si se cambia, `npm run seed` regenera `supabase/seed.sql` (Node 22.6+). Los colores de los tonos son aproximados; la dueña los puede ajustar desde el panel.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (con PWA) |
| `npm run build:demo` | Build de prueba sin base de datos |
| `npm run seed` | Regenera `supabase/seed.sql` desde el catálogo |

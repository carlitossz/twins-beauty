import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Dirección pública del sitio, para que WhatsApp e Instagram encuentren la imagen de vista previa.
// En Cloudflare Pages se fija con la variable VITE_SITE_URL (ej. https://twins-beauty.pages.dev o el dominio propio).
// Si no está, se usa la que da el hosting (Cloudflare o Vercel) en el momento del build.
function siteUrl() {
  const fixed = process.env.VITE_SITE_URL
  if (fixed) return fixed.replace(/\/+$/, '')
  if (process.env.CF_PAGES_URL) return process.env.CF_PAGES_URL.replace(/\/+$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  return vercel ? `https://${vercel}` : ''
}

// `npm run build:demo` genera una versión de prueba sin base de datos (datos guardados en el navegador)
export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? './' : '/',
  build: mode === 'demo' ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {},
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', mode === 'demo' ? '.' : siteUrl())
    },
    VitePWA({
      disable: mode === 'demo',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo/*.png'],
      manifest: {
        name: 'Twins Beauty · Maquillaje original',
        short_name: 'Twins Beauty',
        description: 'Maquillaje 100% original. Mira los tonos disponibles y pide por WhatsApp.',
        lang: 'es',
        theme_color: '#FAF2E2',
        background_color: '#FAF2E2',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/admin/],
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
        // Las cartas de tonos pesan más: se guardan solo cuando alguien las abre
        globIgnores: ['**/tonos/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tonos/'),
            handler: 'CacheFirst',
            options: { cacheName: 'cartas-de-tonos', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
            handler: 'CacheFirst',
            options: { cacheName: 'fotos', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ]
}))

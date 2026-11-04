// Genera supabase/seed.sql a partir de src/lib/catalog.ts
// Uso: npm run seed   (necesita Node 22.6 o más nuevo)
import { CATALOG } from '../src/lib/catalog.ts'

const q = (s: string | null | undefined) => (s == null ? 'null' : `'${s.replace(/'/g, "''")}'`)
const n = (v: number | null) => (v == null ? 'null' : String(v))

const out: string[] = [
  '-- =====================================================================',
  '-- TWINS BEAUTY · Catálogo inicial (generado con `npm run seed`, no editar a mano)',
  '-- Correr UNA sola vez, después de schema.sql. Las cantidades arrancan en 0:',
  '-- se cargan desde el panel (Inventario o Editar producto).',
  '-- =====================================================================',
  '',
  'do $$',
  'declare pid uuid;',
  'begin',
  "  if exists (select 1 from public.products) then",
  "    raise notice 'Ya hay productos cargados: no se cargó nada.';",
  '    return;',
  '  end if;',
  ''
]

CATALOG.forEach((p, i) => {
  out.push(`  -- ${p.name}`)
  out.push(
    `  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active)` +
      ` values (${q(p.name)}, ${q(p.subtitle)}, ${q(p.brand)}, ${q(p.category)}, ${q(p.badge ?? '')}, ${q(p.description ?? '')}, ${p.price}, ${n(p.wholesale)},` +
      ` ${q(p.image)}, ${q(JSON.stringify([p.image]))}::jsonb, ${q(p.swatch ?? null)}, ${i}, ${p.hidden ? 'false' : 'true'}) returning id into pid;`
  )
  if (p.tones?.length) {
    const rows = p.tones.map((t, k) => `(pid, ${q(t.name)}, ${q(t.hex)}, ${q(t.image ?? null)}, ${q(t.grp ?? '')}, ${k}, 0)`)
    out.push(`  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values\n    ${rows.join(',\n    ')};`)
  } else {
    out.push(`  insert into public.variants (product_id, name, stock) values (pid, '', 0);`)
  }
  out.push('')
})

out.push('end $$;', '')
process.stdout.write(out.join('\n'))

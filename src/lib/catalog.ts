// Catálogo inicial de Twins Beauty (lista de productos, precios y tonos).
// Lo usan el modo demo y el generador de supabase/seed.sql (scripts/gen-seed.ts).
// Los colores de los tonos son aproximados: sirven para el circulito, no son una muestra exacta.

export interface CatalogTone {
  name: string
  hex: string
  grp?: string
  image?: string
}

export interface CatalogProduct {
  slug: string
  name: string
  subtitle: string
  brand: string
  category: string
  price: number
  wholesale: number | null
  image: string
  badge?: string
  description?: string
  swatch?: string
  tones?: CatalogTone[]
}

// ---------- Colores de piel aproximados a partir del nombre del tono ----------
const DEPTH: Record<string, [number, number, number]> = {
  Fair: [242, 214, 194],
  Light: [231, 194, 163],
  Medium: [212, 164, 127],
  Tan: [190, 135, 93],
  Deep: [150, 98, 66],
  Rich: [104, 66, 46]
}

const NUANCE: Record<string, [number, number, number]> = {
  Warm: [2, 4, -12],
  Cool: [4, -6, 6],
  Neutral: [0, 0, 0],
  Golden: [4, 6, -20],
  Olive: [-4, 4, -14],
  Sand: [0, 3, -8],
  Ivory: [4, 6, -4],
  Beige: [0, 0, -4],
  Peach: [6, -2, -6],
  Rose: [6, -8, 2],
  Latte: [-4, -4, -6],
  Walnut: [-10, -12, -8],
  Chestnut: [-8, -10, -14],
  Caramel: [10, 2, -18],
  Cinnamon: [0, -12, -20],
  Chocolate: [-10, -10, -8],
  Cocoa: [-6, -10, -6],
  Ebony: [-30, -22, -14]
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
const toHex = (rgb: number[]) => `#${rgb.map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`.toUpperCase()

/** "Light Warm", "24 Light Warm", "Fair Cool Neutral" → color aproximado */
export function skinHex(name: string) {
  const words = name.split(/\s+/)
  const num = Number(words[0])
  const parts = Number.isFinite(num) ? words.slice(1) : words
  const base = DEPTH[parts[0]] ?? DEPTH.Medium
  const rgb = [...base]
  for (const w of parts.slice(1)) {
    const d = NUANCE[w]
    if (d) for (let i = 0; i < 3; i++) rgb[i] += d[i] / (parts.length - 1)
  }
  // Los numerados del mismo grupo se oscurecen un poquito, para que no salgan idénticos
  if (Number.isFinite(num)) {
    const step = (num % 10) * 2.2
    for (let i = 0; i < 3; i++) rgb[i] -= step
  }
  return toHex(rgb)
}

const skin = (names: string[], grp?: string): CatalogTone[] => names.map((name) => ({ name, hex: skinHex(name), ...(grp ? { grp } : {}) }))
const tones = (list: [string, string][], grp?: string): CatalogTone[] => list.map(([name, hex]) => ({ name, hex, ...(grp ? { grp } : {}) }))

const img = (file: string) => `/productos/${file}.webp`
const chart = (file: string) => `/tonos/${file}.webp`

export const CATALOG: CatalogProduct[] = [
  {
    slug: 'polvo-halo-glow',
    name: 'Polvo Halo Glow',
    subtitle: 'Halo Glow Powder Filter · 10 g',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 12,
    wholesale: 11,
    image: img('polvo-halo-glow'),
    badge: 'Favorito',
    description: 'Polvo compacto de cobertura ligera y construible, con acabado glow suave que difumina. Incluye borla y espejo.',
    swatch: chart('polvo-halo-glow'),
    tones: skin(['Fair Cool Neutral', 'Fair Warm', 'Light Neutral', 'Light Warm', 'Medium Neutral', 'Medium Warm', 'Tan Warm', 'Tan Neutral Warm', 'Deep Warm', 'Deep Neutral', 'Rich Cool', 'Rich Warm'])
  },
  {
    slug: 'gloss-glow-reviver',
    name: 'Gloss Glow Reviver',
    subtitle: 'Glow Reviver Lip Oil',
    brand: 'e.l.f.',
    category: 'Labios',
    price: 11,
    wholesale: 9,
    image: img('gloss-glow-reviver'),
    badge: 'Favorito',
    description: 'Aceite de labios con brillo jugoso y un toque de color.',
    swatch: chart('gloss-glow-reviver'),
    tones: [
      ...tones(
        [
          ['Honey Talks', '#7A4A3E'],
          ['Coral Fixation', '#F2734E'],
          ['Jam Session', '#6E1630'],
          ["It's Giving Guava", '#E9776A'],
          ['Crystal Clear', '#EEEAE6'],
          ['Red Delicious', '#E0283A'],
          ['Money Mauve', '#9B6866'],
          ['Pink Quartz', '#F5A3A0'],
          ['Rose Envy', '#C9495A']
        ],
        'Clásicos'
      ),
      ...tones(
        [
          ['Opal-ogy Tour', '#D9D6EE'],
          ['Citrine Gleam', '#E2C368'],
          ['Crystal Baller', '#D7B79A'],
          ['Candy Coded', '#F0B2A8'],
          ['Super-Neutral', '#D9844A'],
          ['Princess Cut', '#E58C86'],
          ['Divine Wine', '#B5506A'],
          ['Chocoluxe', '#B3743F']
        ],
        'Con brillo'
      ).map((t) => ({ ...t, image: chart('gloss-glow-reviver-brillo') }))
    ]
  },
  {
    slug: 'tinta-labios-mejillas',
    name: 'Tinta labios y mejillas',
    subtitle: 'Lip & Cheek Tint',
    brand: 'e.l.f.',
    category: 'Labios',
    price: 9,
    wholesale: 7,
    image: img('tinta-labios-mejillas'),
    description: 'Tinta ligera para labios y mejillas.',
    swatch: chart('tinta-labios-mejillas'),
    tones: tones([
      ['Cherry Cola', '#7A1E26'],
      ['Plums Up', '#B9578A'],
      ['Left On Red', '#E3263A'],
      ['Pink Positive', '#F06A9C'],
      ['Orange Crush', '#F2843C']
    ])
  },
  {
    slug: 'lip-balm-melting',
    name: 'Lip balm Glow Reviver',
    subtitle: 'Glow Reviver Melting Lip Balm',
    brand: 'e.l.f.',
    category: 'Labios',
    price: 8,
    wholesale: 6,
    image: img('lip-balm-melting'),
    description: 'Bálsamo que se derrite en los labios, con color y brillo.',
    swatch: chart('lip-balm-melting'),
    tones: tones([
      ['Blue Razz Slushy', '#3AA7DD'],
      ['Vanilla Soft Serve', '#F6E3B4'],
      ['Island Colada', '#F2EEE6'],
      ['Peach Ring', '#F4B39A'],
      ['Sherbet Punch', '#F08AA3'],
      ['Wild Cherry', '#D0334C'],
      ['Candied Cranberry', '#9C2A4A'],
      ['Yummy Gummy', '#8E3B66'],
      ['Cotton Candy Crush', '#E3A0D6'],
      ['Pink Lemonade', '#F59DB5'],
      ['Vanilla Toffee', '#B98258'],
      ['Blackberry Sorbet', '#6A3448']
    ])
  },
  {
    slug: 'lip-oil-stick',
    name: 'Lip Oil Stick',
    subtitle: 'Glow Reviver Lip Oil Stick',
    brand: 'e.l.f.',
    category: 'Labios',
    price: 7,
    wholesale: 5,
    image: img('lip-oil-stick')
  },
  {
    slug: 'corrector-soft-glam',
    name: 'Corrector Soft Glam',
    subtitle: 'Soft Glam Satin Concealer',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 6,
    wholesale: 4,
    image: img('corrector-soft-glam'),
    description: 'Corrector de cobertura media construible y acabado satinado.',
    swatch: chart('corrector-soft-glam'),
    tones: [
      ...skin(['10 Fair Cool', '11 Fair Neutral', '12 Fair Warm', '13 Fair Neutral', '14 Fair Cool', '15 Fair Warm'], 'Claros'),
      ...skin(['20 Light Cool', '21 Light Neutral', '22 Light Warm', '23 Light Cool', '24 Light Warm', '25 Light Neutral'], 'Claros'),
      ...skin(['30 Medium Warm', '31 Medium Neutral', '32 Medium Neutral', '33 Medium Warm', '34 Medium Cool', '35 Medium Cool'], 'Medios'),
      ...skin(['40 Tan Warm', '41 Tan Neutral', '42 Tan Neutral', '43 Tan Cool', '44 Tan Cool', '45 Tan Warm'], 'Medios'),
      ...skin(['50 Deep Warm', '51 Deep Cool', '52 Deep Cool', '53 Deep Neutral', '54 Deep Neutral', '55 Deep Warm'], 'Oscuros'),
      ...skin(['60 Rich Cool', '61 Rich Cool', '62 Rich Warm', '63 Rich Warm', '64 Rich Neutral', '65 Rich Neutral'], 'Oscuros')
    ]
  },
  {
    slug: 'corrector-camo-hidratante',
    name: 'Corrector Camo tapa blanca',
    subtitle: 'Hydrating Camo Concealer · acabado satinado',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 10,
    wholesale: 8,
    image: img('corrector-camo-hidratante'),
    description: 'Corrector hidratante de alta cobertura con acabado satinado.',
    swatch: chart('corrector-camo-hidratante'),
    tones: [
      ...skin(['Fair Rose', 'Fair Warm', 'Fair Beige', 'Light Sand', 'Light Peach', 'Light Beige'], 'Claros'),
      ...skin(['Medium Peach', 'Medium Sand', 'Medium Beige', 'Tan Sand', 'Tan Walnut', 'Tan Latte'], 'Medios'),
      ...skin(['Deep Olive', 'Deep Chestnut', 'Deep Cinnamon', 'Rich Chocolate', 'Rich Cocoa', 'Rich Ebony'], 'Oscuros')
    ]
  },
  {
    slug: 'corrector-camo-16h',
    name: 'Corrector Camo tapa negra',
    subtitle: '16HR Camo Concealer · acabado mate',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 10,
    wholesale: 8,
    image: img('corrector-camo-16h'),
    description: 'Corrector de alta cobertura y larga duración, acabado mate.',
    tones: [
      ...skin(['Fair Warm', 'Fair Beige', 'Fair Rose', 'Light Beige', 'Light Ivory', 'Light Peach'], 'Claros'),
      ...skin(['Medium Golden', 'Medium Warm', 'Medium Beige', 'Medium Neutral', 'Medium Sand', 'Medium Peach', 'Tan Neutral', 'Tan Sand', 'Tan Latte', 'Tan Walnut'], 'Medios'),
      ...skin(['Deep Olive', 'Deep Chestnut', 'Deep Caramel', 'Deep Cinnamon', 'Rich Chocolate', 'Rich Walnut', 'Rich Cocoa', 'Rich Ebony'], 'Oscuros')
    ]
  },
  {
    slug: 'corrector-color-camo',
    name: 'Corrector de color Camo',
    subtitle: 'Camo Color Corrector',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 5,
    wholesale: 4,
    image: img('corrector-color-durazno'),
    description: 'Durazno y naranja neutralizan ojeras; verde neutraliza rojeces.',
    tones: [
      { name: 'Durazno', hex: '#F1C3AE', image: img('corrector-color-durazno') },
      { name: 'Verde', hex: '#BFD8B0', image: img('corrector-color-verde') },
      { name: 'Naranja', hex: '#E9895A', image: img('corrector-color-naranja') }
    ]
  },
  {
    slug: 'rubor-liquido-camo',
    name: 'Rubor líquido Camo',
    subtitle: 'Camo Liquid Blush',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 11,
    wholesale: 9,
    image: img('rubor-liquido-camo'),
    description: 'Rubor líquido de alta pigmentación y larga duración, acabado jugoso.',
    swatch: chart('rubor-liquido-camo'),
    tones: tones([
      ['Bold-Faced Lily', '#E37AAE'],
      ['Bronze Bomb', '#6E3526'],
      ['Cheeky Lychee', '#F0717E'],
      ['Copper Etiquette', '#B4563E'],
      ['Coral Crush', '#F24A2E'],
      ['Dusty Rosé', '#B97680'],
      ['Gorg Orange', '#F0442A'],
      ['Peach Perfect', '#F08A6E'],
      ['Pinky Promise', '#E8317A'],
      ['Suave Mauve', '#9E5560'],
      ['Berry Well', '#8E1C40'],
      ["Comin' In Hot Pink", '#EE2C6C']
    ])
  },
  {
    slug: 'rubor-halo-glow',
    name: 'Rubor líquido Halo Glow',
    subtitle: 'Halo Glow Blush Beauty Wand',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 10,
    wholesale: 8,
    image: img('rubor-halo-glow'),
    description: 'Rubor líquido con aplicador de esponja y acabado luminoso.',
    swatch: chart('rubor-halo-glow'),
    tones: tones([
      ['Candlelit', '#E9A88E'],
      ['Rosé You Slay', '#E39AA0'],
      ['Magic Hour', '#D99A62'],
      ['Berry Radiant', '#D06A8A'],
      ['You Go Cocoa', '#C06A4A'],
      ['Pink-Me-Up', '#E28296']
    ])
  },
  {
    slug: 'primer-putty-poros',
    name: 'Primer Putty minimizador de poros',
    subtitle: 'Poreless Putty Primer',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 10,
    wholesale: 8,
    image: img('primer-putty-poros')
  },
  {
    slug: 'primer-putty-matte',
    name: 'Primer Putty matte',
    subtitle: 'Matte Putty Primer',
    brand: 'e.l.f.',
    category: 'Rostro',
    price: 10,
    wholesale: 8,
    image: img('primer-putty-matte')
  },
  {
    slug: 'mascara-big-mood',
    name: 'Máscara Big Mood',
    subtitle: 'Big Mood Mascara · Mega Volume & Lift',
    brand: 'e.l.f.',
    category: 'Ojos y cejas',
    price: 10,
    wholesale: 8,
    image: img('mascara-big-mood'),
    description: 'Fórmula tradicional: se lava fácil, para uso diario.',
    swatch: chart('mascara-big-mood'),
    tones: tones([
      ['Negro', '#1A1A1A'],
      ['Marrón', '#4A2E22']
    ])
  },
  {
    slug: 'mascara-big-mood-waterproof',
    name: 'Máscara Big Mood waterproof',
    subtitle: 'Big Mood Mascara Waterproof',
    brand: 'e.l.f.',
    category: 'Ojos y cejas',
    price: 10,
    wholesale: 8,
    image: img('mascara-big-mood-waterproof'),
    description: 'A prueba de agua y de larga duración.',
    swatch: chart('mascara-big-mood'),
    tones: tones([
      ['Negro incondicional', '#1A1A1A'],
      ['Marrón resistente', '#4A2E22']
    ])
  },
  {
    slug: 'pestanina-lash-xtndr',
    name: 'Pestañina Lash XTNDR',
    subtitle: 'Lash XTNDR Tubing Mascara',
    brand: 'e.l.f.',
    category: 'Ojos y cejas',
    price: 8,
    wholesale: 6,
    image: img('pestanina-lash-xtndr'),
    swatch: chart('pestanina-lash-xtndr'),
    tones: tones([
      ['Negro profundo', '#141414'],
      ['Marrón intenso', '#5A3524']
    ])
  },
  {
    slug: 'lapiz-cejas',
    name: 'Set lápiz de cejas',
    subtitle: 'Instant Lift Brow Pencil · set de 2',
    brand: 'e.l.f.',
    category: 'Ojos y cejas',
    price: 6,
    wholesale: 4,
    image: img('lapiz-cejas'),
    tones: tones([['Taupe', '#8A7262']])
  },
  {
    slug: 'gel-cejas-pestanas',
    name: 'Gel para cejas y pestañas',
    subtitle: 'Gel transparente',
    brand: 'e.l.f.',
    category: 'Ojos y cejas',
    price: 5,
    wholesale: null,
    image: img('gel-cejas-pestanas')
  },
  {
    slug: 'paleta-sombras',
    name: 'Paleta de sombras',
    subtitle: 'Paleta de 10 tonos',
    brand: 'e.l.f.',
    category: 'Ojos y cejas',
    price: 11,
    wholesale: 9,
    image: img('paleta-sombras'),
    badge: 'Nuevo'
  },
  {
    slug: 'brocha-liquidos-polvos',
    name: 'Brocha para líquidos o polvos',
    subtitle: 'Complexion Duo Brush',
    brand: 'e.l.f.',
    category: 'Brochas',
    price: 8,
    wholesale: null,
    image: img('brocha-liquidos-polvos')
  },
  {
    slug: 'brocha-base',
    name: 'Brocha para base',
    subtitle: 'Foundation Brush',
    brand: 'e.l.f.',
    category: 'Brochas',
    price: 8,
    wholesale: null,
    image: img('brocha-base')
  },
  {
    slug: 'set-brochas-full-face',
    name: 'Set de brochas Full Face',
    subtitle: 'Flawless Face & Eye Brush Set',
    brand: 'e.l.f.',
    category: 'Brochas',
    price: 25,
    wholesale: null,
    image: img('set-brochas-full-face')
  },
  {
    slug: 'crema-toleriane',
    name: 'Crema hidratante Toleriane',
    subtitle: 'Toleriane Double Repair Face Moisturizer',
    brand: 'La Roche-Posay',
    category: 'Skincare',
    price: 20,
    wholesale: null,
    image: img('crema-toleriane')
  }
]

export const CATEGORIES = ['Labios', 'Rostro', 'Ojos y cejas', 'Brochas', 'Skincare'] as const

export type Area = 'nord' | 'centro' | 'sud' | 'isole'

export interface RegionConfig {
  gradient: [string, string]
  accent: string
  tagline: string
  area: Area
}

export const REGION_CONFIG: Record<string, RegionConfig> = {
  'Abruzzo':               { gradient: ['#3a2810', '#5a4020'], accent: '#c97b35', tagline: 'Tra Adriatico e Appennino',       area: 'centro' },
  'Basilicata':            { gradient: ['#4a1f1a', '#6b3028'], accent: '#c9613a', tagline: 'Matera e il profondo Sud',         area: 'sud'    },
  'Calabria':              { gradient: ['#4a2a1a', '#6b3d28'], accent: '#d4884c', tagline: 'La punta del Mediterraneo',        area: 'sud'    },
  'Campania':              { gradient: ['#3a1a1a', '#5a2828'], accent: '#c94040', tagline: 'Il cuore del Sud',                 area: 'sud'    },
  'Emilia-Romagna':        { gradient: ['#4a1a1a', '#6b2828'], accent: '#b83535', tagline: 'La via Emilia del vintage',        area: 'nord'   },
  'Friuli-Venezia Giulia': { gradient: ['#1a2f4a', '#2d4a6e'], accent: '#4a7fa5', tagline: 'Al confine tra culture',           area: 'nord'   },
  'Lazio':                 { gradient: ['#2a3d2a', '#3d5e3d'], accent: '#5e8a5e', tagline: 'Dalla Capitale al Tirreno',        area: 'centro' },
  'Liguria':               { gradient: ['#1a3a4a', '#2d5e6b'], accent: '#4a9eb8', tagline: 'La riviera e i caruggi',           area: 'nord'   },
  'Lombardia':             { gradient: ['#1a2e4a', '#2d4a6e'], accent: '#4a80b0', tagline: 'Design e tradizione industriale',  area: 'nord'   },
  'Marche':                { gradient: ['#2e3a2a', '#4a5a3d'], accent: '#7a8a5e', tagline: 'Colline verso l\'Adriatico',       area: 'centro' },
  'Molise':                { gradient: ['#2a3a2a', '#3d5a3d'], accent: '#6b8a6b', tagline: 'Il segreto del centro Italia',     area: 'sud'    },
  'Piemonte':              { gradient: ['#3a1f1f', '#5a3030'], accent: '#9e5050', tagline: 'Vini, art nouveau e mercati',      area: 'nord'   },
  'Puglia':                { gradient: ['#4a3a1a', '#6b5528'], accent: '#d4a040', tagline: 'Trulli, barocco e Adriatico',      area: 'sud'    },
  'Sardegna':              { gradient: ['#1a3a35', '#2d5e55'], accent: '#4a8a7a', tagline: 'L\'isola fuori dal tempo',         area: 'isole'  },
  'Sicilia':               { gradient: ['#4a3010', '#6b4a20'], accent: '#d4b040', tagline: 'Il Mediterraneo del vintage',      area: 'isole'  },
  'Toscana':               { gradient: ['#5a3020', '#7a4a30'], accent: '#c9834c', tagline: 'Arte, colline e mercatini storici', area: 'centro' },
  'Trentino-Alto Adige':   { gradient: ['#1f3a28', '#2d5a3d'], accent: '#5a9a6b', tagline: 'Dolomiti e artigianato alpino',   area: 'nord'   },
  'Umbria':                { gradient: ['#3a3020', '#5a4a30'], accent: '#8a7a5e', tagline: 'Il cuore verde d\'Italia',         area: 'centro' },
  'Valle d\'Aosta':        { gradient: ['#1f2f3a', '#2d4a5a'], accent: '#5a7a9e', tagline: 'Alta montagna e cultura alpina',  area: 'nord'   },
  'Veneto':                { gradient: ['#1a3a4a', '#2d5e6b'], accent: '#3d9eb8', tagline: 'Tra lagune e Dolomiti',            area: 'nord'   },
}

// Aggiungi qui le URL delle immagini per ogni regione.
// Formato consigliato: Unsplash ?auto=format&fit=crop&w=1400&q=72
// Lascia vuoto per usare solo il gradiente.
export const REGION_IMAGES: Partial<Record<string, string>> = {}

export const AREA_LABELS: Record<Area, string> = {
  nord:   'Nord',
  centro: 'Centro',
  sud:    'Sud',
  isole:  'Isole',
}

export const AREA_ORDER: Area[] = ['nord', 'centro', 'sud', 'isole']

export const DEFAULT_CONFIG: RegionConfig = {
  gradient: ['#1c2e4a', '#2d4a6e'],
  accent:   '#c9913a',
  tagline:  'Tutto il vintage italiano',
  area:     'nord',
}

// Unique SVG background patterns per geographic area
export const AREA_PATTERNS: Record<Area | 'default', string> = {
  // Nord — diagonal lines (industrial, mountain ridgelines)
  nord: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 L20 0 M-4 4 L4 -4 M16 24 L24 16' stroke='white' stroke-width='0.7' stroke-linecap='square'/%3E%3C/svg%3E")`,

  // Centro — gentle waves (rolling hills of Tuscany/Umbria)
  centro: `url("data:image/svg+xml,%3Csvg width='60' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q15 3 30 10 Q45 17 60 10' stroke='white' stroke-width='0.7' fill='none'/%3E%3C/svg%3E")`,

  // Sud — dot grid (Mediterranean warmth)
  sud: `url("data:image/svg+xml,%3Csvg width='22' height='22' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='11' cy='11' r='1.8' fill='white'/%3E%3C/svg%3E")`,

  // Isole — fish scales / overlapping arcs (sea, Sicilian majolica)
  isole: `url("data:image/svg+xml,%3Csvg width='40' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='0' cy='20' r='13' stroke='white' stroke-width='0.6' fill='none'/%3E%3Ccircle cx='20' cy='20' r='13' stroke='white' stroke-width='0.6' fill='none'/%3E%3Ccircle cx='40' cy='20' r='13' stroke='white' stroke-width='0.6' fill='none'/%3E%3Ccircle cx='10' cy='0' r='13' stroke='white' stroke-width='0.6' fill='none'/%3E%3Ccircle cx='30' cy='0' r='13' stroke='white' stroke-width='0.6' fill='none'/%3E%3C/svg%3E")`,

  // Default (no region) — cross-hatch
  default: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
}

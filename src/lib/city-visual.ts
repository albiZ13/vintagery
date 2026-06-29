export type CityVisual = {
  bg: string
}

export const REGION_COLOR: Record<string, string> = {
  'Lombardia':              '#1A2840',
  'Lazio':                  '#6B1E1E',
  'Toscana':                '#7A2E20',
  'Piemonte':               '#2E1A4A',
  'Emilia-Romagna':         '#7A3010',
  'Campania':               '#0A2A50',
  'Veneto':                 '#0E2A3A',
  'Liguria':                '#1A3820',
  'Sicilia':                '#4A2E08',
  'Puglia':                 '#0A2040',
  'Sardegna':               '#083830',
  'Trentino-Alto Adige':   '#1E2E1E',
  'Friuli Venezia Giulia': '#1A1A38',
  'Marche':                 '#382A08',
  'Umbria':                 '#1A2C10',
  'Abruzzo':                '#0A1E3A',
  'Basilicata':             '#381A08',
  'Calabria':               '#2A0808',
  'Molise':                 '#1A2A1A',
  "Valle d'Aosta":          '#0A1E0A',
}

export const DEFAULT_GRADIENT = 'linear-gradient(160deg, #1E2840 0%, #111828 55%, #06090E 100%)'

// Three-stop gradient per region: gives depth without patterns
export const REGION_GRADIENT: Record<string, string> = {
  'Lombardia':              'linear-gradient(160deg, #1E3050 0%, #111D30 55%, #070E18 100%)',
  'Lazio':                  'linear-gradient(160deg, #7A2222 0%, #4A1414 55%, #1E0808 100%)',
  'Toscana':                'linear-gradient(160deg, #8B3A26 0%, #551E14 55%, #220C08 100%)',
  'Piemonte':               'linear-gradient(160deg, #3A2260 0%, #201438 55%, #0E081C 100%)',
  'Emilia-Romagna':         'linear-gradient(160deg, #8B3A14 0%, #552010 55%, #200A04 100%)',
  'Campania':               'linear-gradient(160deg, #0E3260 0%, #081E3C 55%, #040E1C 100%)',
  'Veneto':                 'linear-gradient(160deg, #103240 0%, #082030 55%, #040E18 100%)',
  'Liguria':                'linear-gradient(160deg, #1E4028 0%, #102818 55%, #081208 100%)',
  'Sicilia':                'linear-gradient(160deg, #563410 0%, #342008 55%, #160C02 100%)',
  'Puglia':                 'linear-gradient(160deg, #0C2850 0%, #081830 55%, #040C18 100%)',
  'Sardegna':               'linear-gradient(160deg, #0A4038 0%, #062828 55%, #021414 100%)',
  'Trentino-Alto Adige':   'linear-gradient(160deg, #243428 0%, #142018 55%, #080E08 100%)',
  'Friuli Venezia Giulia': 'linear-gradient(160deg, #202044 0%, #121430 55%, #080816 100%)',
  'Marche':                 'linear-gradient(160deg, #40320A 0%, #281E06 55%, #100C02 100%)',
  'Umbria':                 'linear-gradient(160deg, #203418 0%, #122010 55%, #080E06 100%)',
  'Abruzzo':                'linear-gradient(160deg, #0C2444 0%, #08162C 55%, #040A16 100%)',
  'Basilicata':             'linear-gradient(160deg, #40220A 0%, #281406 55%, #100802 100%)',
  'Calabria':               'linear-gradient(160deg, #320A0A 0%, #1E0606 55%, #0A0202 100%)',
  'Molise':                 'linear-gradient(160deg, #1E2C1E 0%, #121C12 55%, #080C08 100%)',
  "Valle d'Aosta":          'linear-gradient(160deg, #0C2414 0%, #08160C 55%, #040804 100%)',
}

export function getCityVisual(city: string, region: string): CityVisual {
  return { bg: REGION_GRADIENT[region] ?? DEFAULT_GRADIENT }
}

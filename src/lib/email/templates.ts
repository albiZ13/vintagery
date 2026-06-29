// ── Email templates (plain HTML, no framework) ───────────────
// Palette Vintagery: espresso #1c2e4a | sienna #8b4513-like | gold #c9a84c

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

const wrapper = (content: string, unsubscribeUrl?: string) => `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vintagery</title>
</head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#1c2e4a;border-radius:12px 12px 0 0;padding:20px 32px;">
            <a href="${BASE_URL}" style="color:#c9a84c;font-family:Georgia,serif;font-size:22px;font-weight:bold;text-decoration:none;">
              📍 Vintagery
            </a>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e2d8cc;border-right:1px solid #e2d8cc;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f0ece6;border-radius:0 0 12px 12px;border:1px solid #e2d8cc;border-top:0;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8b8074;font-family:system-ui,sans-serif;">
              Hai ricevuto questa email perché sei iscritto agli aggiornamenti di Vintagery.<br/>
              <a href="${unsubscribeUrl ?? BASE_URL + '/impostazioni'}" style="color:#8b4513;text-decoration:underline;">Disiscriviti</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`

export function upcomingEventEmail(opts: {
  firstName: string
  marketName: string
  marketCity: string
  marketId: string
  nextDate: string
  daysLeft: number
}) {
  const dateStr = new Date(opts.nextDate).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1c2e4a;">
      Tra ${opts.daysLeft} giorn${opts.daysLeft === 1 ? 'o' : 'i'}: ${opts.marketName}
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#8b8074;font-family:system-ui,sans-serif;">
      Hai salvato questo mercatino. Ecco il promemoria.
    </p>

    <div style="border:1px solid #e2d8cc;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#1c2e4a;">${opts.marketName}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#8b8074;font-family:system-ui,sans-serif;">📍 ${opts.marketCity}</p>
      <p style="margin:0;font-size:15px;color:#4a4540;font-family:system-ui,sans-serif;">
        🗓 <strong>${dateStr}</strong>
      </p>
    </div>

    <a href="${BASE_URL}/mercatini/${opts.marketId}"
       style="display:inline-block;background:#8b4513;color:#ffffff;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
      Vedi il mercatino →
    </a>

    <p style="margin:24px 0 0;font-size:13px;color:#8b8074;font-family:system-ui,sans-serif;">
      Buon vintage, ${opts.firstName} 🌿
    </p>
  `
  return {
    subject: `Promemoria: ${opts.marketName} tra ${opts.daysLeft} giorn${opts.daysLeft === 1 ? 'o' : 'i'}`,
    html:    wrapper(content),
  }
}

export function newMarketEmail(opts: {
  firstName: string
  marketName: string
  marketCity: string
  marketRegion: string
  marketId: string
}) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1c2e4a;">
      Nuovo mercatino in ${opts.marketRegion}!
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#8b8074;font-family:system-ui,sans-serif;">
      È stato aggiunto un mercatino nella tua zona.
    </p>

    <div style="border:1px solid #e2d8cc;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#1c2e4a;">${opts.marketName}</p>
      <p style="margin:0;font-size:13px;color:#8b8074;font-family:system-ui,sans-serif;">📍 ${opts.marketCity}, ${opts.marketRegion}</p>
    </div>

    <a href="${BASE_URL}/mercatini/${opts.marketId}"
       style="display:inline-block;background:#8b4513;color:#ffffff;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
      Scopri il mercatino →
    </a>

    <p style="margin:24px 0 0;font-size:13px;color:#8b8074;font-family:system-ui,sans-serif;">
      A presto, ${opts.firstName} 🗺️
    </p>
  `
  return {
    subject: `Nuovo mercatino vintage a ${opts.marketCity}`,
    html:    wrapper(content),
  }
}

export function shopApprovedEmail(opts: { shopName: string; shopId: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1c2e4a;">Il tuo negozio è stato approvato!</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4a4540;font-family:system-ui,sans-serif;">
      <strong>${opts.shopName}</strong> è ora verificato su Vintagery. Il tuo profilo è visibile a tutti gli utenti e hai accesso gratuito per 90 giorni.
    </p>
    <a href="${BASE_URL}/negozi/${opts.shopId}"
       style="display:inline-block;background:#1c2e4a;color:#c9a84c;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
      Vedi il tuo profilo →
    </a>
  `
  return { subject: `${opts.shopName} è stato approvato su Vintagery`, html: wrapper(content) }
}

export function shopRejectedEmail(opts: { shopName: string; reason?: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1c2e4a;">Aggiornamento sulla tua richiesta</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#4a4540;font-family:system-ui,sans-serif;">
      La richiesta per <strong>${opts.shopName}</strong> non è stata approvata.
    </p>
    ${opts.reason ? `<p style="margin:0 0 24px;font-size:13px;color:#8b8074;font-family:system-ui,sans-serif;">Motivo: ${opts.reason}</p>` : ''}
    <a href="${BASE_URL}/negozi/nuovo"
       style="display:inline-block;background:#1c2e4a;color:#c9a84c;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
      Riprova →
    </a>
  `
  return { subject: `Aggiornamento su ${opts.shopName}`, html: wrapper(content) }
}

export function proposalApprovedEmail(opts: { proposalName: string; city: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1c2e4a;">Il tuo evento è live!</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4a4540;font-family:system-ui,sans-serif;">
      <strong>${opts.proposalName}</strong> a ${opts.city} è stato approvato ed è ora visibile su Vintagery.
    </p>
    <a href="${BASE_URL}/mercatini"
       style="display:inline-block;background:#1c2e4a;color:#c9a84c;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
      Vedi gli eventi →
    </a>
  `
  return { subject: `Il tuo evento "${opts.proposalName}" è online`, html: wrapper(content) }
}

export function proposalRejectedEmail(opts: { proposalName: string; reason?: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1c2e4a;">Aggiornamento sulla tua proposta</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#4a4540;font-family:system-ui,sans-serif;">
      La proposta <strong>${opts.proposalName}</strong> non è stata approvata.
    </p>
    ${opts.reason ? `<p style="margin:0 0 24px;font-size:13px;color:#8b8074;font-family:system-ui,sans-serif;">Motivo: ${opts.reason}</p>` : ''}
    <a href="${BASE_URL}/proponi"
       style="display:inline-block;background:#1c2e4a;color:#c9a84c;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
      Invia una nuova proposta →
    </a>
  `
  return { subject: `Aggiornamento sulla proposta "${opts.proposalName}"`, html: wrapper(content) }
}

export function weeklyDigestEmail(opts: {
  firstName: string | null
  region: string | null
  city: string | null
  markets: { id: string; name: string; city: string; next_date: string; image_url: string | null }[]
  shops: { id: string; name: string; city: string; avg_rating: number | null }[]
  unsubUrl: string
}) {
  const greeting = opts.firstName ? `Ciao ${opts.firstName},` : 'Ciao,'
  const location = opts.city ?? opts.region ?? 'tutta Italia'

  const marketRows = opts.markets.map(m => {
    const d = new Date(m.next_date + 'T12:00:00')
    const label = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece6;">
          <a href="${BASE_URL}/mercatini/${m.id}"
             style="font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#1c2e4a;text-decoration:none;">
            ${m.name}
          </a><br/>
          <span style="font-family:system-ui,sans-serif;font-size:12px;color:#8b8074;">
            📍 ${m.city} &nbsp;·&nbsp; 🗓 ${label}
          </span>
        </td>
      </tr>
    `
  }).join('')

  const content = `
    <p style="margin:0 0 4px;font-size:14px;color:#4a4540;font-family:system-ui,sans-serif;">${greeting}</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1c2e4a;">Mercatini vintage questo weekend</h1>
    <p style="margin:0 0 24px;font-size:13px;color:#8b8074;font-family:system-ui,sans-serif;">
      ${opts.markets.length} appuntament${opts.markets.length === 1 ? 'o' : 'i'} selezionat${opts.markets.length === 1 ? 'o' : 'i'} per te in ${location}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${marketRows}</table>
    <div style="margin-top:28px;">
      <a href="${BASE_URL}/mercatini"
         style="display:inline-block;background:#1c2e4a;color:#c9a84c;text-decoration:none;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;padding:11px 26px;border-radius:8px;">
        Vedi tutti →
      </a>
    </div>
  `
  return {
    subject: `Questo weekend: ${opts.markets.length} mercatin${opts.markets.length === 1 ? 'o' : 'i'} vintage${opts.region ? ` in ${opts.region}` : ''}`,
    html: wrapper(content, opts.unsubUrl),
  }
}

export function shopPostEmail(opts: {
  firstName: string
  shopName: string
  shopId: string
  caption: string | null
  imageUrl: string | null
}) {
  const content = `
    <p style="margin:0 0 4px;font-size:14px;color:#4a4540;font-family:system-ui,sans-serif;">Ciao ${opts.firstName},</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1c2e4a;">Nuovo post da ${opts.shopName}</h1>
    ${opts.imageUrl ? `<img src="${opts.imageUrl}" alt="" style="width:100%;border-radius:8px;margin-bottom:16px;display:block;" />` : ''}
    ${opts.caption ? `<p style="margin:0 0 24px;font-size:14px;color:#4a4540;font-family:system-ui,sans-serif;">${opts.caption}</p>` : ''}
    <a href="${BASE_URL}/negozi/${opts.shopId}"
       style="display:inline-block;background:#1c2e4a;color:#c9a84c;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
      Vedi il negozio →
    </a>
  `
  return {
    subject: `Nuovo post da ${opts.shopName}`,
    html: wrapper(content),
  }
}

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

export function monthlyDigestEmail(opts: {
  email: string
  region: string | null
  month: number
  year: number
  events: {
    id: string
    name: string
    city: string
    start_date: string
    event_type: string
    price_info: string | null
    is_recurring: boolean
  }[]
  unsubscribeToken: string
}) {
  const monthName    = MONTHS_IT[opts.month - 1]
  const regionLabel  = opts.region ?? 'tutta Italia'
  const unsubUrl     = `${BASE_URL}/api/unsubscribe?token=${opts.unsubscribeToken}`

  const eventRows = opts.events.map(e => {
    const d     = new Date(e.start_date + 'T12:00:00')
    const label = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    const free  = /gratuito|gratis|free/i.test(e.price_info ?? '')
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece6;vertical-align:top;">
          <a href="${BASE_URL}/mercatini/eventi/${e.id}"
             style="font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#1c2e4a;text-decoration:none;">
            ${e.name}
          </a>
          <br/>
          <span style="font-family:system-ui,sans-serif;font-size:12px;color:#8b8074;">
            📍 ${e.city} &nbsp;·&nbsp; 🗓 ${label}
            ${free ? ' &nbsp;·&nbsp; <span style="color:#15803d;">Gratuito</span>' : e.price_info ? ` &nbsp;·&nbsp; ${e.price_info}` : ''}
          </span>
        </td>
      </tr>
    `
  }).join('')

  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#1c2e4a;font-family:Georgia,serif;">
      Calendario vintage — ${monthName} ${opts.year}
    </h1>
    <p style="margin:0 0 24px;font-size:13px;color:#8b8074;font-family:system-ui,sans-serif;">
      ${opts.events.length} appuntament${opts.events.length === 1 ? 'o' : 'i'} in ${regionLabel}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${eventRows}
    </table>

    <div style="margin-top:28px;">
      <a href="${BASE_URL}/mercatini"
         style="display:inline-block;background:#1c2e4a;color:#c9a84c;text-decoration:none;
                font-family:system-ui,sans-serif;font-size:13px;font-weight:600;
                padding:11px 26px;border-radius:8px;">
        Tutto il calendario →
      </a>
    </div>
  `

  return {
    subject: `Calendario vintage ${monthName} ${opts.year}${opts.region ? ` — ${opts.region}` : ''}`,
    html:    wrapper(content, unsubUrl),
  }
}

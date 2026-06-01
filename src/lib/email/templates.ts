// ── Email templates (plain HTML, no framework) ───────────────
// Palette Vintagery: espresso #1c2e4a | sienna #8b4513-like | gold #c9a84c

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

const wrapper = (content: string) => `
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
              Hai ricevuto questa email perché hai attivato le notifiche su Vintagery.<br/>
              <a href="${BASE_URL}/impostazioni" style="color:#8b4513;text-decoration:underline;">Gestisci le tue preferenze</a>
              &nbsp;·&nbsp;
              <a href="${BASE_URL}/impostazioni" style="color:#8b4513;text-decoration:underline;">Disiscriviti</a>
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

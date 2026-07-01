import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

function escapeICS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function toICSDate(dateStr: string, timeStr?: string | null): string {
  const d = new Date(`${dateStr}${timeStr ? 'T' + timeStr : 'T00:00:00'}`)
  if (isNaN(d.getTime())) return dateStr.replace(/-/g, '')
  return timeStr
    ? d.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')
    : dateStr.replace(/-/g, '')
}

function isoDatePlusOne(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id     = searchParams.get('id')
  const source = searchParams.get('source') ?? 'event'

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServerClient()

  let ev: Record<string, any> | null = null

  if (source === 'market') {
    const { data } = await supabase
      .from('markets')
      .select('id,name,description,city,region,address,next_date,start_time,end_time,price_info,website,instagram,organizer_name,schedule_notes,frequency,tips')
      .eq('id', id)
      .single()
    if (data) ev = {
      ...data,
      start_date: data.next_date,
      organizer:  data.organizer_name,
    }
  } else {
    const { data } = await supabase
      .from('market_events')
      .select('*')
      .eq('id', id)
      .single()
    ev = data
  }

  if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allDay   = !ev.start_time
  const startStr = ev.start_date
  const endStr   = ev.end_date ?? (allDay ? isoDatePlusOne(startStr) : startStr)

  const dtstart = toICSDate(startStr, ev.start_time)
  const dtend   = toICSDate(endStr, ev.end_time ?? ev.start_time)

  const dtStartLine = allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`
  const dtEndLine   = allDay ? `DTEND;VALUE=DATE:${dtend}`   : `DTEND:${dtend}`

  const location = [ev.address, ev.city, ev.region].filter(Boolean).join(', ')

  const cadenza = ev.schedule_notes ?? ev.frequency ?? null
  const instagram = ev.instagram ? `@${ev.instagram.replace(/^@/, '')}` : null
  const desc = [
    ev.description ? ev.description.split('\n')[0] : '',
    cadenza        ? `Cadenza: ${cadenza}`          : '',
    ev.price_info  ? `Ingresso: ${ev.price_info}`   : '',
    ev.organizer   ? `Organizzatore: ${ev.organizer}` : '',
    ev.tips        ? `Consigli: ${ev.tips}`          : '',
    instagram      ? `Instagram: ${instagram}`       : '',
    ev.website     ? `Sito: ${ev.website}`           : '',
    `Vintagery: https://vintagery.it/mercatini/${ev.id}`,
  ].filter(Boolean).join('\\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vintagery//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}@vintagery.it`,
    `${dtStartLine}`,
    `${dtEndLine}`,
    `SUMMARY:${escapeICS(ev.name)}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    desc ? `DESCRIPTION:${desc}` : '',
    `URL:https://vintagery.it/mercatini/${ev.id}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const slug = ev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  return new NextResponse(ics, {
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
    },
  })
}

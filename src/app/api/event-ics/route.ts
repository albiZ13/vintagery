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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServerClient()
  const { data: ev, error } = await supabase
    .from('market_events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const dtstart = toICSDate(ev.start_date, ev.start_time)
  const dtend   = toICSDate(ev.end_date ?? ev.start_date, ev.end_time ?? ev.start_time)

  const allDay = !ev.start_time
  const dtStartLine = allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`
  const dtEndLine   = allDay ? `DTEND;VALUE=DATE:${dtend}`   : `DTEND:${dtend}`

  const location = [ev.address, ev.city, ev.region].filter(Boolean).join(', ')
  const desc = [
    ev.description ? ev.description.split('\n')[0] : '',
    ev.price_info  ? `Ingresso: ${ev.price_info}`  : '',
    ev.organizer   ? `Organizzatore: ${ev.organizer}` : '',
    ev.website     ? `Sito: ${ev.website}` : '',
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
    ev.website ? `URL:${ev.website}` : '',
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

/**
 * USA-9: Calendar export — generates a single-event .ics for a listing.
 * If the listing has a sale_date, the event is on that day (all-day).
 * Otherwise returns 404.
 */
import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcsDate(d: string): string {
  // YYYY-MM-DD -> YYYYMMDD
  return d.replace(/-/g, '');
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return new NextResponse('Bad id', { status: 400 });

  const { data, error } = await supabasePublic
    .from('listings')
    .select('id, clean_title, raw_title, summary, state, source_url, sale_date, source_name')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) return new NextResponse('Not found', { status: 404 });
  if (!data.sale_date) return new NextResponse('Listing has no sale_date', { status: 404 });

  const title = data.clean_title || data.raw_title || 'Listing';
  const desc = [data.summary, data.source_name ? `Source: ${data.source_name}` : null, data.source_url]
    .filter(Boolean)
    .join('\\n\\n');
  const start = formatIcsDate(data.sale_date);
  const endDate = new Date(data.sale_date + 'T00:00:00');
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = formatIcsDate(endDate.toISOString().slice(0, 10));
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//REALM Radar Canada//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:radar-usa-${data.id}@realm`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(desc)}`,
    data.state ? `LOCATION:${escapeIcs(data.state)}` : '',
    data.source_url ? `URL:${data.source_url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return new NextResponse(lines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="radar-${id.slice(0, 8)}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

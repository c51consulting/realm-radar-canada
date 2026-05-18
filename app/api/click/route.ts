/**
 * POST /api/click — records an outbound click for KPI analytics.
 * Called via sendBeacon() from RadarCard when a user clicks an external link.
 * Zero PII. Stores listing_id, source, category, state, cta_kind, target_url.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

export const runtime = 'nodejs';

const Body = z.object({
  listing_id: z.string().uuid().optional().or(z.literal('')),
  source_name: z.string().max(200).optional().or(z.literal('')),
  source_type: z.string().max(60).optional().or(z.literal('')),
  category: z.string().max(60).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  cta_kind: z.string().max(40).optional().or(z.literal('')),
  target_url: z.string().max(2000).optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    const json = await req.json();
    parsed = Body.parse(json);
  } catch {
    // Telemetry is best-effort. Don't error on malformed beacon payloads.
    return NextResponse.json({ ok: false }, { status: 204 });
  }

  const sb = supabaseAdmin();
  await sb.from('outbound_clicks').insert({
    listing_id: parsed.listing_id || null,
    source_name: parsed.source_name || null,
    source_type: parsed.source_type || null,
    category: parsed.category || null,
    state: parsed.state || null,
    cta_kind: parsed.cta_kind || null,
    target_url: parsed.target_url || null,
    user_agent: req.headers.get('user-agent') || null,
    referrer: req.headers.get('referer') || null,
  });

  return NextResponse.json({ ok: true });
}

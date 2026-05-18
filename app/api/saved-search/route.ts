/**
 * Per-keyword saved-search email alerts (CROSS-6).
 *
 * Accepts an email + the current keyword + filter snapshot, persists a row in
 * `saved_searches`, and sends a double-opt-in confirmation. Once confirmed,
 * the weekly-digest cron also sends a "matches for your saved search" block
 * scoped to those filters.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, emailConfigured, savedSearchConfirmHtml, savedSearchConfirmText } from '@/lib/email';
import { z } from 'zod';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email(),
  keyword: z.string().trim().max(120).optional().nullable(),
  filters: z.record(z.any()).optional().default({}),
  cadence: z.enum(['weekly', 'daily', 'instant']).optional().default('weekly'),
});

function describeFilters(keyword: string | null | undefined, filters: Record<string, unknown>): string {
  const parts: string[] = [];
  if (keyword) parts.push(`“${keyword}”`);
  for (const [k, v] of Object.entries(filters)) {
    if (v == null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    const label = k.replace(/_/g, ' ');
    parts.push(`${label}: ${Array.isArray(v) ? v.join(', ') : v}`);
  }
  return parts.length ? parts.join(' · ') : 'all listings';
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const email = parsed.email.toLowerCase().trim();
  const keyword = parsed.keyword?.trim() || null;
  // Drop empty values from filters before persisting so the dedup unique index
  // treats { state: 'TX' } and { state: 'TX', region: '' } as the same row.
  const filters: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.filters || {})) {
    if (v == null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    filters[k] = v;
  }

  if (!keyword && Object.keys(filters).length === 0) {
    return NextResponse.json(
      { error: 'Provide at least a keyword or one filter to save.' },
      { status: 400 },
    );
  }

  // Upsert by (email, keyword, filters) — the unique index dedups exact repeats.
  // We first try to find an existing row so we can rotate the confirm token
  // and resend confirmation rather than 23505 the user.
  const { data: existing } = await sb
    .from('saved_searches')
    .select('id, confirmed')
    .ilike('email', email)
    .eq('filters', filters as any)
    .eq('keyword', keyword)
    .maybeSingle();

  let token: string;
  if (existing) {
    // Rotate token and re-send confirmation
    const { data: updated, error: upErr } = await sb
      .from('saved_searches')
      .update({
        confirmed: false,
        confirmed_at: null,
        unsubscribed_at: null,
        confirm_token: crypto.randomUUID(),
        updated_at: new Date().toISOString(),
        cadence: parsed.cadence,
      })
      .eq('id', existing.id)
      .select('confirm_token')
      .single();
    if (upErr || !updated) {
      return NextResponse.json({ error: upErr?.message || 'update failed' }, { status: 500 });
    }
    token = updated.confirm_token;
  } else {
    const { data: inserted, error: insErr } = await sb
      .from('saved_searches')
      .insert({
        email,
        keyword,
        filters,
        cadence: parsed.cadence,
      })
      .select('confirm_token')
      .single();
    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message || 'insert failed' }, { status: 500 });
    }
    token = inserted.confirm_token;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || new URL(req.url).origin;
  const confirmUrl = `${siteUrl}/radar/confirm?type=saved_search&token=${token}`;
  const description = describeFilters(keyword, filters);

  if (!emailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        warning: 'email_not_configured',
        message: 'Saved, but confirmation email is not yet wired up.',
      },
      { status: 202 },
    );
  }

  const sendResult = await sendEmail({
    to: email,
    subject: 'Confirm your REALM Radar saved search',
    html: savedSearchConfirmHtml({ confirmUrl, email, description }),
    text: savedSearchConfirmText({ confirmUrl, email, description }),
    replyTo: 'radar@realmgroup.global',
  });

  if (!sendResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Could not send confirmation email. Please try again or contact radar@realmgroup.global.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: 'confirmation_sent', description });
}

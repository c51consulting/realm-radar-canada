/**
 * CROSS-6 · Saved-search alerts cron.
 *
 * Runs daily. For every confirmed saved_search, finds listings published since
 * last_notified_at (or 7 days back if null) that match the saved filters and
 * keyword. Sends one email per matching saved search. Updates last_notified_at
 * even when no matches, to avoid runaway query growth on idle searches.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, emailConfigured, weeklyDigestHtml, weeklyDigestText } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 300;

function cronAuthOk(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function describeFilters(keyword: string | null | undefined, filters: Record<string, unknown> | null): string {
  const parts: string[] = [];
  if (keyword) parts.push(`“${keyword}”`);
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v == null || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      const label = k.replace(/_/g, ' ');
      parts.push(`${label}: ${Array.isArray(v) ? v.join(', ') : v}`);
    }
  }
  return parts.length ? parts.join(' · ') : 'all listings';
}

export async function GET(req: NextRequest) {
  if (!cronAuthOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ ok: false, error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const sb = supabaseAdmin();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://realmgroup.global').replace(/\/$/, '');

  const { data: searches, error: ssErr } = await sb
    .from('saved_searches')
    .select('id, email, keyword, filters, last_notified_at, confirm_token')
    .eq('confirmed', true)
    .is('unsubscribed_at', null);

  if (ssErr) return NextResponse.json({ ok: false, error: ssErr.message }, { status: 500 });
  const all = searches || [];
  if (all.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_saved_searches' });
  }

  let totalSent = 0;
  let totalFailed = 0;
  const perSearch: Array<{ id: string; email: string; matches: number; sent: boolean }> = [];

  for (const s of all) {
    const since = s.last_notified_at || new Date(Date.now() - 7 * 86400 * 1000).toISOString();
    const filters = (s.filters || {}) as Record<string, unknown>;

    let q = sb
      .from('listings')
      .select('id, clean_title, raw_title, state, category, source_name, source_url, display_url, realm_take, priority_score, sale_date')
      .eq('status', 'published')
      .gte('published_at', since)
      .order('priority_score', { ascending: false })
      .limit(20);

    // Filter mapping for USA listings.
    if (typeof filters.state === 'string' && filters.state) q = q.eq('state', filters.state);
    if (typeof filters.category === 'string' && filters.category) q = q.eq('category', filters.category);
    if (typeof filters.region === 'string' && filters.region) q = q.eq('region', filters.region);
    if (typeof filters.source_type === 'string' && filters.source_type) q = q.eq('source_type', filters.source_type);

    const keyword = (s.keyword as string | null)?.trim() || null;
    if (keyword) {
      const safe = keyword.replace(/[%_]/g, '\\$&');
      q = q.or(`clean_title.ilike.%${safe}%,raw_title.ilike.%${safe}%,summary.ilike.%${safe}%,realm_take.ilike.%${safe}%`);
    }

    const { data: items, error: itemsErr } = await q;
    if (itemsErr) {
      console.warn('[saved-search-alerts] query failed for', s.id, itemsErr.message);
      continue;
    }
    const matches = items || [];

    // Always advance last_notified_at to "now" so we don't re-scan the same window forever.
    const nowIso = new Date().toISOString();
    await sb.from('saved_searches').update({ last_notified_at: nowIso }).eq('id', s.id);

    if (matches.length === 0) {
      perSearch.push({ id: s.id as string, email: s.email as string, matches: 0, sent: false });
      continue;
    }

    const description = describeFilters(keyword, filters);
    const groups = [{ heading: `New matches for ${description} (${matches.length})`, items: matches }];
    const weekLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const unsubscribeUrl = `${siteUrl}/radar/confirm?type=saved_search&action=unsubscribe&token=${encodeURIComponent(s.confirm_token || '')}`;
    const intro = `New listings matched your saved search (${description}) since we last checked.`;

    const html = weeklyDigestHtml({ intro, groups, unsubscribeUrl, siteUrl, weekLabel });
    const text = weeklyDigestText({ intro, groups, unsubscribeUrl, siteUrl, weekLabel });

    const res = await sendEmail({
      to: s.email as string,
      subject: `REALM Radar · ${matches.length} new match${matches.length === 1 ? '' : 'es'} for your saved search`,
      html,
      text,
      replyTo: 'radar@realmgroup.global',
    });

    if (res.ok) {
      totalSent += 1;
      perSearch.push({ id: s.id as string, email: s.email as string, matches: matches.length, sent: true });
    } else {
      totalFailed += 1;
      perSearch.push({ id: s.id as string, email: s.email as string, matches: matches.length, sent: false });
    }
  }

  return NextResponse.json({
    ok: true,
    total_saved_searches: all.length,
    emails_sent: totalSent,
    emails_failed: totalFailed,
    per_search: perSearch,
  });
}

/** Vercel cron: every 5 min, processes a batch of new listings via AI enrichment. */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enrichListing, decideStatus, permissionDefaults } from '@/lib/enrichment';
import { normalizeState } from '@/lib/states';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: pending } = await sb
    .from('listings').select('id, raw_title, raw_snippet, source_url, source_name, date_found')
    .eq('status', 'new').order('date_found').limit(15);

  let ok = 0, fail = 0;
  for (const row of pending || []) {
    try {
      const e = await enrichListing({
        title: row.raw_title, snippet: row.raw_snippet,
        url: row.source_url, source_name: row.source_name, found_date: row.date_found,
      });
      const status = decideStatus(e);
      const perms = permissionDefaults(e.source_type);
      await sb.from('listings').update({
        clean_title: e.clean_title,
        summary: e.summary, realm_take: e.realm_take,
        newsletter_snippet: e.newsletter_snippet, linkedin_snippet: e.linkedin_snippet,
        state: normalizeState(e.state),
        region: e.region === 'unknown' ? null : e.region,
        category: e.category === 'unknown' ? null : e.category,
        subcategory: e.subcategory, source_type: e.source_type,
        signal_type: e.signal_type === 'none' ? null : e.signal_type,
        sale_date: /^\d{4}-\d{2}-\d{2}$/.test(e.sale_date) ? e.sale_date : null,
        priority_score: e.priority_score, confidence_score: e.confidence_score,
        target_audience: e.target_audience, risk_flags: e.risk_flags,
        duplicate_status: e.duplicate_likelihood,
        permission_level: perms.permission_level,
        image_allowed: perms.image_allowed,
        primary_cta: e.primary_cta, secondary_cta: e.secondary_cta, status,
      }).eq('id', row.id);
      ok++;
    } catch (e: any) { fail++; console.error(row.id, e.message); }
  }

  // Auto-publish ai_reviewed rows that meet quality bar
  let published = 0;
  try {
    const { data: pub, error: pubErr } = await sb.rpc('auto_publish_reviewed', { p_min_score: 50 });
    if (!pubErr && typeof pub === 'number') published = pub;
    else if (pubErr) {
      // Fallback: do it inline if RPC missing
      const { data: toPublish } = await sb
        .from('listings')
        .select('id, risk_flags, priority_score, state, category')
        .eq('status', 'ai_reviewed')
        .not('state', 'is', null)
        .not('category', 'is', null)
        .gte('priority_score', 50);
      for (const r of toPublish || []) {
        const flags: string[] = r.risk_flags || [];
        if (flags.includes('off_topic') || flags.includes('promotional')) continue;
        const { error: upErr } = await sb
          .from('listings')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', r.id);
        if (!upErr) published++;
      }
    }
  } catch (e: any) {
    console.error('auto-publish failed', e?.message);
  }

  // Refresh featured flags (top 3 by priority per category)
  let featured = 0;
  try {
    const { data: feat } = await sb.rpc('refresh_featured');
    if (typeof feat === 'number') featured = feat;
  } catch (e: any) {
    console.error('refresh_featured failed', e?.message);
  }

  // Autonomy fallback: when AI enrichment is unavailable (e.g. OPENAI_API_KEY
  // not configured, quota exceeded), still surface parser-validated listings.
  // Rows that came from a registered parser already have title+state+category
  // — they're trustworthy enough to publish as market_movement signals.
  let auto_published = 0;
  try {
    const { data: parserRows } = await sb
      .from('listings')
      .select('id, raw_title, raw_snippet')
      .eq('status', 'new')
      .not('state', 'is', null)
      .not('category', 'is', null)
      .not('raw_payload->>parser', 'is', null)
      .lt('date_found', new Date(Date.now() - 10 * 60_000).toISOString()) // give AI a 10-min head start
      .limit(50);
    for (const r of parserRows || []) {
      const { error: upErr } = await sb.from('listings').update({
        status: 'published',
        published_at: new Date().toISOString(),
        clean_title: r.raw_title,
        summary: r.raw_snippet,
        signal_type: 'market_movement',
        permission_level: 'public_link_only',
        image_allowed: false,
        featured: false,
        priority_score: 60,
        confidence_score: 75,
      }).eq('id', r.id);
      if (!upErr) auto_published++;
    }
  } catch (e: any) {
    console.error('parser-autopublish failed', e?.message);
  }

  return NextResponse.json({ ok, fail, processed: (pending || []).length, published, featured, auto_published });
}

function cronAuthOk(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

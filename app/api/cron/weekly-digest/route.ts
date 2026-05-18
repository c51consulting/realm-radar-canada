/**
 * Vercel cron: Friday 13:00 UTC (= 8am US Central).
 * Builds the weekly REALM Radar email from the last 7 days of published listings,
 * has the AI draft an editorial intro, then sends to every confirmed subscriber via Resend.
 * Records the digest row + per-recipient outcomes in `digests`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, weeklyDigestHtml, weeklyDigestText, emailConfigured } from '@/lib/email';
import OpenAI from 'openai';
import { STATE_NAMES } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

function cronAuthOk(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function prettyCategory(c: string | null | undefined): string {
  if (!c) return 'General';
  const map: Record<string, string> = {
    machinery: 'Machinery',
    livestock: 'Livestock',
    land_property: 'Land & Property',
    farm_equipment: 'Farm Equipment',
    vehicles_transport: 'Vehicles & Transport',
    inputs_supplies: 'Inputs & Supplies',
    farm_business_opportunities: 'Farm Business Opportunities',
    realm_marketplace: 'REALM Marketplace',
    partner_listings: 'Partner Opportunities',
  };
  return map[c] || c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function GET(req: NextRequest) {
  if (!cronAuthOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ ok: false, error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const weekStarting = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://realmgroup.global').replace(/\/$/, '');

  // 1. Pull last-7-day published listings.
  const { data: items, error: listErr } = await sb
    .from('listings')
    .select('id, clean_title, raw_title, state, category, source_name, source_url, display_url, realm_take, priority_score, sale_date')
    .eq('status', 'published')
    .gte('updated_at', since)
    .order('priority_score', { ascending: false })
    .limit(40);

  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  const listings = items || [];
  if (listings.length === 0) {
    // Nothing new — skip send entirely. Skipping is a feature.
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_new_listings' });
  }

  // 2. Group by category (then by state inside).
  const byCat: Record<string, typeof listings> = {};
  for (const l of listings) {
    const k = l.category || 'general';
    (byCat[k] = byCat[k] || []).push(l);
  }
  const groups = Object.entries(byCat)
    .map(([cat, arr]) => ({
      heading: `${prettyCategory(cat)} (${arr.length})`,
      items: arr.slice(0, 6),
    }))
    .sort((a, b) => b.items.length - a.items.length);

  // 3. AI intro.
  let introText = 'A look at agricultural auctions, machinery sales, livestock listings and rural property activity from the last seven days across the US.';
  try {
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const top = listings.slice(0, 5);
      const prompt = `You are drafting the intro for REALM Radar Weekly Canada.
Top items this week (priority desc):
${top.map((t, i) => `${i + 1}. ${t.clean_title || t.raw_title} — ${t.state ? STATE_NAMES[t.state] || t.state : 'Canada'}/${prettyCategory(t.category)} — ${t.realm_take || ''}`).join('\n')}

Write a 2-3 sentence editorial intro that names notable market themes. Plain English. No hype. No greetings. Do not say "this week" more than once.`;
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });
      introText = completion.choices[0].message.content?.trim() || introText;
    }
  } catch (e) {
    console.warn('[weekly-digest] intro generation failed, using fallback:', e);
  }

  // 4. Pull confirmed subscribers.
  const { data: subs, error: subErr } = await sb
    .from('subscribers')
    .select('email, confirm_token')
    .not('confirmed_at', 'is', null);

  if (subErr) {
    return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
  }
  const recipients = subs || [];

  if (recipients.length === 0) {
    // No one to send to — still record what we would have sent.
    await sb.from('digests').insert({
      week_starting: weekStarting,
      recipient_count: 0,
      success_count: 0,
      failure_count: 0,
      intro_text: introText,
      listing_ids: listings.map((l) => l.id),
      status: 'skipped_no_recipients',
      metadata: { groups: groups.map((g) => ({ heading: g.heading, count: g.items.length })) },
    });
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_subscribers', listings: listings.length });
  }

  const weekLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // 5. Send.
  let success = 0;
  let failure = 0;
  const errors: string[] = [];
  for (const r of recipients) {
    const unsubscribeUrl = `${siteUrl}/radar/confirm?action=unsubscribe&token=${encodeURIComponent(r.confirm_token || '')}`;
    const html = weeklyDigestHtml({ intro: introText, groups, unsubscribeUrl, siteUrl, weekLabel });
    const text = weeklyDigestText({ intro: introText, groups, unsubscribeUrl, siteUrl, weekLabel });
    const res = await sendEmail({
      to: r.email,
      subject: `REALM Radar Canada — ${weekLabel}`,
      html,
      text,
      replyTo: 'radar@realmgroup.global',
    });
    if (res.ok) {
      success += 1;
    } else {
      failure += 1;
      errors.push(`${r.email}: ${res.reason}${'error' in res && res.error ? ` (${res.error})` : ''}`);
    }
  }

  await sb.from('digests').insert({
    week_starting: weekStarting,
    recipient_count: recipients.length,
    success_count: success,
    failure_count: failure,
    intro_text: introText,
    listing_ids: listings.map((l) => l.id),
    status: failure === 0 ? 'sent' : 'sent_with_failures',
    metadata: { errors: errors.slice(0, 20), groups: groups.map((g) => ({ heading: g.heading, count: g.items.length })) },
  });

  return NextResponse.json({
    ok: true,
    recipients: recipients.length,
    success,
    failure,
    listings: listings.length,
  });
}

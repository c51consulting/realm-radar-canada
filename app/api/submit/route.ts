import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { sendEmail, submissionNotificationHtml, emailConfigured } from '@/lib/email';

export const runtime = 'nodejs';

const Body = z.object({
  business_name: z.string().min(2).max(200),
  contact_name: z.string().max(200).optional().or(z.literal('')),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  listing_url: z.string().url(),
  state: z.string().max(2).optional().or(z.literal('')),
  category: z.string().max(40).optional().or(z.literal('')),
  sale_date: z.string().optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  permission_to_feature: z.string().optional(),
  paid_feature_interest: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    const json = await req.json();
    parsed = Body.parse(json);
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const ipHash = await hashIp(req.headers.get('x-forwarded-for') || '');
  const { error } = await sb.from('submissions').insert({
    business_name: parsed.business_name,
    contact_name: parsed.contact_name || null,
    email: parsed.email,
    phone: parsed.phone || null,
    website: parsed.website || null,
    listing_url: parsed.listing_url,
    state: parsed.state || null,
    category: parsed.category || null,
    sale_date: parsed.sale_date || null,
    description: parsed.description || null,
    permission_to_feature: parsed.permission_to_feature === 'true',
    paid_feature_interest: parsed.paid_feature_interest === 'true',
    ip_hash: ipHash,
    user_agent: req.headers.get('user-agent') || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire a notification email to the radar inbox. Best-effort: a failure here
  // does NOT fail the submission (the row is already in the DB).
  if (emailConfigured()) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://realmgroup.global').replace(/\/$/, '');
    const notifyTo = process.env.SUBMISSION_NOTIFY_EMAIL || 'radar@realmgroup.global';
    const html = submissionNotificationHtml({
      businessName: parsed.business_name,
      contactName: parsed.contact_name || null,
      email: parsed.email,
      phone: parsed.phone || null,
      website: parsed.website || null,
      listingUrl: parsed.listing_url,
      state: parsed.state || null,
      category: parsed.category || null,
      saleDate: parsed.sale_date || null,
      description: parsed.description || null,
      permissionToFeature: parsed.permission_to_feature === 'true',
      paidFeatureInterest: parsed.paid_feature_interest === 'true',
      adminUrl: `${siteUrl}/admin`,
    });
    sendEmail({
      to: notifyTo,
      subject: `New REALM Radar submission — ${parsed.business_name}`,
      html,
      text: `New REALM Radar submission from ${parsed.business_name} <${parsed.email}>. Listing: ${parsed.listing_url}. Review: ${siteUrl}/admin`,
      replyTo: parsed.email,
    }).catch((e) => console.error('[submit] notification email failed:', e));
  }

  return NextResponse.json({ ok: true });
}

async function hashIp(ip: string): Promise<string> {
  const enc = new TextEncoder().encode(ip + (process.env.CRON_SECRET || ''));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

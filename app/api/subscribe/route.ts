import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, emailConfigured, confirmEmailHtml, confirmEmailText } from '@/lib/email';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email(),
  states: z.array(z.string().max(2)).optional().default([]),
  categories: z.array(z.string().max(40)).optional().default([]),
  cadence: z.enum(['weekly', 'daily']).optional().default('weekly'),
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
  const email = parsed.email.toLowerCase().trim();

  // Generate a fresh confirm token for double-opt-in.
  // If a row exists already (re-subscribe / preference update) we rotate the token
  // so an old confirmation link can't be replayed later.
  const token = randomUUID();
  const now = new Date().toISOString();

  const { error: dbErr } = await sb.from('subscribers').upsert(
    {
      email,
      states: parsed.states,
      categories: parsed.categories,
      cadence: parsed.cadence,
      confirmed: false,
      confirmed_at: null,
      confirm_token: token,
      confirmation_sent_at: now,
      unsubscribed_at: null,
    },
    { onConflict: 'email' },
  );
  if (dbErr) {
    console.error('[subscribe] db upsert failed:', dbErr);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Build the confirmation URL. Prefer NEXT_PUBLIC_SITE_URL (already set on Vercel),
  // fall back to request origin so previews work too.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    new URL(req.url).origin;
  const confirmUrl = `${siteUrl}/radar/confirm?token=${token}`;

  // Send the confirmation email.
  if (!emailConfigured()) {
    // Honest failure: the row is in the DB but no email went out. Tell the caller.
    // The client surfaces this as a clear "couldn't send confirmation" state
    // rather than the misleading "you're on the list" success card.
    console.warn('[subscribe] RESEND_API_KEY missing — confirmation email NOT sent for', email);
    return NextResponse.json(
      {
        ok: false,
        warning: 'email_not_configured',
        message:
          'Your details were saved, but our confirmation email is not yet wired up. We will follow up manually.',
      },
      { status: 202 },
    );
  }

  const sendResult = await sendEmail({
    to: email,
    subject: 'Confirm your REALM Radar subscription',
    html: confirmEmailHtml({ confirmUrl, email }),
    text: confirmEmailText({ confirmUrl, email }),
    replyTo: 'radar@realmgroup.global',
  });

  if (!sendResult.ok) {
    console.error('[subscribe] email send failed:', sendResult);
    return NextResponse.json(
      { ok: false, error: 'Could not send confirmation email. Please try again or contact radar@realmgroup.global.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: 'confirmation_sent' });
}

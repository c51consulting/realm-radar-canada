/**
 * Webhook dispatch endpoint.
 * - GET (with Authorization: Bearer $CRON_SECRET): run a dispatch pass and return JSON stats.
 * - POST: same, with optional {lookback_minutes} body.
 */
import { NextResponse } from 'next/server';
import { dispatchWebhooks } from '../../../../lib/webhook-dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authed(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const h = req.headers.get('authorization') || '';
  return h === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authed(req)) return new NextResponse('Unauthorized', { status: 401 });
  const result = await dispatchWebhooks({});
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  if (!authed(req)) return new NextResponse('Unauthorized', { status: 401 });
  let body: { lookback_minutes?: number } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const result = await dispatchWebhooks({ lookbackMinutes: body.lookback_minutes });
  return NextResponse.json({ ok: true, ...result });
}

/** Vercel cron: hourly RSS poller. Pulls Google News feeds and ingests into listings. */
import { NextRequest, NextResponse } from 'next/server';
import { pollOnce } from '@/workers/rss-poller';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!cronAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const result = await pollOnce();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error('poll-rss error', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

function cronAuthOk(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

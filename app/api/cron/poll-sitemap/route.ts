/** Vercel cron: sitemap poller for direct auction/marketplace sources.
 *  Runs at :30 past the hour (offset from poll-rss at :00). */
import { NextRequest, NextResponse } from 'next/server';
import { pollSitemapsOnce } from '@/workers/sitemap-poller';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!cronAuthOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await pollSitemapsOnce();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error('poll-sitemap error', e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 },
    );
  }
}

function cronAuthOk(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get('authorization');
  return provided === `Bearer ${secret}`;
}

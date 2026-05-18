/**
 * Tokenized feed access — partner authentication + usage tracking.
 *
 * Usage in a route handler:
 *   const auth = await authorizeFeedToken(req, '/feeds/all.xml', 'all');
 *   if (!auth.ok) return new NextResponse(auth.error, { status: auth.status });
 *   // ...build feed...
 *   await logFeedTokenUse(auth.token, '/feeds/all.xml', 200, bytes, req);
 *
 * Open public feeds do NOT call this — only protected feeds (e.g. /feeds/partner/*) do.
 */
import { supabaseAdmin } from './supabase';
import { createHash } from 'crypto';

export type FeedTokenAuth =
  | { ok: true; token: string; partner: string; scopes: string[] }
  | { ok: false; status: number; error: string };

/**
 * Verify a token from `?token=` or `Authorization: Bearer <token>`.
 * `requiredScope` is the slice the partner is requesting (e.g. 'all', 'export', 'livestock').
 * A token with scope 'all' OR the specific scope is accepted.
 */
export async function authorizeFeedToken(
  req: Request,
  feedPath: string,
  requiredScope: string
): Promise<FeedTokenAuth> {
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token');
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const token = queryToken || bearer;
  if (!token) {
    return { ok: false, status: 401, error: 'Missing token. Provide ?token=… or Authorization: Bearer …' };
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('feed_tokens')
    .select('token, partner_name, scopes, revoked, rate_limit_per_minute')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }
  if (data.revoked) {
    return { ok: false, status: 403, error: 'Token revoked' };
  }
  const scopes: string[] = data.scopes || [];
  if (!scopes.includes('all') && !scopes.includes(requiredScope)) {
    return { ok: false, status: 403, error: `Token does not include scope "${requiredScope}"` };
  }

  // Rate-limit check (best-effort, last minute)
  if (data.rate_limit_per_minute && data.rate_limit_per_minute > 0) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin
      .from('feed_token_events')
      .select('*', { count: 'exact', head: true })
      .eq('token', token)
      .gte('created_at', since);
    if (typeof count === 'number' && count >= data.rate_limit_per_minute) {
      return { ok: false, status: 429, error: `Rate limit: ${data.rate_limit_per_minute} req/min` };
    }
  }

  return { ok: true, token, partner: data.partner_name, scopes };
}

/** Fire-and-forget usage log. Hashes IP for privacy. */
export async function logFeedTokenUse(
  token: string,
  feedPath: string,
  statusCode: number,
  bytes: number,
  req: Request
): Promise<void> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '';
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : null;
    const userAgent = req.headers.get('user-agent') || null;
    const admin = supabaseAdmin();
    await admin.from('feed_token_events').insert({
      token,
      feed_path: feedPath,
      status_code: statusCode,
      user_agent: userAgent ? userAgent.slice(0, 500) : null,
      ip_hash: ipHash,
      bytes,
    });
    // Bump last_used_at (use_count is derived from feed_token_events on read).
    await admin
      .from('feed_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token);
  } catch (e) {
    console.error('[logFeedTokenUse]', e);
  }
}

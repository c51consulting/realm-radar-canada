/**
 * Tokenized partner feed.
 *
 *   GET /feeds/partner/<scope>.<ext>?token=<token>
 *   GET /feeds/partner/<scope>.<ext>  (Authorization: Bearer <token>)
 *
 * Scopes resolve to filters:
 *   - all              → master firehose
 *   - livestock        → category=livestock
 *   - machinery        → category=machinery
 *   - texas            → state=TX
 *   - texas-livestock  → state=TX + category=livestock
 *
 * Same payload shape as public feeds but gated by token + tracked per partner.
 */
import { NextResponse } from 'next/server';
import { buildRss, buildJsonFeed, rssHeaders, jsonHeaders, type FeedMeta } from '../../../../lib/feeds';
import { fetchFeedListings, listingToFeedItem, feedUrlFor, siteUrl } from '../../../../lib/feed-source';
import { authorizeFeedToken, logFeedTokenUse } from '../../../../lib/feed-token';
import { normalizeState } from '../../../../lib/states';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KNOWN_CATEGORIES = new Set([
  'livestock','machinery','vehicles_transport','farm_equipment','land_property','inputs_supplies',
]);

function parseScope(scope: string): { state?: string; category?: string; label: string } | null {
  if (scope === 'all') return { label: 'All listings' };
  if (KNOWN_CATEGORIES.has(scope)) return { category: scope, label: prettyCat(scope) };
  const state = normalizeState(scope.replace(/-/g, ' '));
  if (state) return { state, label: state };
  // state-category combo: e.g. "texas-livestock"
  const parts = scope.split('-');
  for (let i = 1; i < parts.length; i++) {
    const left = parts.slice(0, i).join(' ');
    const right = parts.slice(i).join('_');
    const s = normalizeState(left);
    if (s && KNOWN_CATEGORIES.has(right)) {
      return { state: s, category: right, label: `${s} ${prettyCat(right)}` };
    }
  }
  return null;
}

function prettyCat(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scope: string }> }
) {
  const { scope: rawScope } = await params;
  const m = (rawScope || '').match(/^(.+?)\.(xml|json)$/i);
  if (!m) return new NextResponse('Not found', { status: 404 });
  const scope = m[1].toLowerCase();
  const format = m[2].toLowerCase();

  const parsed = parseScope(scope);
  if (!parsed) return new NextResponse('Unknown scope', { status: 404 });

  const feedPath = `/feeds/partner/${scope}.${format}`;
  const auth = await authorizeFeedToken(req, feedPath, scope);
  if (!auth.ok) {
    return new NextResponse(auth.error, { status: auth.status });
  }

  const listings = await fetchFeedListings({
    state: parsed.state,
    category: parsed.category,
    limit: 100,
  });
  const items = listings.map(listingToFeedItem);
  const meta: FeedMeta = {
    title: `REALM Radar Canada — Partner feed · ${parsed.label}`,
    description: `Partner feed for ${auth.partner}. Scope: ${parsed.label}.`,
    feedUrl: feedUrlFor(feedPath),
    siteUrl: siteUrl(),
  };

  let body: string;
  let headers: HeadersInit;
  if (format === 'json') {
    body = JSON.stringify(buildJsonFeed(meta, items));
    headers = jsonHeaders();
  } else {
    body = buildRss(meta, items);
    headers = rssHeaders();
  }

  // Override cache: partner feeds are non-cacheable per-partner.
  const headersFinal = new Headers(headers);
  headersFinal.set('Cache-Control', 'private, no-store');

  // Fire-and-forget logging (don't block response).
  logFeedTokenUse(auth.token, feedPath, 200, body.length, req).catch(() => {});

  return new NextResponse(body, { status: 200, headers: headersFinal });
}

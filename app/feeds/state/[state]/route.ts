import { NextResponse } from 'next/server';
import { buildRss, buildJsonFeed, rssHeaders, jsonHeaders, type FeedMeta } from '../../../../lib/feeds';
import { fetchFeedListings, listingToFeedItem, feedUrlFor, siteUrl } from '../../../../lib/feed-source';
import { normalizeState, CODE_TO_NAME, SLUG_TO_CODE } from '../../../../lib/states';

export const revalidate = 600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state: rawParam } = await params;
  const raw = rawParam || '';
  const m = raw.match(/^(.+?)\.(xml|json)$/i);
  if (!m) {
    return new NextResponse('Not found', { status: 404 });
  }
  const stateInput = m[1].toLowerCase();
  const format = m[2].toLowerCase();

  // Accept slugified province name first, then fallback to 2-letter or full name.
  let stateCode = SLUG_TO_CODE[stateInput] || null;
  if (!stateCode) {
    stateCode = normalizeState(stateInput.replace(/-/g, ' '));
  }
  if (!stateCode) {
    return new NextResponse('Unknown province', { status: 404 });
  }
  const stateName = CODE_TO_NAME[stateCode] || stateCode;
  const listings = await fetchFeedListings({ state: stateCode, limit: 50 });
  const items = listings.map(listingToFeedItem);
  const meta: FeedMeta = {
    title: `REALM Radar Canada — ${stateName}`,
    description: `Agricultural auctions, machinery sales, livestock listings, rural property and market activity in ${stateName}, curated by REALM Radar.`,
    feedUrl: feedUrlFor(`/feeds/state/${stateInput}.${format}`),
    siteUrl: siteUrl(),
  };

  if (format === 'json') {
    return NextResponse.json(buildJsonFeed(meta, items), { status: 200, headers: jsonHeaders() });
  }
  return new NextResponse(buildRss(meta, items), { status: 200, headers: rssHeaders() });
}

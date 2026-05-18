/**
 * Cross-filter feed: province × category. e.g. /feeds/state/alberta/livestock.xml
 */
import { NextResponse } from 'next/server';
import { buildRss, buildJsonFeed, rssHeaders, jsonHeaders, type FeedMeta } from '../../../../../lib/feeds';
import { fetchFeedListings, listingToFeedItem, feedUrlFor, siteUrl } from '../../../../../lib/feed-source';
import { normalizeState, CODE_TO_NAME, SLUG_TO_CODE } from '../../../../../lib/states';

export const revalidate = 600;

const KNOWN_CATEGORIES = new Set([
  'livestock',
  'machinery',
  'vehicles_transport',
  'farm_equipment',
  'land_property',
  'inputs_supplies',
]);

function prettyCategory(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ state: string; category: string }> }
) {
  const { state: stateRaw, category: catRaw } = await params;
  const m = (catRaw || '').match(/^(.+?)\.(xml|json)$/i);
  if (!m) return new NextResponse('Not found', { status: 404 });
  const category = m[1].toLowerCase();
  const format = m[2].toLowerCase();

  if (!KNOWN_CATEGORIES.has(category)) {
    return new NextResponse('Unknown category', { status: 404 });
  }

  const stateInput = (stateRaw || '').toLowerCase();
  let stateCode = SLUG_TO_CODE[stateInput] || null;
  if (!stateCode) stateCode = normalizeState(stateInput.replace(/-/g, ' '));
  if (!stateCode) return new NextResponse('Unknown province', { status: 404 });

  const stateName = CODE_TO_NAME[stateCode] || stateCode;
  const listings = await fetchFeedListings({ state: stateCode, category, limit: 50 });
  const items = listings.map(listingToFeedItem);
  const meta: FeedMeta = {
    title: `REALM Radar Canada — ${stateName} ${prettyCategory(category)}`,
    description: `${prettyCategory(category)} listings in ${stateName}, curated by REALM Radar.`,
    feedUrl: feedUrlFor(`/feeds/state/${stateInput}/${category}.${format}`),
    siteUrl: siteUrl(),
  };

  if (format === 'json') {
    return NextResponse.json(buildJsonFeed(meta, items), { status: 200, headers: jsonHeaders() });
  }
  return new NextResponse(buildRss(meta, items), { status: 200, headers: rssHeaders() });
}

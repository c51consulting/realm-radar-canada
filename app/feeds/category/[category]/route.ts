import { NextResponse } from 'next/server';
import { buildRss, buildJsonFeed, rssHeaders, jsonHeaders, type FeedMeta } from '../../../../lib/feeds';
import { fetchFeedListings, listingToFeedItem, feedUrlFor, siteUrl } from '../../../../lib/feed-source';

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
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category: rawParam } = await params;
  const raw = rawParam || '';
  // Support both /feeds/category/livestock.xml and /feeds/category/livestock.json
  const m = raw.match(/^(.+?)\.(xml|json)$/i);
  if (!m) {
    return new NextResponse('Not found', { status: 404 });
  }
  const category = m[1].toLowerCase();
  const format = m[2].toLowerCase();

  if (!KNOWN_CATEGORIES.has(category)) {
    return new NextResponse('Unknown category', { status: 404 });
  }

  const listings = await fetchFeedListings({ category, limit: 50 });
  const items = listings.map(listingToFeedItem);
  const meta: FeedMeta = {
    title: `REALM Radar Canada — ${prettyCategory(category)}`,
    description: `${prettyCategory(category)} listings from across the Canada, curated by REALM Radar.`,
    feedUrl: feedUrlFor(`/feeds/category/${category}.${format}`),
    siteUrl: siteUrl(),
  };

  if (format === 'json') {
    return NextResponse.json(buildJsonFeed(meta, items), { status: 200, headers: jsonHeaders() });
  }
  return new NextResponse(buildRss(meta, items), { status: 200, headers: rssHeaders() });
}

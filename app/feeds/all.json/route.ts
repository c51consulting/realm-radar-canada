import { NextResponse } from 'next/server';
import { buildJsonFeed, jsonHeaders, type FeedMeta } from '../../../lib/feeds';
import { fetchFeedListings, listingToFeedItem, feedUrlFor, siteUrl } from '../../../lib/feed-source';

export const revalidate = 600;

export async function GET() {
  const listings = await fetchFeedListings({ limit: 50 });
  const items = listings.map(listingToFeedItem);
  const meta: FeedMeta = {
    title: 'REALM Radar Canada — All listings',
    description:
      'Auction, machinery, livestock, land, and farm equipment listings from across the Canada.',
    feedUrl: feedUrlFor('/feeds/all.json'),
    siteUrl: siteUrl(),
  };
  const payload = buildJsonFeed(meta, items);
  return NextResponse.json(payload, { status: 200, headers: jsonHeaders() });
}

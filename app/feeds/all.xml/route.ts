import { NextResponse } from 'next/server';
import { buildRss, rssHeaders, type FeedMeta } from '../../../lib/feeds';
import { fetchFeedListings, listingToFeedItem, feedUrlFor, siteUrl } from '../../../lib/feed-source';

export const revalidate = 600; // ISR — refresh feed every 10 minutes

export async function GET() {
  const listings = await fetchFeedListings({ limit: 50 });
  const items = listings.map(listingToFeedItem);
  const meta: FeedMeta = {
    title: 'REALM Radar Canada — All listings',
    description:
      'Auction, machinery, livestock, land, and farm equipment listings from across the Canada, curated by REALM Radar.',
    feedUrl: feedUrlFor('/feeds/all.xml'),
    siteUrl: siteUrl(),
  };
  const xml = buildRss(meta, items);
  return new NextResponse(xml, { status: 200, headers: rssHeaders() });
}

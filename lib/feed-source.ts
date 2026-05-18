/**
 * USA-specific feed source: turns a filtered Supabase query into FeedItem[].
 * Keep this thin — all formatting/serialization lives in lib/feeds.ts.
 */
import { supabasePublic } from './supabase';
import type { Listing } from './types';
import type { FeedItem } from './feeds';
import { listingPath } from './listing-slug';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://realm-radar-canada.vercel.app';

export type FeedFilter = {
  state?: string;
  category?: string;
  region?: string;
  limit?: number;
};

/**
 * Fetch published, unexpired listings for syndication.
 * Order is newest-first by published_at (firehose semantics for feed readers).
 */
export async function fetchFeedListings(f: FeedFilter = {}): Promise<Listing[]> {
  const today = new Date().toISOString().slice(0, 10);
  let q = supabasePublic
    .from('listings')
    .select('*')
    .eq('status', 'published')
    .or(`expiry_date.is.null,expiry_date.gt.${today}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(Math.min(f.limit || 50, 100));

  if (f.state) q = q.eq('state', f.state.toUpperCase());
  if (f.category) q = q.eq('category', f.category.toLowerCase());
  if (f.region) q = q.eq('region', f.region.toLowerCase());

  const { data, error } = await q;
  if (error) {
    console.error('[fetchFeedListings]', error);
    return [];
  }
  return (data as Listing[]) || [];
}

/** Convert a Listing into a normalized FeedItem (canonical/link rules applied). */
export function listingToFeedItem(l: Listing): FeedItem {
  // Public URL on the radar = the per-listing detail page (we control attribution there).
  const detailUrl = `${SITE_URL}${listingPath(l)}`;
  return {
    id: l.id,
    title: l.clean_title || l.raw_title,
    summary: l.summary || l.raw_snippet || '',
    link: detailUrl,
    source_name: l.source_name,
    source_url: l.canonical_url || l.source_url,
    published_at: l.published_at,
    expires_at: l.expiry_date,
    category: l.category,
    state_or_region: l.state || l.region,
    country: 'Canada',
    price_text: l.price_text,
  };
}

export function feedUrlFor(path: string): string {
  return `${SITE_URL}${path}`;
}

export function siteUrl(): string {
  return SITE_URL;
}

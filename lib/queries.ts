import { supabasePublic } from './supabase';
import type { Listing } from './types';

/**
 * Resolve a listing by its short id (first 8 hex chars of UUID, no dashes).
 * Falls back to full UUID match if provided. Returns the first published match.
 */
export async function getListingByShortId(shortId: string): Promise<Listing | null> {
  if (!shortId) return null;
  const clean = shortId.toLowerCase().replace(/[^a-f0-9]/g, '');
  if (clean.length < 8) return null;
  // Postgres `uuid` type doesn't support ilike — use a lexical range over the
  // 8-char prefix instead. UUID strings sort lexicographically, so any uuid
  // beginning with `prefix-` is within [prefix-0000…, prefix-ffff…].
  const p = clean.slice(0, 8);
  const lo = `${p}-0000-0000-0000-000000000000`;
  const hi = `${p}-ffff-ffff-ffff-ffffffffffff`;
  const { data, error } = await supabasePublic
    .from('listings')
    .select('*')
    .eq('status', 'published')
    .gte('id', lo)
    .lte('id', hi)
    .limit(1);
  if (error) { console.error('[getListingByShortId]', error); return null; }
  return ((data && data[0]) as Listing) || null;
}

/**
 * Fetch a single published listing by id.
 * Returns null if not found or not published (avoid surfacing unreviewed drafts).
 */
export async function getListingById(id: string): Promise<Listing | null> {
  if (!id || typeof id !== 'string') return null;
  const { data, error } = await supabasePublic
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error) { console.error('[getListingById]', error); return null; }
  return (data as Listing) || null;
}

/**
 * Fetch related published listings (same state, then same category) excluding the current one.
 * Returns up to `limit` items, ordered featured > priority > recency.
 */
export async function getRelatedListings(listing: Listing, limit = 6): Promise<Listing[]> {
  const orParts: string[] = [];
  if (listing.state) orParts.push(`state.eq.${listing.state}`);
  if (listing.category) orParts.push(`category.eq.${listing.category}`);
  let q = supabasePublic
    .from('listings')
    .select('*')
    .eq('status', 'published')
    .neq('id', listing.id)
    .order('featured', { ascending: false })
    .order('priority_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (orParts.length > 0) q = q.or(orParts.join(','));
  const { data, error } = await q;
  if (error) { console.error('[getRelatedListings]', error); return []; }
  return (data as Listing[]) || [];
}

export type ListingFilters = {
  state?: string;
  region?: string;
  category?: string;
  source_type?: string;
  timeframe?: 'today' | 'week' | 'month' | 'upcoming' | 'recent' | string;
  featured?: boolean;
  limit?: number;
  q?: string;
};

export async function getPublishedListings(f: ListingFilters = {}): Promise<Listing[]> {
  // Default ordering: featured first, then priority score, then recency.
  // This surfaces curated top-of-category picks above the general firehose.
  let q = supabasePublic
    .from('listings')
    .select('*')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('priority_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(f.limit || 48);

  if (f.state) q = q.eq('state', f.state);
  if (f.region) q = q.eq('region', f.region);
  if (f.category) q = q.eq('category', f.category);
  if (f.source_type) q = q.eq('source_type', f.source_type);
  if (f.featured) q = q.eq('featured', true);
  if (f.q && f.q.trim()) {
    // Keyword search across title, summary, and source.
    const term = f.q.trim().replace(/[%,]/g, ' ');
    const pattern = `%${term}%`;
    q = q.or(
      [
        `clean_title.ilike.${pattern}`,
        `raw_title.ilike.${pattern}`,
        `summary.ilike.${pattern}`,
        `source_name.ilike.${pattern}`,
      ].join(',')
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  if (f.timeframe === 'today') {
    q = q.eq('sale_date', today);
  } else if (f.timeframe === 'week') {
    const wk = new Date(); wk.setDate(wk.getDate() + 7);
    q = q.gte('sale_date', today).lte('sale_date', wk.toISOString().slice(0, 10));
  } else if (f.timeframe === 'month') {
    const mn = new Date(); mn.setMonth(mn.getMonth() + 1);
    q = q.gte('sale_date', today).lte('sale_date', mn.toISOString().slice(0, 10));
  } else if (f.timeframe === 'upcoming') {
    q = q.gte('sale_date', today);
  } else if (f.timeframe === 'recent') {
    // Override ordering: most recently published first
    q = supabasePublic
      .from('listings')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(f.limit || 48);
    if (f.state) q = q.eq('state', f.state);
    if (f.region) q = q.eq('region', f.region);
    if (f.category) q = q.eq('category', f.category);
    if (f.source_type) q = q.eq('source_type', f.source_type);
    if (f.featured) q = q.eq('featured', true);
    if (f.q && f.q.trim()) {
      const term = f.q.trim().replace(/[%,]/g, ' ');
      const pattern = `%${term}%`;
      q = q.or(
        [
          `clean_title.ilike.${pattern}`,
          `raw_title.ilike.${pattern}`,
          `summary.ilike.${pattern}`,
          `source_name.ilike.${pattern}`,
        ].join(',')
      );
    }
  }

  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return (data || []) as Listing[];
}

export async function getFeaturedListings(limit = 6): Promise<Listing[]> {
  return getPublishedListings({ featured: true, limit });
}

/**
 * Count of published listings added in the last 7 days.
 * Used by the hero "X new this week" chip.
 */
export async function getNewThisWeekCount(): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabasePublic
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', since);
  if (error) { console.error('[getNewThisWeekCount]', error); return 0; }
  return count || 0;
}

/**
 * USA-3: Live state coverage counts. Returns a map of state -> published count.
 * Only states with >=1 published listing are included.
 */
export async function getStateCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabasePublic
    .from('listings')
    .select('state')
    .eq('status', 'published')
    .not('state', 'is', null);
  if (error) { console.error('[getStateCounts]', error); return {}; }
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const s = (row as { state: string | null }).state;
    if (!s) continue;
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

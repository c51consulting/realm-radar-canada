import type { Listing } from './types';

/**
 * Build a SEO-friendly slug for a listing detail URL.
 * Format: `<short-id>-<kebab-title>`
 *
 * - Short id is the first 8 chars of the listing UUID (collision-safe enough
 *   for routing while keeping the URL short).
 * - Title is kebab-cased and truncated to 60 chars on word boundaries.
 *
 * Example: `ab12cd34-mahindra-575-tractor-sale-tamil-nadu`
 *
 * To resolve a slug back to an id we DON'T do a string lookup — the slug page
 * accepts any slug starting with the same 8 chars and fetches by full id. The
 * router accepts a list of candidate ids by re-attaching from a server-side
 * lookup. See `parseListingSlug` below.
 */
export function buildListingSlug(listing: Pick<Listing, 'id' | 'clean_title' | 'raw_title'>): string {
  const title = (listing.clean_title || listing.raw_title || '').trim();
  const kebab = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-[^-]*$/, (m) => (m.length > 1 ? m : '')); // trim mid-word
  const shortId = listing.id.replace(/-/g, '').slice(0, 8);
  return kebab ? `${shortId}-${kebab}` : shortId;
}

/**
 * Parse a slug back into a short id (first 8 chars of UUID, no dashes).
 * The detail page uses this to resolve the full UUID via a prefix query.
 */
export function parseListingSlug(slug: string): string | null {
  if (!slug || typeof slug !== 'string') return null;
  const head = slug.split('-')[0];
  if (!/^[a-f0-9]{8}$/i.test(head)) return null;
  return head.toLowerCase();
}

/** Build the full path `/radar/listing/<slug>`. */
export function listingPath(listing: Pick<Listing, 'id' | 'clean_title' | 'raw_title'>): string {
  return `/radar/listing/${buildListingSlug(listing)}`;
}

/**
 * SEO landing page taxonomy + helpers.
 *
 * - Clean URLs are canonical: /radar/equipment, /radar/land, /radar/auctions, /radar/livestock
 * - DB slugs (machinery, land_property, etc.) redirect 301 → clean URLs via middleware
 * - State slugs use full state names (texas, wisconsin, iowa, nebraska)
 * - State codes (TX, WI, IA, NE) and aliases redirect to full names
 */
import { supabasePublic } from './supabase';
import type { ListingFilters } from './queries';
import {
  CATEGORY_SLUGS,
  STATE_SLUGS,
  STATE_SLUG_TO_CODE,
  STATE_SLUG_TO_LABEL,
  CATEGORY_SLUG_TO_LABEL,
  SLUG_REDIRECTS,
  isCategorySlug,
  isStateSlug,
  type CategorySlug,
  type StateSlug,
} from './seo-constants';

// Re-export edge-safe constants for backwards compatibility.
export {
  CATEGORY_SLUGS,
  STATE_SLUGS,
  STATE_SLUG_TO_CODE,
  STATE_SLUG_TO_LABEL,
  CATEGORY_SLUG_TO_LABEL,
  SLUG_REDIRECTS,
  isCategorySlug,
  isStateSlug,
  type CategorySlug,
  type StateSlug,
};

export type PageType = 'category' | 'state' | 'combo';

export function resolvePageType(slug: string, second?: string): PageType | null {
  if (second) {
    if (isStateSlug(slug) && isCategorySlug(second)) return 'combo';
    return null;
  }
  if (isCategorySlug(slug)) return 'category';
  if (isStateSlug(slug)) return 'state';
  return null;
}

// ----- Filter resolvers -----
// Convert clean slug → DB filter parameters for getPublishedListings()

export function filtersForCategory(slug: CategorySlug): Partial<ListingFilters> {
  switch (slug) {
    case 'equipment':
      // Equipment spans machinery, farm_equipment, vehicles_transport.
      // Queries.ts only supports single category. We pass a multi-category marker
      // and use getListingsForSeoPage() to handle the OR.
      return { categoryAny: ['machinery', 'farm_equipment', 'vehicles_transport'] } as any;
    case 'livestock':
      return { category: 'livestock' };
    case 'land':
      return { category: 'land_property' };
    case 'auctions':
      return { source_type: 'public_auction' };
  }
}

export function filtersForState(slug: StateSlug): Partial<ListingFilters> {
  return { state: STATE_SLUG_TO_CODE[slug] };
}

export function filtersForCombo(state: StateSlug, cat: CategorySlug): Partial<ListingFilters> {
  return { ...filtersForState(state), ...filtersForCategory(cat) };
}

// ----- Combined fetcher that supports multi-category, sort, and timeframe -----

export type SortMode = 'featured' | 'ending_soon' | 'newest' | 'priority' | '';

export async function getListingsForSeoPage(
  filters: Partial<ListingFilters> & { categoryAny?: string[]; timeframe?: string; sort?: SortMode },
  limit = 48
) {
  const { categoryAny, timeframe, sort, ...rest } = filters as any;

  let q = supabasePublic
    .from('listings')
    .select('*')
    .eq('status', 'published')
    .limit(limit);

  // Apply ordering based on sort mode
  if (sort === 'ending_soon') {
    // USA-4: "Ending soon" as default — sort by sale_date asc (nulls last)
    // then by priority. Do NOT exclude null sale_dates because many listings
    // have details on the source page but no parsed sale date.
    q = q
      .order('sale_date', { ascending: true, nullsFirst: false })
      .order('priority_score', { ascending: false, nullsFirst: false });
  } else if (sort === 'newest') {
    q = q.order('published_at', { ascending: false, nullsFirst: false });
  } else if (sort === 'priority') {
    q = q.order('priority_score', { ascending: false, nullsFirst: false });
  } else {
    // Default: featured first, then priority, then recency
    q = q
      .order('featured', { ascending: false })
      .order('priority_score', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false });
  }

  if (rest.state) q = q.eq('state', rest.state);
  if (rest.region) q = q.eq('region', rest.region);
  if (rest.category) q = q.eq('category', rest.category);
  if (rest.source_type) q = q.eq('source_type', rest.source_type);
  if (rest.featured) q = q.eq('featured', true);
  if (categoryAny && categoryAny.length > 0) q = q.in('category', categoryAny);
  if (rest.q && String(rest.q).trim()) {
    const term = String(rest.q).trim().replace(/[%,]/g, ' ');
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

  // Timeframe filter (overlay on sort)
  const today = new Date().toISOString().slice(0, 10);
  if (timeframe === 'today') q = q.eq('sale_date', today);
  else if (timeframe === 'week') {
    const wk = new Date(); wk.setDate(wk.getDate() + 7);
    q = q.gte('sale_date', today).lte('sale_date', wk.toISOString().slice(0, 10));
  } else if (timeframe === 'month') {
    const mn = new Date(); mn.setMonth(mn.getMonth() + 1);
    q = q.gte('sale_date', today).lte('sale_date', mn.toISOString().slice(0, 10));
  } else if (timeframe === 'upcoming') {
    q = q.gte('sale_date', today);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[seo] listings query error:', error);
    return [] as any[];
  }
  return data || [];
}

// ----- seo_blocks fetcher -----

export type SeoBlock = {
  slug: string;
  page_type: 'category' | 'state' | 'combo';
  category_filter: string[] | null;
  source_type_filter: string[] | null;
  state_filter: string[] | null;
  h1: string;
  subtitle: string | null;
  meta_title: string | null;
  meta_description: string | null;
  intro_md: string | null;
  related_slugs: string[] | null;
  display_order: number | null;
};

export async function getSeoBlock(slug: string): Promise<SeoBlock | null> {
  const { data, error } = await supabasePublic
    .from('seo_blocks')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('[seo] block fetch error:', error);
    return null;
  }
  return data as SeoBlock | null;
}

// Generate a default block for a page if seo_blocks row is missing.
// Ensures pages always render even before seed runs.
export function defaultSeoBlock(
  pageType: PageType,
  parts: { state?: StateSlug; category?: CategorySlug }
): SeoBlock {
  const stateLabel = parts.state ? STATE_SLUG_TO_LABEL[parts.state] : null;
  const catLabel = parts.category ? CATEGORY_SLUG_TO_LABEL[parts.category] : null;

  let slug = '';
  let h1 = '';
  let subtitle = '';

  if (pageType === 'category' && catLabel) {
    slug = parts.category!;
    h1 = `${catLabel} — REALM Radar Canada`;
    subtitle = `Curated ${catLabel.toLowerCase()} auctions, sales and listings across the US ag market.`;
  } else if (pageType === 'state' && stateLabel) {
    slug = parts.state!;
    h1 = `${stateLabel} Ag Market Radar`;
    subtitle = `Auctions, machinery, livestock and rural property activity tracked across ${stateLabel}.`;
  } else if (pageType === 'combo' && stateLabel && catLabel) {
    slug = `${parts.state}/${parts.category}`;
    h1 = `${stateLabel} ${catLabel} — REALM Radar`;
    subtitle = `Curated ${catLabel.toLowerCase()} activity across ${stateLabel}, refreshed daily.`;
  }

  return {
    slug,
    page_type: pageType,
    category_filter: null,
    source_type_filter: null,
    state_filter: null,
    h1,
    subtitle,
    meta_title: `${h1} | REALM Radar`,
    meta_description: subtitle,
    intro_md: null,
    related_slugs: null,
    display_order: null,
  };
}

// ----- Related links helper -----

export function defaultRelatedSlugs(
  pageType: PageType,
  parts: { state?: StateSlug; category?: CategorySlug }
): string[] {
  if (pageType === 'category') {
    // Show all states for that category as combos, plus other categories
    const combos = STATE_SLUGS.map((s) => `${s}/${parts.category}`);
    const otherCats = CATEGORY_SLUGS.filter((c) => c !== parts.category);
    return [...combos, ...otherCats].slice(0, 6);
  }
  if (pageType === 'state') {
    // Show all categories for that state, plus other states
    const combos = CATEGORY_SLUGS.map((c) => `${parts.state}/${c}`);
    const otherStates = STATE_SLUGS.filter((s) => s !== parts.state);
    return [...combos, ...otherStates].slice(0, 6);
  }
  if (pageType === 'combo') {
    // Show same category in other states, plus parent state + parent category
    const otherStateCombos = STATE_SLUGS.filter((s) => s !== parts.state).map(
      (s) => `${s}/${parts.category}`
    );
    return [parts.state!, parts.category!, ...otherStateCombos].slice(0, 6);
  }
  return [];
}

// Resolve a related slug to a human label + URL for the RelatedLinks block.
export function describeSlug(slug: string): { url: string; label: string; sub: string } {
  if (slug.includes('/')) {
    const [s, c] = slug.split('/');
    if (isStateSlug(s) && isCategorySlug(c)) {
      return {
        url: `/radar/${s}/${c}`,
        label: `${STATE_SLUG_TO_LABEL[s]} ${CATEGORY_SLUG_TO_LABEL[c]}`,
        sub: `${CATEGORY_SLUG_TO_LABEL[c]} in ${STATE_SLUG_TO_LABEL[s]}`,
      };
    }
  }
  if (isCategorySlug(slug)) {
    return {
      url: `/radar/${slug}`,
      label: `${CATEGORY_SLUG_TO_LABEL[slug]} — Canada`,
      sub: `All ${CATEGORY_SLUG_TO_LABEL[slug].toLowerCase()} across the US`,
    };
  }
  if (isStateSlug(slug)) {
    return {
      url: `/radar/${slug}`,
      label: `${STATE_SLUG_TO_LABEL[slug]} Radar`,
      sub: `All activity across ${STATE_SLUG_TO_LABEL[slug]}`,
    };
  }
  return { url: `/radar/${slug}`, label: slug, sub: '' };
}

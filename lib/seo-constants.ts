/**
 * Edge-runtime-safe SEO constants.
 * No supabase/Node dependencies. Imported by middleware.ts.
 */

export const CATEGORY_SLUGS = ['equipment', 'livestock', 'land', 'auctions'] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const STATE_SLUGS = ['texas', 'wisconsin', 'iowa', 'nebraska'] as const;
export type StateSlug = (typeof STATE_SLUGS)[number];

export const SLUG_REDIRECTS: Record<string, string> = {
  // category redirects
  machinery: 'equipment',
  farm_equipment: 'equipment',
  vehicles_transport: 'equipment',
  land_property: 'land',
  // state code redirects (uppercase + lowercase)
  TX: 'texas',
  tx: 'texas',
  WI: 'wisconsin',
  wi: 'wisconsin',
  IA: 'iowa',
  ia: 'iowa',
  NE: 'nebraska',
  ne: 'nebraska',
};

export const STATE_SLUG_TO_CODE: Record<StateSlug, string> = {
  texas: 'TX',
  wisconsin: 'WI',
  iowa: 'IA',
  nebraska: 'NE',
};

export const STATE_SLUG_TO_LABEL: Record<StateSlug, string> = {
  texas: 'Texas',
  wisconsin: 'Wisconsin',
  iowa: 'Iowa',
  nebraska: 'Nebraska',
};

export const CATEGORY_SLUG_TO_LABEL: Record<CategorySlug, string> = {
  equipment: 'Equipment',
  livestock: 'Livestock',
  land: 'Land & Property',
  auctions: 'Auctions',
};

export function isCategorySlug(s: string): s is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(s);
}

export function isStateSlug(s: string): s is StateSlug {
  return (STATE_SLUGS as readonly string[]).includes(s);
}

/**
 * Edge-runtime-safe SEO constants.
 * No supabase/Node dependencies. Imported by middleware.ts.
 */

export const CATEGORY_SLUGS = ['equipment', 'livestock', 'land', 'auctions'] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

// Phase-1 Canadian provinces for SEO landing pages. Start with the four biggest
// ag provinces by farm-receipt value: Ontario, Saskatchewan, Alberta, Quebec.
export const STATE_SLUGS = ['ontario', 'saskatchewan', 'alberta', 'quebec'] as const;
export type StateSlug = (typeof STATE_SLUGS)[number];

export const SLUG_REDIRECTS: Record<string, string> = {
  // category redirects
  machinery: 'equipment',
  farm_equipment: 'equipment',
  vehicles_transport: 'equipment',
  land_property: 'land',
  // province code redirects (uppercase + lowercase)
  ON: 'ontario',
  on: 'ontario',
  SK: 'saskatchewan',
  sk: 'saskatchewan',
  AB: 'alberta',
  ab: 'alberta',
  QC: 'quebec',
  qc: 'quebec',
};

export const STATE_SLUG_TO_CODE: Record<StateSlug, string> = {
  ontario: 'ON',
  saskatchewan: 'SK',
  alberta: 'AB',
  quebec: 'QC',
};

export const STATE_SLUG_TO_LABEL: Record<StateSlug, string> = {
  ontario: 'Ontario',
  saskatchewan: 'Saskatchewan',
  alberta: 'Alberta',
  quebec: 'Quebec',
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

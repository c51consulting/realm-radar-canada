/**
 * Catch-all SEO landing page route.
 * Handles:
 *   /radar/[category]          → e.g. /radar/equipment, /radar/livestock, /radar/land, /radar/auctions
 *   /radar/[state]             → e.g. /radar/texas, /radar/wisconsin, /radar/iowa, /radar/nebraska
 *   /radar/[state]/[category]  → e.g. /radar/texas/equipment, /radar/nebraska/auctions
 *
 * DB-slug variants (machinery, land_property, TX, WI, etc.) are 301-redirected
 * to clean slugs by middleware.ts before this handler runs.
 *
 * Static sibling routes (about, submit, subscribe, affiliate, confirm) take
 * precedence over this catch-all.
 */
import { notFound } from 'next/navigation';
import { LandingPage } from '@/components/LandingPage';
import {
  CATEGORY_SLUGS,
  STATE_SLUGS,
  isCategorySlug,
  isStateSlug,
  filtersForCategory,
  filtersForState,
  filtersForCombo,
  getSeoBlock,
  defaultSeoBlock,
  defaultRelatedSlugs,
  getListingsForSeoPage,
  resolvePageType,
  type SeoBlock,
  type StateSlug,
  type CategorySlug,
} from '@/lib/seo';

export const revalidate = 600;

// Phase 1 combos enumerated explicitly to control which combos are pre-rendered.
const PHASE_1_COMBOS: Array<[StateSlug, CategorySlug]> = [
  ['texas', 'equipment'],
  ['wisconsin', 'livestock'],
  ['iowa', 'land'],
  ['nebraska', 'auctions'],
];

export async function generateStaticParams() {
  const singles = [
    ...CATEGORY_SLUGS.map((slug) => ({ slug: [slug] })),
    ...STATE_SLUGS.map((slug) => ({ slug: [slug] })),
  ];
  const combos = PHASE_1_COMBOS.map(([s, c]) => ({ slug: [s, c] }));
  return [...singles, ...combos];
}

type Params = { slug: string[] };
type Search = {
  region?: string;
  source_type?: string;
  timeframe?: string;
  sort?: string;
  q?: string;
  // state/category may be supplied as refinements when NOT locked by the path
  state?: string;
  category?: string;
};

function resolveFromParams(parts: string[]):
  | { type: 'category'; category: CategorySlug; slugKey: string }
  | { type: 'state'; state: StateSlug; slugKey: string }
  | { type: 'combo'; state: StateSlug; category: CategorySlug; slugKey: string }
  | null
{
  if (parts.length === 1) {
    const s = parts[0];
    if (isCategorySlug(s)) return { type: 'category', category: s, slugKey: s };
    if (isStateSlug(s)) return { type: 'state', state: s, slugKey: s };
    return null;
  }
  if (parts.length === 2) {
    const [s, c] = parts;
    if (isStateSlug(s) && isCategorySlug(c)) {
      return { type: 'combo', state: s, category: c, slugKey: `${s}/${c}` };
    }
    return null;
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const resolved = resolveFromParams(slug || []);
  if (!resolved) return { title: 'REALM Radar' };

  const block = await getSeoBlock(resolved.slugKey);
  const fallback = defaultSeoBlock(resolved.type, {
    state: 'state' in resolved ? resolved.state : undefined,
    category: 'category' in resolved ? resolved.category : undefined,
  } as any);
  const meta = block ?? fallback;
  return {
    title: meta.meta_title || `${meta.h1} | REALM Radar`,
    description: meta.meta_description || meta.subtitle || undefined,
    alternates: { canonical: `/radar/${resolved.slugKey}` },
    openGraph: {
      title: meta.meta_title || meta.h1,
      description: meta.meta_description || meta.subtitle || undefined,
      type: 'website',
    },
  };
}

export default async function RadarLandingPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const resolved = resolveFromParams(slug || []);
  if (!resolved) notFound();

  // Build filters: start from page-locked filters, layer URL refinements on top.
  // Locked filters cannot be overridden — refinements only add (region, source, timeframe, sort).
  let filters: any;
  if (resolved.type === 'category') filters = filtersForCategory(resolved.category);
  else if (resolved.type === 'state') filters = filtersForState(resolved.state);
  else filters = filtersForCombo(resolved.state, resolved.category);

  // Layer refinements
  if (sp.region) filters.region = sp.region;
  if (sp.source_type && !filters.source_type) filters.source_type = sp.source_type;
  if (sp.timeframe) filters.timeframe = sp.timeframe;
  if (sp.sort) filters.sort = sp.sort;
  if (sp.q) filters.q = sp.q;

  // Fetch SEO block (DB-backed) with fallback
  const dbBlock = await getSeoBlock(resolved.slugKey);
  const block: SeoBlock = dbBlock ?? defaultSeoBlock(resolved.type, {
    state: 'state' in resolved ? resolved.state : undefined,
    category: 'category' in resolved ? resolved.category : undefined,
  } as any);

  // Fetch listings + featured subset
  const listings = await getListingsForSeoPage(filters, 48);
  const featured = listings.filter((l: any) => l.featured).slice(0, 3);
  const featuredOrTop = featured.length > 0 ? featured : listings.slice(0, 3);

  // Resolve related slugs
  const relatedSlugs = (block.related_slugs && block.related_slugs.length > 0)
    ? block.related_slugs
    : defaultRelatedSlugs(resolved.type, {
        state: 'state' in resolved ? resolved.state : undefined,
        category: 'category' in resolved ? resolved.category : undefined,
      } as any);

  return (
    <LandingPage
      block={block}
      listings={listings as any}
      featured={featuredOrTop as any}
      relatedSlugs={relatedSlugs}
    />
  );
}

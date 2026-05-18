/**
 * One-shot script: generate AI copy for the 12 SEO landing pages and upsert
 * into seo_blocks. Uses GPT-4o-mini for cost efficiency.
 *
 * Run: npx tsx scripts/seed-seo-copy.ts
 *
 * Required env: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { supabaseAdmin } from '../lib/supabase';
import OpenAI from 'openai';
import {
  CATEGORY_SLUGS,
  STATE_SLUGS,
  STATE_SLUG_TO_LABEL,
  CATEGORY_SLUG_TO_LABEL,
  defaultRelatedSlugs,
  type CategorySlug,
  type StateSlug,
} from '../lib/seo';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type PageSpec = {
  slug: string;
  page_type: 'category' | 'state' | 'combo';
  state?: StateSlug;
  category?: CategorySlug;
  state_label?: string;
  category_label?: string;
};

const PAGES: PageSpec[] = [
  // 4 category pages
  ...CATEGORY_SLUGS.map((c) => ({
    slug: c,
    page_type: 'category' as const,
    category: c,
    category_label: CATEGORY_SLUG_TO_LABEL[c],
  })),
  // 4 state pages
  ...STATE_SLUGS.map((s) => ({
    slug: s,
    page_type: 'state' as const,
    state: s,
    state_label: STATE_SLUG_TO_LABEL[s],
  })),
  // 4 combo pages
  ...([
    ['texas', 'equipment'],
    ['wisconsin', 'livestock'],
    ['iowa', 'land'],
    ['nebraska', 'auctions'],
  ] as Array<[StateSlug, CategorySlug]>).map(([s, c]) => ({
    slug: `${s}/${c}`,
    page_type: 'combo' as const,
    state: s,
    category: c,
    state_label: STATE_SLUG_TO_LABEL[s],
    category_label: CATEGORY_SLUG_TO_LABEL[c],
  })),
];

const SYSTEM = `You are an SEO copywriter for REALM Radar — a curation layer that tracks US agricultural auctions, machinery sales, livestock, rural property and market activity from public sources.

Brand voice: practical, plain-spoken, no hype, no buzzwords. The audience is US farmers, ranchers, ag dealers, auctioneers, lenders, and investors.

Ethics: REALM Radar links out to original sources. It does NOT republish full listings, steal images, or pretend third-party listings are REALM's. Copy must NEVER claim REALM owns or runs the underlying sales.

Output JSON only. No markdown fences.`;

function userPrompt(p: PageSpec) {
  let context = '';
  if (p.page_type === 'category') {
    context = `Page type: CATEGORY landing page for "${p.category_label}" across the entire USA. This page aggregates auctions and sales in this category from multiple states.`;
  } else if (p.page_type === 'state') {
    context = `Page type: STATE landing page for "${p.state_label}". This page aggregates all ag market activity (auctions, machinery, livestock, land) tracked within ${p.state_label}.`;
  } else {
    context = `Page type: COMBO landing page for "${p.category_label}" specifically in "${p.state_label}". Most targeted — focuses on ${p.category_label!.toLowerCase()} activity inside ${p.state_label}.`;
  }

  return `${context}

Generate the following SEO copy fields as JSON:

{
  "h1": "Main page heading — 4 to 9 words, includes the location/category naturally, no colons",
  "subtitle": "Single descriptive sentence below the H1 — 15 to 25 words, tells the reader what they'll find here",
  "meta_title": "SEO <title> — 50 to 60 chars, includes 'REALM Radar' brand",
  "meta_description": "SEO meta description — 140 to 155 chars, action-oriented, mentions curated/tracked from public sources",
  "intro_md": "Two short paragraphs of body copy, 60 to 100 words total. Markdown OK (**bold**, _italic_, paragraphs). Mention 1-2 specific use cases for the audience (e.g. 'planning fall equipment upgrades', 'tracking cattle price discovery'). End with a soft pointer to the listings below. NO claims that REALM owns the sales."
}

Only output the JSON object. No preamble. No code fences.`;
}

async function generateOne(p: PageSpec) {
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt(p) },
    ],
  });
  const text = res.choices[0].message.content || '{}';
  return JSON.parse(text);
}

function buildFilters(p: PageSpec) {
  const category_filter: string[] = [];
  const source_type_filter: string[] = [];
  const state_filter: string[] = [];

  if (p.category === 'equipment') category_filter.push('machinery', 'farm_equipment', 'vehicles_transport');
  else if (p.category === 'livestock') category_filter.push('livestock');
  else if (p.category === 'land') category_filter.push('land_property');
  else if (p.category === 'auctions') source_type_filter.push('public_auction');

  if (p.state === 'texas') state_filter.push('TX');
  else if (p.state === 'wisconsin') state_filter.push('WI');
  else if (p.state === 'iowa') state_filter.push('IA');
  else if (p.state === 'nebraska') state_filter.push('NE');

  return {
    category_filter: category_filter.length ? category_filter : null,
    source_type_filter: source_type_filter.length ? source_type_filter : null,
    state_filter: state_filter.length ? state_filter : null,
  };
}

async function main() {
  const sb = supabaseAdmin();
  console.log(`[seed-seo] Generating copy for ${PAGES.length} pages...`);

  for (const [i, p] of PAGES.entries()) {
    console.log(`[${i + 1}/${PAGES.length}] ${p.slug} (${p.page_type})`);
    try {
      const copy = await generateOne(p);
      const filters = buildFilters(p);
      const related = defaultRelatedSlugs(p.page_type, { state: p.state, category: p.category });

      const row = {
        slug: p.slug,
        page_type: p.page_type,
        ...filters,
        h1: copy.h1,
        subtitle: copy.subtitle,
        meta_title: copy.meta_title,
        meta_description: copy.meta_description,
        intro_md: copy.intro_md,
        related_slugs: related,
        display_order: i,
      };

      const { error } = await sb.from('seo_blocks').upsert(row, { onConflict: 'slug' });
      if (error) {
        console.error(`  ✗ upsert error:`, error.message);
      } else {
        console.log(`  ✓ "${copy.h1}"`);
      }
    } catch (err: any) {
      console.error(`  ✗ generation error:`, err.message);
    }
  }

  console.log('[seed-seo] Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

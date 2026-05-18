/** Insert a handful of demo listings so the UI is non-empty before live data flows. */
import { supabaseAdmin } from '../lib/supabase';
import { canonicalizeUrl, buildFingerprint } from '../lib/dedup';

const demo = [
  {
    raw_title: 'Late-Model Hay Equipment Auction — Central Wisconsin',
    source_url: 'https://example-auction.com/wi-hay-2026-06-12',
    source_name: 'Central Wisconsin Auctioneers',
    state: 'WI', category: 'machinery', subcategory: 'hay_equipment',
    sale_date: '2026-06-12',
    realm_take: 'Worth watching for mixed farming operators planning hay and forage upgrades ahead of seasonal demand.',
    priority_score: 84, confidence_score: 90, featured: true,
  },
  {
    raw_title: 'Cattle Auction — South Texas Yards',
    source_url: 'https://example-yards.tx/cattle-2026-05-22',
    source_name: 'South Texas Yards',
    state: 'TX', category: 'livestock', subcategory: 'cattle',
    sale_date: '2026-05-22',
    realm_take: 'Strong run expected; useful price-discovery signal for South Plains producers.',
    priority_score: 78, confidence_score: 82,
  },
  {
    raw_title: 'Rural Land Auction — 320 Acres, Buffalo County, NE',
    source_url: 'https://example-land.ne/buffalo-320ac',
    source_name: 'Nebraska Land Co',
    state: 'NE', category: 'land_property', subcategory: 'cropland',
    sale_date: '2026-06-01',
    realm_take: 'Mid-size cropland parcel — relevant for expansion buyers and investors tracking Plains land values.',
    priority_score: 81, confidence_score: 85,
  },
];

async function main() {
  const sb = supabaseAdmin();
  for (const d of demo) {
    const canonical = canonicalizeUrl(d.source_url);
    const fp = buildFingerprint(d.raw_title, d.state, d.sale_date);
    const { error } = await sb.from('listings').upsert({
      ...d,
      clean_title: d.raw_title,
      source_type: 'public_auction',
      canonical_url: canonical,
      content_fingerprint: fp,
      summary: d.realm_take,
      status: 'published',
      published_at: new Date().toISOString(),
      primary_cta: 'view_source',
      secondary_cta: 'explore_realm360',
    }, { onConflict: 'canonical_url' });
    if (error) console.error(d.raw_title, error.message);
    else console.log('seeded:', d.raw_title);
  }
}
main().then(() => process.exit(0));

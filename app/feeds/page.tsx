import Link from 'next/link';
import type { Metadata } from 'next';
import { supabasePublic } from '../../lib/supabase';

export const metadata: Metadata = {
  title: 'Feeds — REALM Radar Canada',
  description:
    'Subscribe to REALM Radar Canada via RSS or JSON Feed. Stream ag opportunities into your reader, newsletter, or partner site.',
};

export const revalidate = 3600;

async function getCategoryCounts() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabasePublic
    .from('listings')
    .select('category')
    .eq('status', 'published')
    .or(`expiry_date.is.null,expiry_date.gt.${today}`);
  const counts: Record<string, number> = {};
  for (const r of (data || []) as { category: string | null }[]) {
    if (!r.category) continue;
    counts[r.category] = (counts[r.category] || 0) + 1;
  }
  return counts;
}

async function getStateCounts() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabasePublic
    .from('listings')
    .select('state')
    .eq('status', 'published')
    .or(`expiry_date.is.null,expiry_date.gt.${today}`);
  const counts: Record<string, number> = {};
  for (const r of (data || []) as { state: string | null }[]) {
    if (!r.state) continue;
    counts[r.state] = (counts[r.state] || 0) + 1;
  }
  return counts;
}

const STATE_NAMES: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', SK: 'Saskatchewan', MB: 'Manitoba',
  ON: 'Ontario', QC: 'Quebec', NS: 'Nova Scotia', NB: 'New Brunswick',
  PE: 'Prince Edward Island', NL: 'Newfoundland and Labrador',
  YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut',
};

function prettyCategory(c: string) {
  return c.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

function FeedLink({ path, label, count }: { path: string; label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 hover:border-emerald-400 hover:bg-emerald-50/40 transition">
      <div className="min-w-0">
        <div className="font-medium text-stone-900 truncate">{label}</div>
        <div className="text-xs text-stone-500 truncate">{path}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {typeof count === 'number' && (
          <span className="text-xs text-stone-500">{count}</span>
        )}
        <Link
          href={path}
          className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
        >
          RSS
        </Link>
        <Link
          href={path.replace(/\.xml$/, '.json')}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          JSON
        </Link>
      </div>
    </div>
  );
}

export default async function FeedsIndexPage() {
  const [catCounts, stateCounts] = await Promise.all([getCategoryCounts(), getStateCounts()]);
  const categories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const states = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">REALM Radar feeds</h1>
        <p className="mt-2 text-stone-600">
          Subscribe in any RSS reader, embed in newsletters, or ingest the JSON feed into your partner site.
          Feeds are link-only, attributed, and auto-expire when listings close.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          Refresh interval: every 10 minutes ·{' '}
          <Link href="/partners/feeds" className="text-emerald-700 underline">
            Partner documentation
          </Link>
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Master feed</h2>
        <FeedLink path="/feeds/all.xml" label="All Canada listings" />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">By category</h2>
        <div className="grid gap-2">
          {categories.map(([cat, count]) => (
            <FeedLink
              key={cat}
              path={`/feeds/category/${cat}.xml`}
              label={prettyCategory(cat)}
              count={count}
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">By province / territory</h2>
        <div className="grid gap-2">
          {states.map(([code, count]) => (
            <FeedLink
              key={code}
              path={`/feeds/state/${(STATE_NAMES[code] || code).toLowerCase().replace(/ /g, '-')}.xml`}
              label={STATE_NAMES[code] || code}
              count={count}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <p className="font-medium text-stone-900">Attribution required</p>
        <p className="mt-1">
          If you republish, link back to the original source URL on each item and credit
          &ldquo;via REALM Radar.&rdquo; Feeds are link-only — full descriptions stay on the source site.
        </p>
      </section>
    </main>
  );
}

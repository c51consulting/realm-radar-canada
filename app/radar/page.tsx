import { Suspense } from 'react';
import { getPublishedListings, getFeaturedListings, getNewThisWeekCount, getStateCounts } from '@/lib/queries';
import { getListingsForSeoPage } from '@/lib/seo';
import { RadarCard } from '@/components/RadarCard';
import { FilterBar } from '@/components/FilterBar';
import { RadarHero } from '@/components/RadarHero';
import { RadarViewToggle } from '@/components/RadarViewToggle';
import { RadarMap } from '@/components/RadarMap';
import { StatesCovered } from '@/components/StatesCovered';
import 'leaflet/dist/leaflet.css';

export const revalidate = 600; // ISR every 10 min

export const metadata = {
  title: 'REALM Radar Canada — Agricultural Auctions, Sales & Market Activity',
  description: 'Curated farm auctions, machinery sales, livestock listings, rural property and market activity across Canada.',
};

type Search = { state?: string; region?: string; category?: string; source_type?: string; timeframe?: string; sort?: string; q?: string; view?: string };

export default async function RadarHome({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  // USA-4: default sort is 'ending_soon' when no sort is provided.
  const effectiveSort = (sp.sort || 'ending_soon') as string;
  const [items, featured, newCount, stateCounts] = await Promise.all([
    getListingsForSeoPage({
      state: sp.state,
      region: sp.region,
      category: sp.category,
      source_type: sp.source_type,
      timeframe: sp.timeframe,
      sort: effectiveSort as any,
      q: sp.q,
    } as any),
    getFeaturedListings(4),
    getNewThisWeekCount(),
    getStateCounts(),
  ]);

  return (
    <>
      <RadarHero newCount={newCount} />

      {/* USA-3: States we cover chip strip */}
      <Suspense fallback={null}><StatesCovered counts={stateCounts} /></Suspense>

      {featured.length > 0 && (
        <section className="mb-14">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="field-label">Curated this week</p>
              <h2 className="font-serif text-3xl text-realm-forest mt-1">Featured listings</h2>
            </div>
            <a href="#picks" className="hidden md:inline text-sm text-realm-forest hover:underline">
              See all activity ↓
            </a>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((l) => <RadarCard key={l.id} l={l} />)}
          </div>
        </section>
      )}

      <section id="picks">
        <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="field-label">Live across the US ag market</p>
            <h2 className="font-serif text-3xl text-realm-forest mt-1">All activity</h2>
          </div>
          <Suspense fallback={null}>
            <RadarViewToggle current={sp.view === 'map' ? 'map' : 'grid'} />
          </Suspense>
        </div>
        <Suspense fallback={null}><FilterBar /></Suspense>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-realm-line-strong bg-realm-paper p-12 text-center">
            {(sp.state || sp.region || sp.category || sp.source_type || sp.timeframe || sp.q) ? (
              <p className="text-realm-charcoal/80">No listings match these filters yet. Try a wider filter or check back soon — new activity arrives daily.</p>
            ) : (
              <>
                <p className="font-serif text-2xl text-realm-forest mb-2">Radar is warming up.</p>
                <p className="text-realm-charcoal/80">We are wiring up live data feeds across the Midwest, Plains and South.<br />The first listings will land here shortly.</p>
                <p className="mt-5 text-sm"><a className="rounded-full bg-realm-forest text-realm-cream px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:bg-realm-deep transition" href="/radar/submit">Submit an auction or sale</a></p>
              </>
            )}
          </div>
        ) : sp.view === 'map' ? (
          <RadarMap listings={items} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((l) => <RadarCard key={l.id} l={l} />)}
          </div>
        )}
      </section>

      <section className="mt-20 grid gap-5 md:grid-cols-3">
        <PromoCard
          eyebrow="REALM360"
          title="From signal to decision"
          body="REALM360 connects market signals with weather, finance, risk and operational data to support better agricultural decisions."
          cta="Explore REALM360"
          href="https://realmgroup.global/realm360"
        />
        <PromoCard
          eyebrow="For sellers"
          title="Become an affiliate"
          body="List directly with REALM. Get featured placement, lead routing and partner visibility across state pages."
          cta="Apply now"
          href="/radar/affiliate"
        />
        <PromoCard
          eyebrow="Weekly briefing"
          title="The Friday Radar email"
          body="A 3-minute briefing of the most useful auctions, sales and signals from across the US ag market."
          cta="Subscribe free"
          href="/radar/subscribe"
        />
      </section>
    </>
  );
}

function PromoCard({ eyebrow, title, body, cta, href }: { eyebrow: string; title: string; body: string; cta: string; href: string }) {
  return (
    <a href={href} className="group block rounded-2xl border border-realm-line bg-realm-paper p-6 shadow-card hover:shadow-card-hover hover:border-realm-gold transition">
      <p className="field-label text-realm-gold">{eyebrow}</p>
      <h3 className="mt-2 font-serif text-2xl text-realm-forest">{title}</h3>
      <p className="mt-3 text-sm text-realm-charcoal/85 leading-relaxed">{body}</p>
      <p className="mt-5 inline-flex items-center gap-1 text-sm text-realm-forest font-semibold group-hover:text-realm-deep">
        {cta} <span className="transition group-hover:translate-x-0.5">→</span>
      </p>
    </a>
  );
}

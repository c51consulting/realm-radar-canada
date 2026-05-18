import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getListingByShortId, getRelatedListings } from '@/lib/queries';
import { parseListingSlug, listingPath } from '@/lib/listing-slug';
import { STATE_NAMES, CATEGORIES, SOURCE_TYPES } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { RadarCard } from '@/components/RadarCard';
import { ViewPing } from '@/components/ViewPing';

// ISR: regenerate at most every 5 minutes so price/sale-date updates show up
// without overloading the DB.
export const revalidate = 300;

type Params = { slug: string };

async function resolve(slug: string) {
  const shortId = parseListingSlug(slug);
  if (!shortId) return null;
  return getListingByShortId(shortId);
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params;
  const listing = await resolve(slug);
  if (!listing) {
    return { title: 'Listing not found · REALM Radar Canada' };
  }
  const title = listing.clean_title || listing.raw_title;
  const stateLabel = listing.state ? STATE_NAMES[listing.state] || listing.state : null;
  const parts = [title, stateLabel].filter(Boolean).join(' · ');
  const description = listing.summary
    || listing.realm_take
    || `Agricultural listing tracked by REALM Radar Canada${stateLabel ? ` in ${stateLabel}` : ''}.`;
  return {
    title: `${parts} · REALM Radar Canada`,
    description: description.slice(0, 160),
    alternates: { canonical: listingPath(listing) },
    openGraph: {
      title: `${title} · REALM Radar Canada`,
      description: description.slice(0, 200),
      type: 'article',
      url: listingPath(listing),
    },
  };
}

function categoryLabel(slug: string | null): string | null {
  if (!slug) return null;
  return CATEGORIES.find((c) => c.slug === slug)?.label || slug;
}

function sourceTypeLabel(slug: string | null): string | null {
  if (!slug) return null;
  return SOURCE_TYPES.find((s) => s.slug === slug)?.label || slug;
}

export default async function ListingDetail({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const listing = await resolve(slug);
  if (!listing) notFound();

  const title = listing.clean_title || listing.raw_title;
  const stateLabel = listing.state ? STATE_NAMES[listing.state] || listing.state : null;
  const catLabel = categoryLabel(listing.category);
  const sourceLabel = sourceTypeLabel(listing.source_type);
  const sourceHref = (listing as any).display_url || listing.source_url;
  const related = await getRelatedListings(listing, 6);

  // JSON-LD product / event schema for SEO. Use Product for sale listings,
  // BreadcrumbList for everything.
  const jsonLd: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Radar', item: '/radar' },
        ...(catLabel ? [{ '@type': 'ListItem', position: 2, name: catLabel, item: `/radar/${listing.category}` }] : []),
        { '@type': 'ListItem', position: catLabel ? 3 : 2, name: title, item: listingPath(listing) },
      ],
    },
  ];
  if (listing.price_value || listing.price_text) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: title,
      description: listing.summary || listing.realm_take || undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: listing.price_value || undefined,
        availability: 'https://schema.org/InStock',
        url: sourceHref,
      },
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <ViewPing id={listing.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-realm-charcoal/70 mb-4 flex flex-wrap gap-x-2 gap-y-1">
        <Link href="/radar" className="hover:text-realm-forest">Radar</Link>
        <span aria-hidden>·</span>
        {catLabel && (
          <>
            <Link href={`/radar/${listing.category}`} className="hover:text-realm-forest">{catLabel}</Link>
            <span aria-hidden>·</span>
          </>
        )}
        {stateLabel && (
          <>
            <Link href={`/radar?state=${listing.state}`} className="hover:text-realm-forest">{stateLabel}</Link>
            <span aria-hidden>·</span>
          </>
        )}
        <span className="text-realm-ink truncate max-w-[40ch]">{title}</span>
      </nav>

      {((listing as any).view_count_week ?? 0) >= 3 ? (
        <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-realm-mint/40 text-realm-forest text-xs font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {(listing as any).view_count_week} views this week
        </div>
      ) : null}

      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap gap-2 mb-3 text-xs uppercase tracking-wide">
          {listing.featured && (
            <span className="px-2 py-0.5 rounded-full bg-realm-gold/20 text-realm-gold-dark font-semibold">Featured</span>
          )}
          {catLabel && (
            <Link href={`/radar/${listing.category}`} className="px-2 py-0.5 rounded-full bg-realm-mint/30 text-realm-forest hover:bg-realm-mint/50">{catLabel}</Link>
          )}
          {stateLabel && (
            <Link href={`/radar?state=${listing.state}`} className="px-2 py-0.5 rounded-full bg-realm-paper border border-realm-line text-realm-charcoal hover:border-realm-forest">{stateLabel}</Link>
          )}
          {sourceLabel && (
            <span className="px-2 py-0.5 rounded-full bg-realm-paper border border-realm-line text-realm-charcoal">{sourceLabel}</span>
          )}
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-realm-ink leading-tight mb-3">{title}</h1>
        {listing.summary && (
          <p className="text-realm-charcoal text-lg leading-relaxed max-w-3xl">{listing.summary}</p>
        )}
      </header>

      {/* Key facts grid */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {(listing.price_text || listing.price_value) && (
          <Fact label="Price" value={listing.price_text || `$${listing.price_value?.toLocaleString()}`} />
        )}
        {listing.sale_date && (
          <Fact label="Sale date" value={formatDate(listing.sale_date)} />
        )}
        {listing.source_name && (
          <Fact label="Source" value={listing.source_name} />
        )}
        {listing.published_at && (
          <Fact label="Added to Radar" value={formatDate(listing.published_at)} />
        )}
      </section>

      {/* Primary CTA */}
      <section className="rounded-2xl border border-realm-line bg-realm-paper p-6 mb-8 shadow-card flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="field-label mb-1">View this listing at the source</p>
          <p className="text-realm-charcoal truncate" title={sourceHref || ''}>{listing.source_name || sourceHref}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={sourceHref || '#'}
            target="_blank"
            rel="noopener nofollow ugc"
            data-radar-link={listing.id}
            className="inline-flex items-center gap-2 rounded-full bg-realm-gold px-5 py-2.5 text-realm-ink font-semibold hover:bg-realm-gold-dark transition whitespace-nowrap"
          >
            Open at source <span aria-hidden>↗</span>
          </a>
          {/* USA-9: Add to calendar */}
          {listing.sale_date && (
            <a
              href={`/api/listing/${listing.id}/ics`}
              className="inline-flex items-center gap-2 rounded-full border border-realm-forest px-5 py-2.5 text-realm-forest font-semibold hover:bg-realm-forest hover:text-realm-cream transition whitespace-nowrap"
              title="Download .ics for your calendar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Add to calendar
            </a>
          )}
        </div>
      </section>

      {/* REALM take */}
      {listing.realm_take && (
        <section className="rounded-2xl border-l-4 border-realm-gold bg-realm-cream p-6 mb-8">
          <p className="field-label mb-2">REALM take</p>
          <p className="text-realm-ink leading-relaxed">{listing.realm_take}</p>
        </section>
      )}

      {/* Raw snippet */}
      {listing.raw_snippet && (
        <section className="mb-8">
          <h2 className="font-serif text-xl text-realm-forest mb-3">From the source</h2>
          <p className="text-realm-charcoal leading-relaxed whitespace-pre-wrap">{listing.raw_snippet}</p>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-realm-forest mb-4">Related listings</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => (
              <RadarCard key={r.id} l={r} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 pt-6 border-t border-realm-line text-sm text-realm-charcoal/70">
        <Link href="/radar" className="hover:text-realm-forest">← Back to Radar</Link>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-realm-line bg-realm-paper p-4">
      <p className="field-label mb-1">{label}</p>
      <p className="text-realm-ink font-medium leading-snug">{value}</p>
    </div>
  );
}

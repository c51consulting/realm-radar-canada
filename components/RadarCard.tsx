'use client';
import Link from 'next/link';
import { Listing, STATE_NAMES } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { buildListingSlug } from '@/lib/listing-slug';
import { CategoryIllustration } from './CategoryIllustration';
import { ShortlistToggle } from './ShortlistButton';

// Fire-and-forget outbound click telemetry. Uses sendBeacon when available
// so the request survives the page unload that follows a target="_blank" click.
function trackOutboundClick(payload: Record<string, string | null | undefined>) {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/click', blob);
    } else if (typeof fetch !== 'undefined') {
      fetch('/api/click', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('outbound_click', payload);
    }
  } catch {
    // Telemetry is best-effort.
  }
}

export function RadarCard({ l }: { l: Partial<Listing> }) {
  const title = l.clean_title || l.raw_title;
  // Full-card link to the detail page when we have an id. Source CTA still
  // opens the source URL in a new tab.
  const detailHref = l.id ? `/radar/listing/${buildListingSlug(l as any)}` : null;
  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-realm-paper shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${l.featured ? 'border-realm-gold' : 'border-realm-line hover:border-realm-moss'}`}>
      {/* Top illustration band — on-brand SVG, never copied imagery */}
      <div className="relative z-0 aspect-[16/9] w-full overflow-hidden bg-realm-forest">
        {detailHref && (
          <Link
            href={detailHref}
            aria-label={`View details for ${title}`}
            className="absolute inset-0 z-10"
          />
        )}
        <CategoryIllustration category={l.category} />
        {/* Badges layered on illustration */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
          {l.featured && <Tag color="gold">Featured</Tag>}
          {isEndingSoon(l.sale_date) && <Tag color="rust">Ending soon</Tag>}
          {isNew(l.published_at) && <Tag color="moss">New</Tag>}
          {l.signal_type && <Tag color={signalColor(l.signal_type)}>{prettifySignal(l.signal_type)}</Tag>}
          {l.state && <Tag color="forest">{l.state}</Tag>}
        </div>
      </div>

      <div className="relative z-20 flex flex-1 flex-col p-5">
        <p className="field-label">
          {l.category ? prettifyCategory(l.category) : 'General'}
          {l.source_type ? ` · ${prettifySourceType(l.source_type)}` : ''}
        </p>

        {/* USA-5: Sale date + Price moved to top of the card */}
        <div className="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-realm-forest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(l.sale_date) !== '—' ? formatDate(l.sale_date) : 'Date TBC'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-realm-forest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
            </svg>
            <span className="truncate max-w-[140px]">{l.price_text || 'Price on enquiry'}</span>
          </span>
          {/* USA-8: Source health dot */}
          <SourceHealthBadge updatedAt={(l as any).updated_at} dateFound={(l as any).date_found} />
        </div>

        <h3 className="mt-2 font-serif text-lg leading-snug text-realm-ink">
          {detailHref ? (
            <Link href={detailHref} className="hover:text-realm-forest transition-colors">{title}</Link>
          ) : title}
        </h3>

        {l.summary && (
          <p className="mt-2 text-sm text-realm-charcoal/85 leading-relaxed line-clamp-3">
            {l.summary}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Field label="Location" value={l.state ? (STATE_NAMES[l.state] || l.state) : '—'} />
          <Field label="Source" value={l.source_name || '—'} truncate />
        </dl>

        {l.realm_take && (
          <p className="mt-4 text-[13px] leading-relaxed border-l-2 border-realm-gold pl-3 text-realm-charcoal">
            <span className="font-semibold text-realm-forest">REALM Take. </span>
            {l.realm_take}
          </p>
        )}

        <div className="mt-auto pt-5 flex flex-wrap items-center gap-2 text-sm">
          <CtaLink kind={l.primary_cta || ctaDefaults(l.source_type).primary} listing={l} primary onTrack={trackOutboundClick} />
          <CtaLink kind={l.secondary_cta || ctaDefaults(l.source_type).secondary} listing={l} onTrack={trackOutboundClick} />
        </div>

        {/* Mini-CTA row: secondary actions that drive funnel signups regardless of source */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border-t border-realm-line/60 pt-3">
          <a
            href={`/radar/subscribe?topic=${encodeURIComponent(buildAlertTopic(l))}`}
            className="text-realm-charcoal/80 hover:text-realm-forest hover:underline inline-flex items-center gap-1"
            onClick={() => trackOutboundClick({
              listing_id: l.id || null,
              source_name: l.source_name || null,
              source_type: l.source_type || null,
              category: l.category || null,
              state: l.state || null,
              cta_kind: 'set_alert',
              target_url: '/radar/subscribe',
            })}
          >
            <span aria-hidden>◎</span> Set alert
          </a>
          <span className="text-realm-line">·</span>
          <a
            href="/radar/submit"
            className="text-realm-charcoal/80 hover:text-realm-forest hover:underline inline-flex items-center gap-1"
            onClick={() => trackOutboundClick({
              listing_id: l.id || null,
              source_name: l.source_name || null,
              source_type: l.source_type || null,
              category: l.category || null,
              state: l.state || null,
              cta_kind: 'submit_similar',
              target_url: '/radar/submit',
            })}
          >
            <span aria-hidden>+</span> Submit similar
          </a>
          {l.id && (
            <>
              <span className="text-realm-line">·</span>
              <ShortlistToggle
                item={{
                  id: l.id,
                  title: title || 'Listing',
                  href: detailHref || undefined,
                  source_url: l.source_url,
                  source_name: l.source_name,
                  state: l.state ? (STATE_NAMES[l.state] || l.state) : null,
                  category: l.category,
                  price_text: l.price_text,
                  sale_date: formatDate(l.sale_date),
                  realm_take: l.realm_take,
                }}
              />
            </>
          )}
          {(l as any).view_count_week && (l as any).view_count_week >= 3 ? (
            <>
              <span className="text-realm-line">·</span>
              <span
                className="inline-flex items-center gap-1 text-realm-charcoal/70"
                title={`${(l as any).view_count_week} views this week`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {formatViewCount((l as any).view_count_week)} this week
              </span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// Ending soon: sale_date within the next 7 days (and not past)
function isEndingSoon(saleDate: string | null | undefined): boolean {
  if (!saleDate) return false;
  const sale = new Date(saleDate + 'T00:00:00');
  if (isNaN(sale.getTime())) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return sale.getTime() >= today.getTime() && sale.getTime() - today.getTime() <= sevenDays;
}

// New: published in last 72 hours
function isNew(publishedAt: string | null | undefined): boolean {
  if (!publishedAt) return false;
  const pub = new Date(publishedAt);
  if (isNaN(pub.getTime())) return false;
  return Date.now() - pub.getTime() <= 72 * 60 * 60 * 1000;
}

// Build a topic string for the alert subscribe deep-link
function buildAlertTopic(l: Partial<Listing>): string {
  const bits: string[] = [];
  if (l.state) bits.push(l.state);
  if (l.category) bits.push(l.category);
  if (l.source_type) bits.push(l.source_type);
  return bits.join(',') || 'all';
}

/**
 * USA-8: Source health badge — a small coloured dot indicating how fresh the
 * crawl signal is.
 *   green  : updated within last 24h
 *   amber  : updated within last 72h
 *   grey   : older than 72h
 */
function SourceHealthBadge({ updatedAt, dateFound }: { updatedAt?: string | null; dateFound?: string | null }) {
  const ts = updatedAt || dateFound;
  if (!ts) return null;
  const t = new Date(ts).getTime();
  if (isNaN(t)) return null;
  const ageHours = (Date.now() - t) / (1000 * 60 * 60);
  let color = 'bg-realm-line';
  let label = 'Older than 3 days';
  if (ageHours <= 24) { color = 'bg-emerald-500'; label = 'Source fresh (<24h)'; }
  else if (ageHours <= 72) { color = 'bg-amber-400'; label = 'Source recent (<3 days)'; }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-realm-charcoal/70"
      title={label}
      aria-label={label}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} aria-hidden />
      <span className="hidden sm:inline">Source</span>
    </span>
  );
}

function Field({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className={`text-sm text-realm-ink ${truncate ? 'truncate' : ''}`}>{value}</dd>
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: 'moss' | 'rust' | 'gold' | 'forest' | 'ink' }) {
  const map: Record<string, string> = {
    moss: 'bg-realm-mint text-realm-forest border border-realm-moss/30',
    rust: 'bg-realm-rust/10 text-realm-rust border border-realm-rust/20',
    gold: 'bg-gold-gradient text-realm-forest border border-realm-gold/40',
    forest: 'bg-realm-forest text-realm-cream',
    ink: 'bg-realm-ink text-realm-cream',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${map[color]}`}>{children}</span>;
}

function prettifyCategory(c: string) {
  const map: Record<string, string> = {
    machinery: 'Machinery',
    livestock: 'Livestock',
    land_property: 'Land & Property',
    farm_equipment: 'Farm Equipment',
    vehicles_transport: 'Vehicles & Transport',
    inputs_supplies: 'Inputs & Supplies',
    farm_business_opportunities: 'Farm Business Opportunities',
    realm_marketplace: 'REALM Marketplace',
    partner_listings: 'Partner Opportunities',
  };
  return map[c] || c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatViewCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k views`;
  return `${n} views`;
}

function prettifySignal(s: string) {
  const map: Record<string, string> = {
    opportunity: 'Opportunity',
    market_movement: 'Market move',
    partner_lead: 'Partner lead',
    finance_trigger: 'Finance angle',
  };
  return map[s] || s;
}

function signalColor(s: string): 'moss' | 'rust' | 'gold' | 'forest' | 'ink' {
  switch (s) {
    case 'opportunity':
      return 'moss';
    case 'market_movement':
      return 'rust';
    case 'finance_trigger':
      return 'gold';
    case 'partner_lead':
      return 'forest';
    default:
      return 'forest';
  }
}

// CTA registry: maps a CTA key to a label + href resolver.
// Source-aware so a public_auction listing surfaces "View source" + "Request finance",
// while a marketplace listing surfaces "View listing" + "List with REALM", etc.
type CtaKind =
  | 'view_source'
  | 'view_listing'
  | 'enquire_realm'
  | 'contact_submitter'
  | 'request_finance'
  | 'list_with_realm'
  | 'submit_listing'
  | 'none';

function ctaDefaults(sourceType: string | undefined | null): { primary: CtaKind; secondary: CtaKind } {
  switch (sourceType) {
    case 'public_auction': return { primary: 'view_source', secondary: 'request_finance' };
    case 'dealer_listing': return { primary: 'view_source', secondary: 'request_finance' };
    case 'marketplace_listing': return { primary: 'view_listing', secondary: 'list_with_realm' };
    case 'realm_listing': return { primary: 'enquire_realm', secondary: 'request_finance' };
    case 'affiliate_member': return { primary: 'view_source', secondary: 'list_with_realm' };
    case 'partner_feature': return { primary: 'view_source', secondary: 'list_with_realm' };
    case 'submission': return { primary: 'contact_submitter', secondary: 'list_with_realm' };
    default: return { primary: 'view_source', secondary: 'submit_listing' };
  }
}

function CtaLink({
  kind,
  listing,
  primary,
  onTrack,
}: {
  kind: string;
  listing: Partial<Listing>;
  primary?: boolean;
  onTrack?: (payload: Record<string, string | null | undefined>) => void;
}) {
  if (kind === 'none' || !kind) return null;

  // Primary CTA = solid green pill button (marketplace feel).
  // Secondary = subtle text-link in moss green.
  const cls = primary
    ? 'inline-flex items-center gap-1 rounded-full bg-realm-forest px-4 py-2 text-realm-cream text-xs font-semibold uppercase tracking-wider hover:bg-realm-deep transition'
    : 'text-sm text-realm-forest hover:text-realm-deep hover:underline';
  const sourceHref = listing.display_url || listing.source_url || '#';

  const fire = (cta_kind: string, target_url: string) => {
    if (!onTrack) return;
    onTrack({
      listing_id: listing.id || null,
      source_name: listing.source_name || null,
      source_type: listing.source_type || null,
      category: listing.category || null,
      state: listing.state || null,
      cta_kind,
      target_url,
    });
  };

  switch (kind as CtaKind) {
    case 'view_source':
      return (
        <a href={sourceHref} target="_blank" rel="noopener nofollow ugc" data-radar-link={listing.id} className={cls}
           onClick={() => fire('view_source', sourceHref)} onAuxClick={() => fire('view_source', sourceHref)}>
          View source {primary ? '→' : ''}
        </a>
      );
    case 'view_listing':
      return (
        <a href={sourceHref} target="_blank" rel="noopener nofollow ugc" data-radar-link={listing.id} className={cls}
           onClick={() => fire('view_listing', sourceHref)} onAuxClick={() => fire('view_listing', sourceHref)}>
          View listing {primary ? '→' : ''}
        </a>
      );
    case 'enquire_realm':
      return (
        <a href="https://realmgroup.global/contact" target="_blank" rel="noopener" className={cls}
           onClick={() => fire('enquire_realm', 'https://realmgroup.global/contact')}>
          Enquire with REALM {primary ? '→' : ''}
        </a>
      );
    case 'contact_submitter': {
      const href = `/radar/listing/${buildListingSlug(listing as any)}`;
      return (
        <a href={href} className={cls}
           onClick={() => fire('contact_submitter', href)}>
          Contact submitter {primary ? '→' : ''}
        </a>
      );
    }
    case 'request_finance':
      return (
        <a href="https://realmgroup.global/finance" target="_blank" rel="noopener" className={cls}
           onClick={() => fire('request_finance', 'https://realmgroup.global/finance')}>
          Request finance
        </a>
      );
    case 'list_with_realm':
      return (
        <a href="/radar/submit" className={cls}
           onClick={() => fire('list_with_realm', '/radar/submit')}>
          List with REALM
        </a>
      );
    case 'submit_listing':
      return (
        <a href="/radar/submit" className={cls}
           onClick={() => fire('submit_listing', '/radar/submit')}>
          Submit a listing
        </a>
      );
    default:
      return null;
  }
}

function prettifySourceType(s: string) {
  const map: Record<string, string> = {
    public_auction: 'Public auction',
    dealer_listing: 'Dealer listing',
    marketplace_listing: 'Marketplace listing',
    realm_listing: 'REALM listing',
    affiliate_member: 'Affiliate member',
    partner_feature: 'Partner feature',
    submission: 'Submitted',
  };
  return map[s] || s;
}

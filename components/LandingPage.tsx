import { Suspense } from 'react';
import { RadarCard } from '@/components/RadarCard';
import { FilterBar } from '@/components/FilterBar';
import { RelatedLinks } from '@/components/RelatedLinks';
import { LeadCaptureBlock } from '@/components/LeadCaptureBlock';
import type { SeoBlock } from '@/lib/seo';
import type { Listing } from '@/lib/types';

// Tiny markdown-ish renderer: paragraph splitting + simple bold/italic.
// Full markdown parsing not needed — seo_blocks.intro_md is short editorial copy.
function MarkdownLite({ md }: { md: string }) {
  const paragraphs = md.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-realm-charcoal/85 leading-relaxed mb-4 last:mb-0">
          {renderInline(p)}
        </p>
      ))}
    </>
  );
}

function renderInline(text: string) {
  // Replace **bold** and _italic_ in a single pass with token splitting.
  const parts: Array<string | { type: 'b' | 'i'; v: string }> = [];
  const re = /\*\*([^*]+)\*\*|_([^_]+)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push({ type: 'b', v: m[1] });
    else if (m[2]) parts.push({ type: 'i', v: m[2] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) =>
    typeof p === 'string' ? <span key={i}>{p}</span> :
    p.type === 'b' ? <strong key={i} className="text-realm-forest">{p.v}</strong> :
    <em key={i}>{p.v}</em>
  );
}

export function LandingPage({
  block,
  listings,
  featured,
  relatedSlugs,
}: {
  block: SeoBlock;
  listings: Listing[];
  featured: Listing[];
  relatedSlugs: string[];
}) {
  return (
    <>
      {/* Hero */}
      <header className="mb-10 rounded-3xl bg-forest-gradient p-10 md:p-14 text-realm-cream shadow-card relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <p className="field-label text-realm-gold">REALM Radar · Canada</p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl leading-tight">{block.h1}</h1>
          {block.subtitle && (
            <p className="mt-4 text-realm-cream/90 text-lg max-w-2xl leading-relaxed">{block.subtitle}</p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#listings"
              className="inline-flex items-center rounded-full bg-realm-gold text-realm-deep px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition"
            >
              View latest opportunities →
            </a>
            <a
              href="/radar/subscribe"
              className="inline-flex items-center rounded-full border border-realm-cream/40 text-realm-cream px-5 py-2.5 text-sm font-semibold hover:bg-realm-cream/10 transition"
            >
              Get weekly alerts
            </a>
          </div>
        </div>
      </header>

      {/* Trust strip */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-wider font-semibold text-realm-charcoal/70">
        <span>Updated daily</span>
        <span className="text-realm-gold">·</span>
        <span>Curated from multiple sources</span>
        <span className="text-realm-gold">·</span>
        <span>Enquire or go direct to source</span>
      </div>

      {/* Featured cards */}
      {featured.length > 0 && (
        <section className="mb-12">
          <div className="mb-5">
            <p className="field-label">Top picks</p>
            <h2 className="font-serif text-3xl text-realm-forest mt-1">Featured this week</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => <RadarCard key={l.id} l={l} />)}
          </div>
        </section>
      )}

      {/* Intro paragraph from seo_blocks */}
      {block.intro_md && (
        <section className="mb-12 max-w-3xl">
          <MarkdownLite md={block.intro_md} />
        </section>
      )}

      {/* Filter bar + listing grid */}
      <section id="listings">
        <div className="mb-5">
          <p className="field-label">All matching activity</p>
          <h2 className="font-serif text-3xl text-realm-forest mt-1">Live listings</h2>
        </div>
        <Suspense fallback={null}><FilterBar /></Suspense>
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-realm-line-strong bg-realm-paper p-12 text-center">
            <p className="font-serif text-2xl text-realm-forest mb-2">No active listings here yet.</p>
            <p className="text-realm-charcoal/80">New activity arrives daily. Check back soon — or submit a sale.</p>
            <p className="mt-5 text-sm">
              <a
                className="rounded-full bg-realm-forest text-realm-cream px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:bg-realm-deep transition"
                href="/radar/submit"
              >
                Submit an auction or sale
              </a>
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => <RadarCard key={l.id} l={l} />)}
          </div>
        )}
      </section>

      {/* Related pages */}
      <RelatedLinks slugs={relatedSlugs} />

      {/* Lead capture */}
      <LeadCaptureBlock />
    </>
  );
}

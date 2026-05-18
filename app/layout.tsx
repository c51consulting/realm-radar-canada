import type { Metadata } from 'next';
import './globals.css';
import { PostHogProvider } from '@/components/PostHogProvider';
import { ShortlistProvider } from '@/components/ShortlistProvider';
import { SiteChromeOverlays, SiteHeaderWrapper, SiteFooterWrapper, MainWrapper } from '@/components/SiteChrome';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://realmgroup.global'),
  title: { default: 'REALM Radar Canada', template: '%s | REALM Radar Canada' },
  description: 'Curated agricultural auctions, machinery sales, livestock listings, rural property and market activity across Canada.',
  openGraph: {
    title: 'REALM Radar Canada',
    description: 'Track what is moving across the Canadian agricultural market.',
    type: 'website',
  },
  alternates: {
    types: {
      'application/rss+xml': '/feeds/all.xml',
      'application/feed+json': '/feeds/all.json',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-realm-cream text-realm-ink antialiased">
        <PostHogProvider>
          <ShortlistProvider>
            <SiteHeaderWrapper><SiteHeader /></SiteHeaderWrapper>
            <MainWrapper>{children}</MainWrapper>
            {/* RR-WIDGET-EMBED-v1 — Robbie's REALM cross-portal embed */}
            <section aria-label="Latest from Robbie's REALM" style={{borderTop:"1px solid rgba(0,0,0,0.06)",background:"#f7f8f5"}}>
              <div id="robbies-realm-embed" data-count="3" data-theme="light"></div>
              <script async src="https://realm-widgets.vercel.app/robbies-realm-widget.js" />
            </section>
            <SiteFooterWrapper><SiteFooter /></SiteFooterWrapper>
            <SiteChromeOverlays />
          </ShortlistProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-realm-line bg-realm-cream/85 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-content px-5 py-4 flex items-center justify-between gap-6">
        <a href="/radar" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-bold tracking-tight text-realm-forest">REALM</span>
          <span className="text-sm uppercase tracking-[0.18em] text-realm-charcoal font-semibold">Radar Canada</span>
        </a>
        <nav className="hidden md:flex gap-1 text-sm text-realm-charcoal items-center">
          <a href="/radar" className="px-3 py-1.5 rounded-full hover:bg-realm-mint hover:text-realm-forest transition">All</a>
          <a href="/radar/machinery" className="px-3 py-1.5 rounded-full hover:bg-realm-mint hover:text-realm-forest transition">Machinery</a>
          <a href="/radar/livestock" className="px-3 py-1.5 rounded-full hover:bg-realm-mint hover:text-realm-forest transition">Livestock</a>
          <a href="/radar/land_property" className="px-3 py-1.5 rounded-full hover:bg-realm-mint hover:text-realm-forest transition">Land &amp; Property</a>
          <a href="/radar/subscribe" className="px-3 py-1.5 rounded-full hover:bg-realm-mint hover:text-realm-forest transition">Subscribe</a>
          <a href="/radar/submit" className="ml-2 rounded-full bg-realm-forest text-realm-cream px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:bg-realm-deep transition">
            Submit a sale
          </a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-realm-line mt-16 bg-realm-forest text-realm-cream">
      <div className="mx-auto max-w-content px-5 py-12 space-y-5">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-bold text-realm-cream">REALM</span>
          <span className="text-xs uppercase tracking-[0.18em] text-realm-gold font-semibold">Radar Canada</span>
        </div>
        <p className="max-w-3xl text-sm text-realm-cream/75 leading-relaxed">
          REALM Radar curates publicly available agricultural auction, listing and market activity from third-party sources.
          REALM does not own, manage, verify or guarantee third-party listings unless clearly stated.
          Users should confirm all details directly with the original listing provider before acting.
        </p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-realm-cream/85">
          <a href="/radar/about" className="hover:text-realm-gold transition">About</a>
          <a href="https://realmgroup.global/affiliate-program/" target="_blank" rel="noopener" className="hover:text-realm-gold transition">Affiliate program</a>
          <a href="/radar/submit" className="hover:text-realm-gold transition">Submit a listing</a>
          <a href="/radar/subscribe" className="hover:text-realm-gold transition">Subscribe</a>
          <a href="/feeds" className="hover:text-realm-gold transition">RSS / JSON feeds</a>
          <a href="/partners/feeds" className="hover:text-realm-gold transition">Syndicate</a>
          <a href="/partners/webhooks" className="hover:text-realm-gold transition">Webhooks</a>
          <a href="https://realmgroup.global/ca/" target="_blank" rel="noopener" className="hover:text-realm-gold transition">REALM Marketplace ↗</a>
          <a href="mailto:radar@realmgroup.global?subject=REALM Radar%20%E2%80%94%20Takedown%20Request" className="hover:text-realm-gold transition">Takedown requests</a>
        </nav>
        <p className="text-xs text-realm-cream/55 pt-3 border-t border-realm-cream/15">
          © {new Date().getFullYear()} REALM Group. Part of the REALM ecosystem — built by farmers, for farmers.
        </p>
      </div>
    </footer>
  );
}

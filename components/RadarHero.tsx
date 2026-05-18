/**
 * REALM Radar hero — matches REALM Marketplace /ca/ brand language.
 * Aerial farmland photo + deep-green overlay + serif headline + botanical flourishes.
 */
export function RadarHero({ newCount = 0 }: { newCount?: number } = {}) {
  return (
    <section className="relative -mx-5 mb-12 overflow-hidden md:rounded-3xl">
      <div className="relative isolate">
        {/* Midwest hero — original commission, AI-generated for REALM Radar Canada */}
        <div
          className="relative h-[420px] md:h-[480px] bg-cover bg-center"
          style={{
            backgroundImage: `url('/hero/usa-midwest.png')`,
          }}
        >
          {/* Forest-green overlay */}
          <div className="absolute inset-0 bg-hero-overlay" />

          {/* Botanical flourishes */}
          <img src="/flourish.svg" alt="" className="flourish-bl hidden md:block" />
          <img src="/flourish.svg" alt="" className="flourish-br hidden md:block" />

          {/* Hero content */}
          <div className="relative z-10 mx-auto flex h-full max-w-content flex-col justify-center px-6 md:px-10 text-realm-cream">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-realm-gold">
                REALM Group · Canada
              </p>
              {newCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-realm-gold/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-realm-forest">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-realm-forest animate-pulse" />
                  {newCount} new this week
                </span>
              )}
            </div>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] mt-3 max-w-3xl">
              Every US ag auction, ranch sale &amp; rural property &mdash; one curated feed.
            </h1>
            <p className="mt-5 max-w-2xl text-base md:text-lg text-realm-cream/90 leading-relaxed">
              Farmers, ranchers, dealers and brokers use REALM Radar to find what&rsquo;s moving
              this week &mdash; from public-auction cattle and equipment to retiring-rancher
              land &mdash; without scrolling a hundred sale-barn websites.
            </p>
          </div>
        </div>

        {/* Solid green CTA band beneath, matching the /ca/ marketplace pattern */}
        <div className="bg-realm-green text-realm-cream">
          <div className="mx-auto max-w-content px-6 md:px-10 py-5 flex flex-wrap items-center gap-3">
            <a
              href="#picks"
              className="rounded-full bg-realm-gold text-realm-forest font-semibold uppercase tracking-wider text-xs px-5 py-3 hover:bg-realm-gold-light transition"
            >
              Browse this week&rsquo;s listings
            </a>
            <a
              href="/radar/submit"
              className="rounded-full border border-realm-cream/60 text-realm-cream uppercase tracking-wider text-xs px-5 py-3 hover:bg-realm-cream/10 transition"
            >
              Submit a sale
            </a>
            <a
              href="https://realmgroup.global/ca/"
              target="_blank"
              rel="noopener"
              className="rounded-full border border-realm-cream/60 text-realm-cream uppercase tracking-wider text-xs px-5 py-3 hover:bg-realm-cream/10 transition ml-auto"
            >
              List on REALM Marketplace ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

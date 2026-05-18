export const metadata = {
  title: 'About — REALM Radar Canada',
  description:
    'How REALM Radar curates US ag-market signal. Our stance on attribution, image rights, takedown requests, and the difference between REALM listings and third-party signal.',
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl">
      <p className="text-realm-rust text-sm font-medium uppercase tracking-wider">About</p>
      <h1 className="font-serif text-4xl mt-2">What REALM Radar is — and isn&rsquo;t.</h1>
      <p className="mt-4 text-lg text-realm-ink/85 leading-relaxed">
        REALM Radar is a curated index of public US agricultural-market signal — auctions,
        dealer listings, livestock sales, and land openings — across our Phase 1 states.
        We surface links and metadata, not full listing content. The goal is to help operators,
        investors, and partners see what is actually moving, without the noise of a generic feed.
      </p>

      <Section title="Our curation stance">
        <ul className="mt-3 space-y-2 text-realm-ink/80 leading-relaxed">
          <li>
            <strong>Links and metadata only.</strong> We do not copy full listing descriptions. We do not
            republish third-party images. Each card sends you to the original source.
          </li>
          <li>
            <strong>No spoofing.</strong> Third-party listings are clearly labelled with the source name and
            type. REALM-owned listings are separate and marked as such.
          </li>
          <li>
            <strong>Phase 1 scope.</strong> We are deliberately narrow: Wisconsin, Iowa, Illinois, Minnesota,
            Nebraska, Kansas, Texas, Oklahoma — across machinery, livestock, land, farm equipment, dealer sales,
            clearing/retirement sales, REALM listings, and partner listings.
          </li>
          <li>
            <strong>Robots and rate limits respected.</strong> We poll RSS feeds and public sitemaps that
            sources publish to be indexed. We do not bypass paywalls, login walls, or anti-bot controls.
          </li>
          <li>
            <strong>Signal, not a marketplace.</strong> Radar points to sales happening elsewhere. We are not
            the seller of third-party items. For REALM-owned and affiliate listings, that distinction is
            spelled out on the card.
          </li>
        </ul>
      </Section>

      <Section title="How a listing gets onto Radar">
        <ol className="mt-3 list-decimal pl-5 space-y-2 text-realm-ink/80 leading-relaxed">
          <li>
            A public RSS feed or sitemap from a verified source is polled hourly.
          </li>
          <li>
            New URLs are matched against our Phase 1 states and categories. Out-of-scope items are dropped.
          </li>
          <li>
            In-scope items are enriched: a short summary, REALM&rsquo;s commentary on why it matters, a
            confidence score, a priority score, an inferred expiry, and CTA routing.
          </li>
          <li>
            Items above our publish threshold appear on the public Radar. Lower-confidence items stay in
            review. The top three per category are featured.
          </li>
          <li>
            Sale-date or expiry-date passed = automatically archived. Stale auctions disappear.
          </li>
        </ol>
      </Section>

      <Section title="Attribution">
        <p className="mt-3 text-realm-ink/80 leading-relaxed">
          Every card shows the source name and a direct link to the original listing. We use{' '}
          <code className="text-xs bg-realm-paper px-1.5 py-0.5 rounded">rel=&quot;nofollow ugc&quot;</code>{' '}
          on outbound links to make our role explicit: we are pointing at the source, not endorsing or
          republishing it. Source organisations who want their listings featured more prominently can
          {' '}<a className="text-realm-moss underline" href="/radar/affiliate">become an affiliate</a>.
        </p>
      </Section>

      <Section title="Takedown requests">
        <p className="mt-3 text-realm-ink/80 leading-relaxed">
          If you are a source operator or rights-holder and want a listing removed, your entire feed
          delisted, or the way we describe your sales changed, email{' '}
          <a className="text-realm-moss underline" href="mailto:radar@realmgroup.global?subject=REALM Radar — Takedown Request">
            radar@realmgroup.global
          </a>
          . Include the listing URL or your domain. We action takedowns within 2 business days and do not
          require a formal DMCA notice.
        </p>
      </Section>

      <Section title="Submitting your own listing">
        <p className="mt-3 text-realm-ink/80 leading-relaxed">
          If you have a sale you want on Radar — whether you&rsquo;re a private vendor, retiring operator,
          or partner organisation — use the{' '}
          <a className="text-realm-moss underline" href="/radar/submit">submit a listing</a> form. Submitted
          listings are reviewed manually and labelled accordingly.
        </p>
      </Section>

      <Section title="Contact">
        <p className="mt-3 text-realm-ink/80 leading-relaxed">
          General editorial and partnership enquiries:{' '}
          <a className="text-realm-moss underline" href="mailto:radar@realmgroup.global">
            radar@realmgroup.global
          </a>
          . Affiliate program details are on the{' '}
          <a className="text-realm-moss underline" href="/radar/affiliate">affiliate page</a>.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}

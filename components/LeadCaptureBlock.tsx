export function LeadCaptureBlock() {
  return (
    <section className="mt-12 grid gap-4 md:grid-cols-3">
      <PillCard
        eyebrow="Weekly digest"
        title="Subscribe free"
        body="Get the Friday Radar — a 3-minute briefing of curated US ag opportunities."
        cta="Subscribe"
        href="/radar/subscribe"
      />
      <PillCard
        eyebrow="For sellers"
        title="Submit a listing"
        body="Auctioneers, dealers, agents and affiliate members can submit sales for review."
        cta="Submit"
        href="/radar/submit"
      />
      <PillCard
        eyebrow="Talk to REALM"
        title="Become a partner"
        body="Featured placement, lead routing and partner visibility across state pages."
        cta="Apply"
        href="/radar/affiliate"
      />
    </section>
  );
}

function PillCard({
  eyebrow, title, body, cta, href,
}: { eyebrow: string; title: string; body: string; cta: string; href: string }) {
  return (
    <a
      href={href}
      className="group block rounded-2xl border border-realm-line bg-realm-paper p-6 shadow-card hover:shadow-card-hover hover:border-realm-gold transition"
    >
      <p className="field-label text-realm-gold">{eyebrow}</p>
      <h3 className="mt-2 font-serif text-2xl text-realm-forest">{title}</h3>
      <p className="mt-3 text-sm text-realm-charcoal/85 leading-relaxed">{body}</p>
      <p className="mt-5 inline-flex items-center gap-1 text-sm text-realm-forest font-semibold group-hover:text-realm-deep">
        {cta} <span className="transition group-hover:translate-x-0.5">→</span>
      </p>
    </a>
  );
}

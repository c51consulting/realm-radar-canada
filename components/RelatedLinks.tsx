import { describeSlug } from '@/lib/seo';

export function RelatedLinks({ slugs, title = 'Related Radar pages' }: { slugs: string[]; title?: string }) {
  if (!slugs || slugs.length === 0) return null;
  const links = slugs.map(describeSlug);
  return (
    <section className="mt-16 rounded-2xl border border-realm-line bg-realm-paper p-8 shadow-card">
      <p className="field-label">Explore further</p>
      <h2 className="font-serif text-3xl text-realm-forest mt-1 mb-6">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            className="group block rounded-xl border border-realm-line bg-white p-4 hover:border-realm-gold hover:shadow-card-hover transition"
          >
            <p className="font-serif text-lg text-realm-forest group-hover:text-realm-deep">{link.label}</p>
            {link.sub && <p className="mt-1 text-xs text-realm-charcoal/70">{link.sub}</p>}
            <p className="mt-2 text-xs text-realm-gold font-semibold tracking-wider uppercase">Explore →</p>
          </a>
        ))}
      </div>
    </section>
  );
}

/**
 * USA-10: Partner embed instructions page. Shows the iframe snippet + a live preview.
 */
export const metadata = {
  title: 'Embed REALM Radar on your site',
  description: 'Drop a live REALM Radar feed into any partner website with a single iframe snippet.',
};

export default function PartnerEmbedPage() {
  const snippet = `<iframe
  src="https://realm-radar-canada.vercel.app/embed/radar?state=TX&limit=6"
  width="100%"
  height="600"
  frameborder="0"
  loading="lazy"
  style="border:1px solid #e6e2d6;border-radius:12px"
  title="REALM Radar Canada"></iframe>`;

  return (
    <main className="mx-auto max-w-content px-5 py-10">
      <p className="field-label">For partners</p>
      <h1 className="font-serif text-4xl md:text-5xl text-realm-forest mt-2 mb-3">Embed REALM Radar</h1>
      <p className="text-realm-charcoal/85 max-w-2xl leading-relaxed mb-8">
        Drop a live REALM Radar feed onto your own website with one iframe. Filter by state, category or limit, and it
        will stay current automatically via our 10-minute revalidation.
      </p>

      <section className="mb-10">
        <h2 className="font-serif text-2xl text-realm-forest mb-3">1 · Copy the snippet</h2>
        <pre className="rounded-2xl border border-realm-line bg-realm-paper p-5 text-xs leading-relaxed overflow-x-auto">
          <code>{snippet}</code>
        </pre>
        <p className="text-xs text-realm-charcoal/70 mt-3">
          Customise via query string: <code>?state=TX</code>, <code>?category=livestock</code>, <code>?limit=10</code>,{' '}
          <code>?theme=dark</code>.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-realm-forest mb-3">2 · Preview</h2>
        <iframe
          src="/embed/radar?state=TX&limit=4"
          width="100%"
          height="500"
          loading="lazy"
          style={{ border: '1px solid #e6e2d6', borderRadius: 12 }}
          title="REALM Radar embed preview"
        />
      </section>
    </main>
  );
}

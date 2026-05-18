export const metadata = {
  title: 'Become an Affiliate — REALM Radar Canada',
  description: 'List directly with REALM. Featured placement, lead routing and partner visibility across state pages.',
};

export default function AffiliatePage() {
  return (
    <div className="max-w-3xl">
      <p className="text-realm-rust text-sm font-medium uppercase tracking-wider">Affiliate Program</p>
      <h1 className="font-serif text-4xl mt-2">List directly with REALM.</h1>
      <p className="mt-4 text-lg text-realm-ink/85 leading-relaxed">
        REALM Radar is built to surface what is moving across the US ag market. Affiliate members get
        a direct line into that signal — featured placement, lead routing, and partner visibility on
        every relevant state and category page.
      </p>

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        <Tier name="Affiliate" price="Free" features={['One verified org profile', 'Submit unlimited public listings', 'Standard placement in feeds']} />
        <Tier name="Featured" price="From $99/mo" features={['Pinned placement on state pages', 'Top-of-rail Featured this week eligibility', 'Lead capture form on each listing', 'Email amplification in weekly Radar']} highlighted />
        <Tier name="Partner" price="Custom" features={['Co-branded category page', 'Direct lead routing via API or webhook', 'REALM360 data layer access', 'Quarterly market briefings']} />
      </div>

      <div className="mt-10 rounded-2xl border border-realm-line bg-white p-6">
        <h2 className="font-serif text-2xl">Apply</h2>
        <p className="mt-2 text-sm text-realm-ink/70">
          For now, affiliate applications are reviewed manually. Send the details below to{' '}
          <a className="text-realm-moss underline" href="mailto:radar@realmgroup.global?subject=REALM Radar — Affiliate Application">
            radar@realmgroup.global
          </a>:
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-realm-ink/80 space-y-1">
          <li>Organisation name + website</li>
          <li>States and categories you operate in</li>
          <li>Typical sale volume per month</li>
          <li>Tier you&rsquo;re interested in</li>
        </ul>
        <p className="mt-4 text-sm">
          Or <a className="text-realm-moss underline" href="/radar/submit">submit a sale to test the pipeline</a> first.
        </p>
      </div>
    </div>
  );
}

function Tier({ name, price, features, highlighted }: { name: string; price: string; features: string[]; highlighted?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${highlighted ? 'border-2 border-realm-moss bg-realm-moss/5' : 'border border-realm-line bg-white'}`}>
      <h3 className="font-serif text-xl">{name}</h3>
      <p className={`mt-1 text-sm font-medium ${highlighted ? 'text-realm-moss' : 'text-realm-ink/70'}`}>{price}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-realm-ink/80">
        {features.map((f) => <li key={f}>· {f}</li>)}
      </ul>
    </div>
  );
}

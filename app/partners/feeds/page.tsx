import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner feeds — REALM Radar Canada',
  description:
    'Documentation for partners syndicating REALM Radar via RSS, Atom, or JSON Feed. Attribution, refresh cadence, and endpoint reference.',
};

const SITE = 'https://realm-radar-canada.vercel.app';

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-md bg-stone-900 px-3 py-2 text-xs text-stone-100">
      <code>{children}</code>
    </pre>
  );
}

export default function PartnerFeedsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Syndicating REALM Radar</h1>
        <p className="mt-2 text-stone-600">
          REALM Radar publishes structured, filterable feeds of US agriculture opportunities.
          Subscribe in any RSS reader, ingest the JSON feed into your CMS, or display latest items
          via the embed widget. Browse the full directory at{' '}
          <Link href="/feeds" className="text-emerald-700 underline">/feeds</Link>.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Endpoint shape</h2>
        <p className="text-stone-700">
          Every feed is available as both RSS 2.0 and JSON Feed 1.1. Swap the extension.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li><code>{SITE}/feeds/all.xml</code> — master firehose</li>
          <li><code>{SITE}/feeds/category/&lt;category&gt;.xml</code></li>
          <li><code>{SITE}/feeds/state/&lt;state-slug-or-code&gt;.xml</code></li>
          <li><code>{SITE}/feeds/state/&lt;state&gt;/&lt;category&gt;.xml</code> — cross-filter</li>
          <li><code>{SITE}/feeds/partner/&lt;scope&gt;.xml?token=&lt;your-token&gt;</code> — tokenized</li>
        </ul>
        <p className="mt-3 text-sm text-stone-600">
          Categories: <code>livestock</code>, <code>machinery</code>, <code>vehicles_transport</code>,{' '}
          <code>farm_equipment</code>, <code>land_property</code>, <code>inputs_supplies</code>.
        </p>
        <p className="mt-2 text-sm text-stone-600">
          States accept either 2-letter codes (<code>tx</code>) or kebab-case names (<code>texas</code>,{' '}
          <code>north-dakota</code>).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Quick examples</h2>
        <p className="text-sm text-stone-600">Fetch the Texas livestock feed via curl:</p>
        <Code>curl {SITE}/feeds/state/texas.xml</Code>
        <p className="text-sm text-stone-600">Or as JSON:</p>
        <Code>curl {SITE}/feeds/category/livestock.json</Code>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Refresh cadence</h2>
        <p className="text-sm text-stone-700">
          Feeds are regenerated every 10 minutes and served with{' '}
          <code>Cache-Control: public, s-maxage=600, stale-while-revalidate=3600</code>. Polling
          more often than every 10 minutes will not yield fresher data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Attribution requirements</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>Link every republished item back to the source URL provided in the feed item.</li>
          <li>Credit &ldquo;via REALM Radar&rdquo; with a link to <code>{SITE}/radar</code>.</li>
          <li>Do not republish full body content — feeds are link + short summary only.</li>
          <li>Do not strip or modify the <code>&lt;source&gt;</code> tag.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Item schema</h2>
        <p className="text-sm text-stone-600">Each RSS item contains:</p>
        <Code>{`<item>
  <title><![CDATA[...]]></title>
  <link>https://realm-radar-canada.vercel.app/radar/listing/<slug></link>
  <guid isPermaLink="false">uuid</guid>
  <pubDate>RFC822</pubDate>
  <description><![CDATA[280-char summary]]></description>
  <dc:creator>Source publication name</dc:creator>
  <source url="https://source-publication">Name</source>
  <category>livestock</category>
  <category>TX</category>
</item>`}</Code>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Want a custom slice?</h2>
        <p className="text-sm text-stone-700">
          Need a state + category combo (e.g. Wisconsin machinery) or a tokenized partner feed?
          Email <a className="text-emerald-700 underline" href="mailto:partners@realmgroup.global">partners@realmgroup.global</a> —
          we add new public slices when there&apos;s confirmed demand.
        </p>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">Also available</p>
        <ul className="mt-1 list-disc pl-5">
          <li><Link href="/partners/webhooks" className="underline">Real-time webhooks</Link> — POST notifications when listings are published</li>
          <li><Link href="/partners/embed" className="underline">Embed widget</Link> — drop latest listings into your site as HTML</li>
          <li><Link href="/feeds" className="underline">Full feed directory</Link> — browse every slice</li>
        </ul>
      </section>
    </main>
  );
}

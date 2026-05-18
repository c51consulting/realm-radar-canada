import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Syndicate REALM Radar Canada — RSS, JSON, webhooks',
  description:
    'One-page reference for partners: copy-paste feed URLs, request a partner token, or subscribe to real-time webhook push for new Canadian agriculture listings.',
  alternates: {
    types: {
      'application/rss+xml': '/feeds/all.xml',
      'application/feed+json': '/feeds/all.json',
    },
  },
};

const SITE = 'https://realm-radar-canada.vercel.app';

const TOP_FEEDS = [
  { label: 'Master firehose (RSS 2.0)', url: `${SITE}/feeds/all.xml` },
  { label: 'Master firehose (JSON Feed)', url: `${SITE}/feeds/all.json` },
  { label: 'Livestock category', url: `${SITE}/feeds/category/livestock.xml` },
  { label: 'Machinery category', url: `${SITE}/feeds/category/machinery.xml` },
  { label: 'Alberta province', url: `${SITE}/feeds/state/alberta.xml` },
  { label: 'Alberta × Livestock (cross-filter)', url: `${SITE}/feeds/state/alberta/livestock.xml` },
  { label: 'Saskatchewan province', url: `${SITE}/feeds/state/saskatchewan.xml` },
  { label: 'Ontario province', url: `${SITE}/feeds/state/ontario.xml` },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[0.85em] font-mono text-stone-800 break-all">
      {children}
    </code>
  );
}

export default function SyndicatePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-emerald-700 font-medium">For partners</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Syndicate REALM Radar Canada</h1>
        <p className="mt-3 text-stone-700">
          Get every new verified Canadian ag listing — livestock, machinery, equipment, land, auctions — in your
          reader, your CMS, your webhook handler, or your email. Coverage across all 10 provinces and 3 territories,
          bilingual EN/FR. No fees, no auth for public feeds.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-stone-900 mb-3">Most-used feeds</h2>
        <ul className="space-y-2">
          {TOP_FEEDS.map((f) => (
            <li key={f.url} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-2 border-b border-stone-100">
              <span className="text-sm text-stone-700">{f.label}</span>
              <Code>{f.url}</Code>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-500">
          Full directory: <Link href="/feeds" className="text-emerald-700 underline">/feeds</Link>.
          Filter pattern: <code>/feeds/state/&lt;province&gt;/&lt;category&gt;.xml</code>. Province slugs use English names (e.g. <code>alberta</code>, <code>british-columbia</code>, <code>quebec</code>).
        </p>
      </section>

      <section className="mb-10 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-emerald-900">One-click subscribe to the whole network</h2>
            <p className="mt-1 text-sm text-emerald-800">
              Import every REALM Radar feed — Canada, USA, Uganda, India, Jobs, Experiences — into Feedly,
              Inoreader, NewsBlur, or any OPML-compatible reader in a single import.
            </p>
          </div>
          <a
            href="/syndicate/realm.opml"
            download="realm-radar-network.opml"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition"
          >
            Download OPML bundle
          </a>
        </div>
        <p className="mt-3 text-xs text-emerald-700">
          OPML 2.0 · grouped by radar · ready to import in any feed reader
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-stone-900 mb-3">Three ways to consume</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-stone-200 p-4">
            <h3 className="font-semibold text-stone-900">Public RSS</h3>
            <p className="mt-1 text-sm text-stone-600">
              Standards-compliant RSS 2.0 + JSON Feed 1.1. Refreshes every 10 min. No auth.
            </p>
            <Link href="/feeds" className="mt-2 inline-block text-sm text-emerald-700 underline">Browse all feeds →</Link>
          </div>
          <div className="rounded-lg border border-stone-200 p-4">
            <h3 className="font-semibold text-stone-900">Partner token</h3>
            <p className="mt-1 text-sm text-stone-600">
              Private feed with usage analytics, higher rate limits, custom scope. Request one for free.
            </p>
            <Link href="/partners/feeds" className="mt-2 inline-block text-sm text-emerald-700 underline">Token docs →</Link>
          </div>
          <div className="rounded-lg border border-stone-200 p-4">
            <h3 className="font-semibold text-stone-900">Webhook push</h3>
            <p className="mt-1 text-sm text-stone-600">
              HMAC-signed POST on every new item. 5-min dispatch cadence, automatic retries.
            </p>
            <Link href="/partners/webhooks" className="mt-2 inline-block text-sm text-emerald-700 underline">Webhook docs →</Link>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-stone-900 mb-3">Attribution</h2>
        <p className="text-stone-700 text-sm">
          Every feed item includes the original <code>&lt;source url=&quot;…&quot;&gt;</code> tag and{' '}
          <code>dc:creator</code>. Partners are required to preserve both when redistributing. No images
          are bundled — link out to source pages for full media.
        </p>
      </section>

      <section className="mb-10 rounded-lg bg-stone-50 border border-stone-200 p-5">
        <h2 className="text-lg font-semibold text-stone-900 mb-2">Want a partner token or webhook subscription?</h2>
        <p className="text-sm text-stone-700">
          Email <a href="mailto:partners@realmgroup.global" className="text-emerald-700 underline">partners@realmgroup.global</a>{' '}
          with your use case. We provision tokens manually within 24 hours.
        </p>
      </section>

      <footer className="text-xs text-stone-500">
        REALM Radar Canada · operated by REALM Group Global · {new Date().getFullYear()}
      </footer>
    </main>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Webhook subscriptions — REALM Radar Canada',
  description:
    'Receive real-time POST notifications when REALM Radar publishes new listings matching your filter.',
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-md bg-stone-900 px-3 py-2 text-xs text-stone-100">
      <code>{children}</code>
    </pre>
  );
}

export default function WebhooksPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Real-time webhooks</h1>
        <p className="mt-2 text-stone-600">
          Subscribe to REALM Radar and receive a signed HTTP POST every time a matching listing
          is published. Faster than polling the RSS feed, ideal for partner sites and CRMs.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">How it works</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
          <li>Email <a className="text-emerald-700 underline" href="mailto:partners@realmgroup.global">partners@realmgroup.global</a> with your endpoint URL and filter.</li>
          <li>We create a subscription, generate a unique signing secret, and share it back.</li>
          <li>Every ~5 minutes we deliver new matching listings via POST.</li>
          <li>You verify the <code>X-Realm-Signature</code> header and ingest the payload.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Filter examples</h2>
        <p className="text-sm text-stone-600">JSON filters applied per subscription:</p>
        <Code>{`// Ontario livestock only
{ "state": "ON", "category": "livestock" }

// Any machinery, any province
{ "category": "machinery" }

// Multiple provinces (array = OR)
{ "state": ["AB", "SK", "MB"] }`}</Code>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Payload format</h2>
        <Code>{`POST https://your-endpoint.example.com/webhooks/realm
Content-Type: application/json
X-Realm-Signature: sha256=<hex>
X-Realm-Event: listing.published
User-Agent: REALM-Radar-Webhook/1.0

{
  "event": "listing.published",
  "delivered_at": "2026-05-16T03:45:00.000Z",
  "item": {
    "id": "5990ac32-…",
    "title": "45 American Red 2nd Calf Pairs",
    "summary": "…",
    "link": "https://realm-radar-canada.vercel.app/radar/listing/…",
    "source_name": "Cattle Range",
    "source_url": "https://www.cattlerange.com/…",
    "category": "livestock",
    "state_or_region": "AB",
    "country": "Canada",
    "published_at": "2026-05-16T03:00:00Z"
  }
}`}</Code>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Verifying the signature</h2>
        <p className="text-sm text-stone-700">
          Compute <code>sha256=HMAC-SHA256(secret, raw_body)</code> as hex and compare to the
          <code>X-Realm-Signature</code> header using constant-time comparison.
        </p>
        <Code>{`// Node.js example
import { createHmac, timingSafeEqual } from 'crypto';

const expected = 'sha256=' + createHmac('sha256', SECRET)
  .update(rawBody)
  .digest('hex');

if (!timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers['x-realm-signature']))) {
  return res.status(401).send('bad signature');
}`}</Code>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Reliability</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>Deliveries are deduped per (subscription, item) — safe to retry.</li>
          <li>We retry up to 10 consecutive failures before pausing the subscription.</li>
          <li>10-second timeout. Return any 2xx to acknowledge.</li>
          <li>If you miss deliveries, fall back to polling <Link href="/feeds" className="text-emerald-700 underline">/feeds/all.json</Link>.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">Also see</p>
        <ul className="mt-1 list-disc pl-5">
          <li><Link href="/partners/feeds" className="underline">RSS &amp; JSON feeds</Link> — pull-based syndication</li>
          <li><Link href="/partners/embed" className="underline">Embed widget</Link> — display latest listings on your site</li>
        </ul>
      </section>
    </main>
  );
}

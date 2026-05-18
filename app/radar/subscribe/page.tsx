import { SubscribeForm } from './SubscribeForm';

export const metadata = {
  title: 'Weekly Radar Email — REALM Radar Canada',
  description: 'A 3-minute Friday briefing of the most useful auctions, sales and signals from across the Canadian ag market.',
};

export default function SubscribePage() {
  return (
    <div className="max-w-2xl">
      <p className="text-realm-rust text-sm font-medium uppercase tracking-wider">Subscribe</p>
      <h1 className="font-serif text-4xl mt-2">The weekly Radar email</h1>
      <p className="mt-3 text-realm-ink/80 leading-relaxed">
        A 3-minute Friday briefing of the most useful auctions, machinery sales, livestock listings
        and rural property opportunities from across the Canadian ag market. Filter by province and category —
        we only send what is relevant to you.
      </p>
      <SubscribeForm />
      <p className="mt-6 text-xs text-realm-ink/50">
        No spam. Unsubscribe anytime. We never share your email.
      </p>
    </div>
  );
}

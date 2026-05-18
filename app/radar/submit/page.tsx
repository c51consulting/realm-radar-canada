import { SubmitForm } from './SubmitForm';

export const metadata = {
  title: 'Submit an Auction, Sale or Listing',
  description: 'Send us your agricultural auction, sale or listing for review in REALM Radar Canada.',
};

export default function SubmitPage() {
  return (
    <div className="max-w-2xl">
      <p className="text-realm-rust text-sm font-medium uppercase tracking-wider">Submit</p>
      <h1 className="font-serif text-4xl mt-2">Submit a sale to REALM Radar</h1>
      <p className="mt-3 text-realm-ink/80">
        Auctioneers, dealers, agents and affiliate members can submit auctions, sales and listings for review.
        Free for public listings. Paid featured placement available.
      </p>
      <SubmitForm />
    </div>
  );
}

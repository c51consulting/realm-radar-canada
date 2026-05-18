import { AdminClient } from './AdminClient';

export const metadata = { title: 'Admin — Review Queue', robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl">Review queue</h1>
      <p className="text-sm text-realm-ink/60 mt-1">Listings flagged by AI for human approval.</p>
      <AdminClient />
    </div>
  );
}

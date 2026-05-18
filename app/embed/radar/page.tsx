/**
 * USA-10: Embeddable Radar widget. Iframe-friendly minimal page partner sites
 * can drop into their pages. Accepts ?state=XX&limit=N&category=.
 *
 * Styled to inherit container width and stay legible inside narrow iframes.
 */
import { getListingsForSeoPage } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import { STATE_NAMES } from '@/lib/types';

export const revalidate = 600;

type Search = { state?: string; category?: string; limit?: string; theme?: string };

export const metadata = {
  title: 'REALM Radar Embed',
  robots: { index: false, follow: false },
};

export default async function EmbedRadar({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const limit = Math.max(1, Math.min(20, parseInt(sp.limit || '6', 10) || 6));
  const items = await getListingsForSeoPage(
    {
      state: sp.state,
      category: sp.category,
      sort: 'ending_soon' as any,
    } as any,
    limit
  );

  const dark = sp.theme === 'dark';
  const bg = dark ? 'bg-realm-forest text-realm-cream' : 'bg-white text-realm-ink';
  const cardBg = dark ? 'bg-realm-deep border-realm-forest' : 'bg-realm-paper border-realm-line';

  return (
    <main className={`${bg} min-h-screen px-3 py-4`}>
      <div className="flex items-center justify-between mb-3">
        <a
          href={`https://realm-radar-canada.vercel.app/radar${sp.state ? `?state=${sp.state}` : ''}`}
          target="_blank"
          rel="noopener"
          className="text-xs font-semibold uppercase tracking-wider opacity-80 hover:opacity-100"
        >
          REALM RADAR · CANADA{sp.state ? ` · ${STATE_NAMES[sp.state] || sp.state}` : ''} ↗
        </a>
        <span className="text-[10px] opacity-60">Live · {items.length} listings</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm opacity-80 italic">No live listings to show right now.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((l) => {
            const title = l.clean_title || l.raw_title;
            const href = `https://realm-radar-canada.vercel.app/radar/listing/${l.id}`;
            return (
              <li key={l.id} className={`${cardBg} border rounded-lg p-3`}>
                <a href={href} target="_blank" rel="noopener" className="block hover:underline">
                  <p className="text-[11px] uppercase tracking-wider opacity-70">
                    {l.state ? STATE_NAMES[l.state] || l.state : '—'}
                    {l.sale_date ? ` · ${formatDate(l.sale_date)}` : ''}
                    {l.price_text ? ` · ${l.price_text}` : ''}
                  </p>
                  <p className="text-sm font-semibold leading-snug mt-1">{title}</p>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10px] opacity-60 mt-4 text-center">
        Powered by{' '}
        <a href="https://realm-radar-canada.vercel.app/radar" target="_blank" rel="noopener" className="underline">
          REALM Radar
        </a>
      </p>
    </main>
  );
}

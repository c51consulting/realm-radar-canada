'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { STATE_NAMES } from '@/lib/types';

/**
 * USA-3: "States we cover" chip strip rendered just under the hero.
 * Receives live counts from the server component; renders each as a clickable
 * pill that toggles the ?state= filter on the current radar page.
 */
export function StatesCovered({ counts }: { counts: Record<string, number> }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const activeState = sp.get('state') || '';

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const totalListings = entries.reduce((sum, [, n]) => sum + n, 0);

  function makeHref(state: string | null): string {
    const next = new URLSearchParams(sp.toString());
    if (state) next.set('state', state);
    else next.delete('state');
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <section className="mb-10" aria-label="States we cover">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="field-label">States we cover</p>
        <p className="text-xs text-realm-charcoal/60">
          {entries.length} states · {totalListings} live listings
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={makeHref(null)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            !activeState
              ? 'bg-realm-forest text-realm-cream border-realm-forest'
              : 'bg-realm-paper text-realm-charcoal border-realm-line hover:border-realm-moss'
          }`}
        >
          All states
          <span className="opacity-70 font-normal">{totalListings}</span>
        </Link>
        {entries.map(([state, n]) => {
          const active = activeState === state;
          return (
            <Link
              key={state}
              href={makeHref(state)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-realm-forest text-realm-cream border-realm-forest'
                  : 'bg-realm-paper text-realm-charcoal border-realm-line hover:border-realm-moss'
              }`}
            >
              <span>{STATE_NAMES[state] || state}</span>
              <span className="opacity-70 font-normal">{n}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

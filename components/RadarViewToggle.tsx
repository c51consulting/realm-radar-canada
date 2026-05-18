'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function RadarViewToggle({ current }: { current: 'grid' | 'map' }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const setView = useCallback(
    (next: 'grid' | 'map') => {
      const sp = new URLSearchParams(params?.toString() || '');
      if (next === 'map') sp.set('view', 'map');
      else sp.delete('view');
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const base = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition';
  const on = 'bg-realm-forest text-realm-cream shadow-sm';
  const off = 'bg-realm-paper text-realm-charcoal/80 border border-realm-line hover:border-realm-moss';

  return (
    <div className="inline-flex items-center gap-2" role="tablist" aria-label="View mode">
      <button
        type="button"
        role="tab"
        aria-selected={current === 'grid'}
        onClick={() => setView('grid')}
        className={`${base} ${current === 'grid' ? on : off}`}
      >
        <span aria-hidden>▦</span> Grid
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={current === 'map'}
        onClick={() => setView('map')}
        className={`${base} ${current === 'map' ? on : off}`}
      >
        <span aria-hidden>◉</span> Map
      </button>
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';
import type { Listing } from '@/lib/types';

// Leaflet must run client-side only. Dynamic import with ssr:false also keeps
// the heavy bundle out of the initial server payload.
const RadarMapClient = dynamic(() => import('./RadarMapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-2xl border border-realm-line bg-realm-paper">
      <p className="text-sm text-realm-charcoal/70">Loading map…</p>
    </div>
  ),
});

export function RadarMap({ listings }: { listings: Listing[] }) {
  return <RadarMapClient listings={listings} />;
}

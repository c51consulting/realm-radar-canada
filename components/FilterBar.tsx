'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PHASE_1_STATES, CATEGORIES, SOURCE_TYPES, REGIONS, STATE_NAMES } from '@/lib/types';
import { SaveSearchButton } from './SaveSearchButton';

/**
 * Context-aware filter bar.
 *
 * - On /radar (home): full filter set including state + category + region etc.
 *   Updates query params on the current path so filters stay in scope.
 * - On a state landing page (/radar/texas): state is FIXED to that page.
 *   Other filters (category, source, timeframe, sort) refine within that state.
 * - On a category landing page (/radar/equipment): category is FIXED.
 *   Other filters (state, source, timeframe, sort) refine within that category.
 * - On a combo page (/radar/texas/equipment): both state + category fixed.
 *   Only source, timeframe, and sort remain.
 *
 * Filter updates preserve the current pathname instead of jumping to /radar.
 */
export function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  // Inspect the current path to determine which filters are "fixed" by the landing page.
  // Path shape: /radar  or  /radar/<slug>  or  /radar/<state>/<category>
  const parts = pathname.split('/').filter(Boolean); // ['radar', ...]
  const seg1 = parts[1]; // category or state slug (clean)
  const seg2 = parts[2]; // category slug if combo
  const STATIC = new Set(['about', 'submit', 'subscribe', 'affiliate', 'confirm']);

  // Detect locked filters
  const lockedState = detectLockedState(seg1, seg2);
  const lockedCategory = detectLockedCategory(seg1, seg2);

  // Don't render on static utility pages
  if (parts.length >= 2 && STATIC.has(seg1)) return null;

  const region = sp.get('region') || '';
  const sourceType = sp.get('source_type') || '';
  const timeframe = sp.get('timeframe') || '';
  // USA-4: Default to 'ending_soon' when no explicit sort param is present.
  const sort = sp.get('sort') || 'ending_soon';
  // Free filters (only when not locked)
  const stateFilter = sp.get('state') || '';
  const categoryFilter = sp.get('category') || '';
  const queryParam = sp.get('q') || '';

  // Local search state with debounce so the URL only updates after the user pauses.
  const [searchInput, setSearchInput] = useState(queryParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Re-sync local state when URL changes from elsewhere (e.g. clear-all).
  useEffect(() => { setSearchInput(queryParam); }, [queryParam]);
  function onSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      const v = value.trim();
      if (v) next.set('q', v); else next.delete('q');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 400);
  }

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    router.push(pathname);
  }

  const anyActive = stateFilter || region || categoryFilter || sourceType || timeframe || sort || queryParam;

  return (
    <div className="rounded-2xl border border-realm-line bg-realm-paper p-5 mb-8 shadow-card">
      {/* Keyword search */}
      <div className="mb-4">
        <label className="block">
          <span className="field-label block mb-1.5">Search</span>
          <div className="relative">
            <input
              type="search"
              inputMode="search"
              placeholder="Search listings, sources, locations…"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-full border border-realm-line bg-realm-cream pl-11 pr-10 py-2.5 text-sm text-realm-ink focus:outline-none focus:border-realm-forest focus:ring-2 focus:ring-realm-mint transition"
              aria-label="Search listings"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-realm-charcoal/60" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="9" cy="9" r="6" />
              <path d="m17 17-3.5-3.5" strokeLinecap="round" />
            </svg>
            {searchInput && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full text-realm-charcoal/70 hover:bg-realm-line/60 hover:text-realm-forest flex items-center justify-center text-base leading-none"
              >×</button>
            )}
          </div>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* State: shown when not locked; otherwise rendered as a "Scope" chip */}
        {lockedState ? (
          <ScopeChip label="State" value={STATE_NAMES[lockedState] || lockedState} />
        ) : (
          <Select label="State" value={stateFilter} onChange={(v) => update('state', v)} options={[
            { v: '', l: 'All states' },
            ...PHASE_1_STATES.map((s) => ({ v: s, l: STATE_NAMES[s] })),
          ]} />
        )}

        {/* Category: same pattern */}
        {lockedCategory ? (
          <ScopeChip label="Category" value={prettifyCategoryLabel(lockedCategory)} />
        ) : (
          <Select label="Category" value={categoryFilter} onChange={(v) => update('category', v)} options={[
            { v: '', l: 'All categories' },
            ...CATEGORIES.map((c) => ({ v: c.slug, l: c.label })),
          ]} />
        )}

        <Select label="Region" value={region} onChange={(v) => update('region', v)} options={[
          { v: '', l: 'All regions' },
          ...REGIONS.map((r) => ({ v: r.slug, l: r.label })),
        ]} />

        <Select label="Source type" value={sourceType} onChange={(v) => update('source_type', v)} options={[
          { v: '', l: 'All sources' },
          ...SOURCE_TYPES.map((s) => ({ v: s.slug, l: s.label })),
        ]} />

        <Select label="Timeframe" value={timeframe} onChange={(v) => update('timeframe', v)} options={[
          { v: '', l: 'Any time' },
          { v: 'today', l: 'Today' },
          { v: 'week', l: 'This week' },
          { v: 'month', l: 'This month' },
          { v: 'upcoming', l: 'Upcoming' },
          { v: 'recent', l: 'Recently added' },
        ]} />
      </div>

      {/* Sort toggle row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-realm-line/60 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="field-label mr-2">Sort by</span>
          <SortPill label="Ending soon" value="ending_soon" current={sort} onClick={() => update('sort', 'ending_soon')} />
          <SortPill label="Featured" value="featured" current={sort} onClick={() => update('sort', 'featured')} />
          <SortPill label="Newest" value="newest" current={sort} onClick={() => update('sort', 'newest')} />
          <SortPill label="Priority" value="priority" current={sort} onClick={() => update('sort', 'priority')} />
        </div>
        {anyActive && (
          <button
            onClick={clearAll}
            className="text-xs uppercase tracking-wider font-semibold text-realm-charcoal hover:text-realm-forest hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Save-this-search (CROSS-6) — only when the user has narrowed something. */}
      {anyActive && (
        <div className="mt-4 border-t border-realm-line/60 pt-4">
          <SaveSearchButton
            keyword={queryParam || null}
            filters={{
              state: lockedState || stateFilter,
              region,
              category: lockedCategory || categoryFilter,
              source_type: sourceType,
              timeframe,
              sort,
            }}
          />
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <label className="block">
      <span className="field-label block mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-realm-line bg-realm-cream px-4 py-2.5 text-sm text-realm-ink focus:outline-none focus:border-realm-forest focus:ring-2 focus:ring-realm-mint transition"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

// Visual "scope" chip — shows the page-locked filter as non-interactive
// so users understand why they can't change it.
function ScopeChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="field-label block mb-1.5">{label}</span>
      <div className="w-full rounded-full border border-realm-forest/30 bg-realm-mint px-4 py-2.5 text-sm text-realm-forest font-semibold flex items-center gap-2">
        <span aria-hidden>◉</span>
        <span className="truncate">{value}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">Page scope</span>
      </div>
    </div>
  );
}

function SortPill({ label, value, current, onClick }: { label: string; value: string; current: string; onClick: () => void }) {
  const active = (current || '') === value;
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-realm-forest text-realm-cream'
          : 'bg-realm-cream text-realm-charcoal hover:bg-realm-mint hover:text-realm-forest border border-realm-line'
      }`}
    >
      {label}
    </button>
  );
}

// Detect if the landing page locks a state (state slug in seg1).
function detectLockedState(seg1: string | undefined, seg2: string | undefined): string | null {
  const stateSlugToCode: Record<string, string> = {
    texas: 'TX', wisconsin: 'WI', iowa: 'IA', nebraska: 'NE',
  };
  if (seg1 && stateSlugToCode[seg1]) return stateSlugToCode[seg1];
  return null;
}

// Detect if the landing page locks a category.
// On combo (/radar/<state>/<category>), seg2 is the category.
// On category page (/radar/<category>), seg1 is the category.
function detectLockedCategory(seg1: string | undefined, seg2: string | undefined): string | null {
  const categoryCleanSlugs = new Set(['equipment', 'livestock', 'land', 'auctions']);
  if (seg2 && categoryCleanSlugs.has(seg2)) return seg2;
  if (seg1 && categoryCleanSlugs.has(seg1)) return seg1;
  return null;
}

function prettifyCategoryLabel(slug: string): string {
  const map: Record<string, string> = {
    equipment: 'Equipment',
    livestock: 'Livestock',
    land: 'Land & Property',
    auctions: 'Auctions',
  };
  return map[slug] || slug;
}

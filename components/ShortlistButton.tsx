'use client';

import { useShortlist, type ShortlistItem } from './ShortlistProvider';

/**
 * Per-card "compare" toggle. Renders a checkbox-style pill that toggles the
 * listing in/out of the shortlist. Visually neutral until selected, then
 * highlighted in gold.
 */
export function ShortlistToggle({ item }: { item: ShortlistItem }) {
  const { has, add, remove, setOpen } = useShortlist();
  const active = has(item.id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (active) remove(item.id);
        else {
          add(item);
          // Surface the drawer on first add so the user knows where it went.
          setOpen(true);
        }
      }}
      aria-pressed={active}
      aria-label={active ? 'Remove from shortlist' : 'Add to shortlist'}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition border ${
        active
          ? 'bg-realm-gold text-realm-forest border-realm-gold/60'
          : 'bg-realm-cream text-realm-charcoal/80 border-realm-line hover:border-realm-forest hover:text-realm-forest'
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-3 w-3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 4h10v13l-5-3-5 3V4z" strokeLinejoin="round" />
      </svg>
      {active ? 'Shortlisted' : 'Compare'}
    </button>
  );
}

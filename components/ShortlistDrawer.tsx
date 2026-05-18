'use client';

/**
 * CROSS-7 · Comparison drawer.
 *
 * Floating action button + slide-up drawer. The FAB sits bottom-right and
 * shows the current count. Click → drawer with a horizontally-scrollable
 * row of compact cards showing the same fields side-by-side (price,
 * sale_date, source, location, REALM Take).
 */
import { useShortlist } from './ShortlistProvider';
import { useEffect } from 'react';

export function ShortlistDrawer() {
  const { items, remove, clear, open, setOpen } = useShortlist();

  // Close on Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <>
      {/* Floating button */}
      {items.length > 0 && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Open shortlist · ${items.length} item${items.length === 1 ? '' : 's'}`}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-realm-forest text-realm-cream pl-4 pr-5 py-3 text-xs font-semibold uppercase tracking-wider shadow-card-hover hover:bg-realm-deep transition"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M5 3a1 1 0 00-1 1v14l6-3.5L16 18V4a1 1 0 00-1-1H5z" />
          </svg>
          Compare ({items.length})
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-realm-ink/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shortlist compare"
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-7xl rounded-t-3xl border-t border-x border-realm-line bg-realm-paper shadow-card-hover">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-realm-line/70">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-realm-gold">Shortlist</p>
              <h2 className="font-serif text-lg text-realm-ink">
                {items.length === 0 ? 'Nothing in your shortlist yet' : `Comparing ${items.length} listing${items.length === 1 ? '' : 's'}`}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs uppercase tracking-wider font-semibold text-realm-charcoal hover:text-realm-rust hover:underline"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close shortlist"
                className="rounded-full bg-realm-cream border border-realm-line text-realm-charcoal hover:text-realm-forest hover:border-realm-forest h-8 w-8 inline-flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>

          {/* Body */}
          {items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-realm-charcoal/70">
              Tick <strong>Compare</strong> on any listing card to add it here. Shortlists are saved on this device.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-3 p-4 min-w-max">
                {items.map((it) => (
                  <article
                    key={it.id}
                    className="w-72 shrink-0 rounded-xl border border-realm-line bg-white shadow-sm flex flex-col"
                  >
                    <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2 border-b border-realm-line/60">
                      <p className="font-serif text-sm text-realm-ink leading-snug line-clamp-2 flex-1">
                        {it.href ? (
                          <a href={it.href} className="hover:text-realm-forest hover:underline">{it.title}</a>
                        ) : it.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        aria-label="Remove from shortlist"
                        className="text-realm-charcoal/60 hover:text-realm-rust text-lg leading-none -mt-0.5"
                      >
                        ×
                      </button>
                    </div>
                    <dl className="px-3 py-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                      <Row label="Price" value={it.price_text} />
                      <Row label="Sale date" value={it.sale_date} />
                      <Row label="Location" value={it.state} />
                      <Row label="Source" value={it.source_name} truncate />
                    </dl>
                    {it.realm_take && (
                      <p className="px-3 pb-2 text-[11px] leading-relaxed border-l-2 border-realm-gold ml-3 my-1 pl-2 text-realm-charcoal line-clamp-3">
                        <span className="font-semibold text-realm-forest">REALM Take. </span>
                        {it.realm_take}
                      </p>
                    )}
                    <div className="mt-auto px-3 py-2 border-t border-realm-line/60 flex gap-2">
                      {it.href && (
                        <a href={it.href} className="flex-1 text-center text-[11px] uppercase tracking-wider font-semibold rounded-full bg-realm-forest text-realm-cream py-1.5 hover:bg-realm-deep">
                          Details
                        </a>
                      )}
                      {it.source_url && (
                        <a
                          href={it.source_url}
                          target="_blank"
                          rel="noopener nofollow ugc"
                          className="flex-1 text-center text-[11px] uppercase tracking-wider font-semibold rounded-full border border-realm-forest text-realm-forest py-1.5 hover:bg-realm-mint"
                        >
                          Source ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, truncate }: { label: string; value?: string | null; truncate?: boolean }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-wider text-realm-charcoal/60">{label}</dt>
      <dd className={`text-realm-ink ${truncate ? 'truncate' : ''}`}>{value || '—'}</dd>
    </>
  );
}

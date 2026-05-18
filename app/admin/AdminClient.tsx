'use client';
import { useEffect, useMemo, useState } from 'react';

type Item = {
  id: string;
  clean_title: string | null;
  raw_title: string;
  state: string | null;
  category: string | null;
  priority_score: number | null;
  confidence_score: number | null;
  realm_take: string | null;
  source_url: string;
  source_name: string;
  risk_flags: string[] | null;
  sale_date: string | null;
  price_text: string | null;
  published_at: string | null;
  featured: boolean | null;
};

type Counts = Record<string, number>;

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'ai_reviewed', label: 'AI reviewed' },
  { key: 'new', label: 'New' },
  { key: 'published', label: 'Published' },
  { key: 'archived', label: 'Archived' },
  { key: 'rejected', label: 'Rejected' },
];

export function AdminClient() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('ai_reviewed');
  const [stateF, setStateF] = useState('');
  const [categoryF, setCategoryF] = useState('');
  const [sourceF, setSourceF] = useState('');
  const [minPriority, setMinPriority] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('radar_admin') || '' : '';
    if (saved) setToken(saved);
  }, []);

  async function load() {
    setLoading(true); setErr(''); setSelected(new Set());
    try {
      const params = new URLSearchParams({ status, limit: '500' });
      if (stateF) params.set('state', stateF);
      if (categoryF) params.set('category', categoryF);
      if (sourceF) params.set('source', sourceF);
      if (minPriority > 0) params.set('min_priority', String(minPriority));
      const res = await fetch(`/api/admin/listings?${params.toString()}`, { headers: { 'x-admin-token': token } });
      if (!res.ok) { setErr(res.status === 401 ? 'Auth failed' : `Error: ${res.status}`); setItems([]); setAuthed(false); return; }
      const j = await res.json();
      setItems(j.items || []);
      setCounts(j.counts || {});
      setAuthed(true);
      localStorage.setItem('radar_admin', token);
    } catch (e: any) {
      setErr(e.message || 'Network error');
    } finally { setLoading(false); }
  }

  async function bulk(action: 'publish' | 'archive' | 'reject' | 'feature' | 'unpublish', featured?: boolean) {
    const ids = Array.from(selected);
    if (ids.length === 0) { setToast('Select at least one'); return; }
    if (ids.length > 50 && !window.confirm(`Apply '${action}' to ${ids.length} listings?`)) return;
    setBusy(true); setToast('');
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'x-admin-token': token, 'content-type': 'application/json' },
        body: JSON.stringify({ ids, action, featured }),
      });
      const j = await res.json();
      if (!res.ok) { setToast(`Failed: ${j.error || res.status}`); return; }
      setToast(`${action === 'feature' ? (featured ? 'Featured' : 'Unfeatured') : action} ${j.updated} listing${j.updated === 1 ? '' : 's'}`);
      // After publish/reject/archive/unpublish the listings move out of the current view; reload
      if (action !== 'feature') await load();
      else {
        // Locally toggle featured flag
        setItems((cur) => cur.map((it) => selected.has(it.id) ? { ...it, featured: !!featured } : it));
        setSelected(new Set());
      }
    } finally { setBusy(false); }
  }

  async function single(id: string, action: 'publish' | 'archive' | 'reject') {
    setBusy(true);
    try {
      await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'x-admin-token': token, 'content-type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      setItems((x) => x.filter((i) => i.id !== id));
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    } finally { setBusy(false); }
  }

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAll() { setSelected(new Set(items.map((i) => i.id))); }
  function selectNone() { setSelected(new Set()); }
  function selectHighConfidence() {
    // Acceptable: ≥ 60 priority, ≥ 75 confidence, no critical risk flags (scam/copyright/expired/duplicate).
    // Common 'missing_date' / 'missing_location' flags are tolerable since most public auctions have full details on the source page.
    const CRITICAL = new Set(['scam', 'copyright', 'expired', 'duplicate', 'private_sale', 'private', 'spam', 'broken_link']);
    setSelected(new Set(items.filter((i) =>
      (i.priority_score ?? 0) >= 60
      && (i.confidence_score ?? 0) >= 75
      && !(i.risk_flags || []).some((f) => CRITICAL.has(f))
    ).map((i) => i.id)));
  }

  const allChecked = items.length > 0 && selected.size === items.length;
  const someChecked = selected.size > 0 && !allChecked;

  const uniqueStates = useMemo(() => Array.from(new Set(items.map((i) => i.state).filter(Boolean))).sort() as string[], [items]);
  const uniqueCategories = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort() as string[], [items]);

  if (!authed) {
    return (
      <div className="mt-6 max-w-md space-y-3">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Admin token"
          className="w-full rounded-lg border border-realm-line px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && token && load()}
        />
        <button onClick={load} disabled={!token || loading} className="rounded-full bg-realm-forest px-5 py-2 text-realm-cream text-sm font-semibold disabled:opacity-50">
          {loading ? 'Loading…' : 'Sign in'}
        </button>
        {err && <p className="text-sm text-realm-rust">{err}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Status tabs with counts */}
      <div className="flex flex-wrap gap-1.5 mb-4 border-b border-realm-line pb-3">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setStatus(t.key); setTimeout(load, 0); }}
            className={`text-sm px-3 py-1.5 rounded-full transition ${status === t.key ? 'bg-realm-forest text-realm-cream' : 'bg-realm-paper border border-realm-line text-realm-charcoal hover:border-realm-forest'}`}
          >
            {t.label} <span className="opacity-70">{counts[t.key] ?? '—'}</span>
          </button>
        ))}
        <button onClick={() => { setToken(''); setAuthed(false); localStorage.removeItem('radar_admin'); }} className="ml-auto text-xs text-realm-charcoal/70 hover:text-realm-rust">Sign out</button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-2 mb-4 text-sm">
        <Field label="State">
          <select value={stateF} onChange={(e) => setStateF(e.target.value)} className="rounded border border-realm-line px-2 py-1 w-24">
            <option value="">All</option>
            {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select value={categoryF} onChange={(e) => setCategoryF(e.target.value)} className="rounded border border-realm-line px-2 py-1 w-36">
            <option value="">All</option>
            {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Source contains">
          <input value={sourceF} onChange={(e) => setSourceF(e.target.value)} placeholder="e.g. PowellAuc" className="rounded border border-realm-line px-2 py-1 w-40" />
        </Field>
        <Field label="Min priority">
          <input type="number" min={0} max={100} value={minPriority} onChange={(e) => setMinPriority(parseInt(e.target.value, 10) || 0)} className="rounded border border-realm-line px-2 py-1 w-20" />
        </Field>
        <button onClick={load} disabled={loading} className="rounded-full bg-realm-forest text-realm-cream px-4 py-1.5 text-sm font-semibold disabled:opacity-50">
          {loading ? 'Loading…' : 'Apply filters'}
        </button>
        <span className="text-xs text-realm-charcoal/70 ml-auto">Showing {items.length} {items.length === 500 ? '(capped at 500)' : ''}</span>
      </div>

      {/* Sticky bulk action bar */}
      <div className="sticky top-0 z-10 -mx-2 px-2 py-2 mb-3 flex flex-wrap items-center gap-2 bg-realm-cream/95 backdrop-blur border-b border-realm-line">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => { if (el) el.indeterminate = someChecked; }}
            onChange={(e) => (e.target.checked ? selectAll() : selectNone())}
            className="h-4 w-4 accent-realm-forest"
          />
          <span className="font-semibold">{selected.size}</span> selected
        </label>
        <button onClick={selectHighConfidence} className="text-xs rounded-full border border-realm-line bg-realm-paper px-2.5 py-1 hover:border-realm-forest">Select safe-to-publish (P≥60 C≥75 no critical flags)</button>
        {status === 'ai_reviewed' || status === 'new' ? (
          <>
            <button onClick={() => bulk('publish')} disabled={busy || selected.size === 0} className="rounded-full bg-realm-forest text-realm-cream px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
              ✓ Publish ({selected.size})
            </button>
            <button onClick={() => bulk('archive')} disabled={busy || selected.size === 0} className="rounded-full border border-realm-line bg-realm-paper px-3 py-1.5 text-xs disabled:opacity-40">Archive</button>
            <button onClick={() => bulk('reject')} disabled={busy || selected.size === 0} className="rounded-full border border-realm-rust text-realm-rust px-3 py-1.5 text-xs disabled:opacity-40">Reject</button>
          </>
        ) : null}
        {status === 'published' ? (
          <>
            <button onClick={() => bulk('feature', true)} disabled={busy || selected.size === 0} className="rounded-full bg-realm-gold text-realm-ink px-3 py-1.5 text-xs font-semibold disabled:opacity-40">★ Feature</button>
            <button onClick={() => bulk('feature', false)} disabled={busy || selected.size === 0} className="rounded-full border border-realm-line bg-realm-paper px-3 py-1.5 text-xs disabled:opacity-40">Unfeature</button>
            <button onClick={() => bulk('unpublish')} disabled={busy || selected.size === 0} className="rounded-full border border-realm-line bg-realm-paper px-3 py-1.5 text-xs disabled:opacity-40">Unpublish</button>
            <button onClick={() => bulk('archive')} disabled={busy || selected.size === 0} className="rounded-full border border-realm-line bg-realm-paper px-3 py-1.5 text-xs disabled:opacity-40">Archive</button>
          </>
        ) : null}
        {toast && <span className="text-xs text-realm-forest font-semibold ml-2">{toast}</span>}
      </div>

      {err && <p className="text-sm text-realm-rust mb-2">{err}</p>}

      {items.length === 0 && !loading && (
        <p className="text-realm-charcoal/70 text-sm p-6 bg-realm-paper rounded-2xl">No items match the current filters in status &ldquo;{status}&rdquo;.</p>
      )}

      <div className="space-y-2">
        {items.map((i) => (
          <article
            key={i.id}
            className={`rounded-xl border bg-realm-paper p-3 transition cursor-pointer ${selected.has(i.id) ? 'border-realm-forest bg-realm-mint/20' : 'border-realm-line hover:border-realm-charcoal/40'}`}
            onClick={(e) => {
              // Don't toggle when clicking an interactive child
              const t = e.target as HTMLElement;
              if (t.closest('a,button,input')) return;
              toggle(i.id);
            }}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(i.id)}
                onChange={() => toggle(i.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 h-4 w-4 accent-realm-forest"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-1">
                  {i.category && <span className="px-1.5 py-0.5 rounded bg-realm-mint/40 text-realm-forest font-medium">{i.category}</span>}
                  {i.state && <span className="px-1.5 py-0.5 rounded bg-realm-paper border border-realm-line text-realm-charcoal">{i.state}</span>}
                  <span className="px-1.5 py-0.5 rounded bg-realm-ink text-realm-cream font-mono">P {i.priority_score ?? '—'} · C {i.confidence_score ?? '—'}</span>
                  {i.featured && <span className="px-1.5 py-0.5 rounded bg-realm-gold/30 text-realm-ink font-semibold">★ Featured</span>}
                  {(i.risk_flags || []).map((f) => (
                    <span key={f} className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900">⚠ {f}</span>
                  ))}
                  {i.sale_date && <span className="text-realm-charcoal/70">📅 {i.sale_date}</span>}
                  {i.price_text && <span className="text-realm-charcoal/70">💰 {i.price_text}</span>}
                </div>
                <h3 className="font-serif text-base leading-snug text-realm-ink truncate">{i.clean_title || i.raw_title}</h3>
                <p className="text-xs text-realm-charcoal/70 mt-0.5">{i.source_name}</p>
                {i.realm_take && (
                  <p className="text-xs mt-1.5 border-l-2 border-realm-gold pl-2 text-realm-charcoal/85 line-clamp-2">{i.realm_take}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0 items-end" onClick={(e) => e.stopPropagation()}>
                <a href={i.source_url} target="_blank" rel="noopener" className="text-xs text-realm-forest hover:underline whitespace-nowrap">Source ↗</a>
                {(status === 'ai_reviewed' || status === 'new') && (
                  <div className="flex gap-1">
                    <button onClick={() => single(i.id, 'publish')} disabled={busy} className="rounded-full bg-realm-forest text-realm-cream px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40">Publish</button>
                    <button onClick={() => single(i.id, 'archive')} disabled={busy} className="rounded-full border border-realm-line bg-realm-paper px-2.5 py-1 text-[11px] disabled:opacity-40">Archive</button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-realm-charcoal/70">{label}</span>
      {children}
    </label>
  );
}

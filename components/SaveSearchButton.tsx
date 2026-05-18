'use client';

import { useState } from 'react';

/**
 * "Save this search" — opens a small inline dialog asking for an email,
 * then POSTs the current filter snapshot to /api/saved-search. Server sends
 * a confirmation email; user lands on /radar/confirm to activate.
 *
 * The button is rendered inside FilterBar (USA/UG/IN) or the equivalent jobs
 * filter component, but is generic — pass the filter object explicitly.
 */
export function SaveSearchButton({
  filters,
  keyword,
  disabled,
}: {
  filters: Record<string, unknown>;
  keyword?: string | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [cadence, setCadence] = useState<'weekly' | 'daily'>('weekly');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/saved-search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), keyword: keyword || null, filters, cadence }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(data?.error || 'Could not save this search.');
        return;
      }
      setStatus('sent');
      setMessage(
        data?.description
          ? `Check your inbox to confirm alerts for: ${data.description}.`
          : 'Check your inbox to confirm.',
      );
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Network error.');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-full border border-realm-forest/40 bg-realm-mint/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-realm-forest hover:bg-realm-mint hover:border-realm-forest disabled:opacity-50 disabled:cursor-not-allowed transition"
        aria-label="Save this search and get email alerts"
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 4h14v13l-7-4-7 4V4z" strokeLinejoin="round" />
        </svg>
        Save search · email me matches
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-2xl border border-realm-forest/30 bg-realm-paper p-4 shadow-card"
      aria-label="Save this search"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-realm-forest mb-2">
        Save this search
      </p>
      <p className="text-sm text-realm-ink/80 mb-3">
        We&rsquo;ll email you when new listings match your current filters
        {keyword ? <> and the keyword <strong>“{keyword}”</strong></> : null}. Double-opt-in: you&rsquo;ll get a confirmation link first.
      </p>

      {status !== 'sent' && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[200px]">
            <span className="block text-[11px] uppercase tracking-wider text-realm-charcoal/70 mb-1">Email</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-full border border-realm-line bg-white px-4 py-2 text-sm focus:outline-none focus:border-realm-forest focus:ring-2 focus:ring-realm-mint"
            />
          </label>
          <label>
            <span className="block text-[11px] uppercase tracking-wider text-realm-charcoal/70 mb-1">Cadence</span>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as 'weekly' | 'daily')}
              className="rounded-full border border-realm-line bg-white px-3 py-2 text-sm focus:outline-none focus:border-realm-forest"
            >
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={status === 'sending'}
            className="rounded-full bg-realm-forest text-realm-cream px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-realm-forest/90 disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending…' : 'Send confirmation'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs uppercase tracking-wider text-realm-charcoal hover:text-realm-forest"
          >
            Cancel
          </button>
        </div>
      )}

      {status === 'error' && message && (
        <p className="mt-3 text-sm text-realm-rust">{message}</p>
      )}
      {status === 'sent' && (
        <p className="mt-1 text-sm text-realm-forest">{message}</p>
      )}
    </form>
  );
}

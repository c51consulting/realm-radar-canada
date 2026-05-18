'use client';
import { useState } from 'react';
import { CATEGORIES, PHASE_1_STATES, STATE_NAMES } from '@/lib/types';

// 13 Canadian provinces + territories (codes only — order matches PHASE_1_STATES).
const CA_PROVINCES = PHASE_1_STATES;

export function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [states, setStates] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cadence, setCadence] = useState<'weekly' | 'daily'>('weekly');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'pending_manual' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const toggle = (val: string, list: string[], set: (v: string[]) => void) => {
    set(list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending'); setError(null);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, states, categories, cadence }),
      });
      const j = await res.json().catch(() => ({}));
      // 202 = saved but email send not wired up (env missing). Honest message.
      if (res.status === 202 && j.warning === 'email_not_configured') {
        setStatus('pending_manual');
        return;
      }
      if (!res.ok) throw new Error(j.error || 'Failed');
      setStatus('ok');
    } catch (e: any) { setError(e.message); setStatus('error'); }
  }

  if (status === 'ok') {
    return (
      <div className="mt-8 rounded-2xl border border-realm-line bg-white p-6">
        <h2 className="font-serif text-2xl">Check your inbox.</h2>
        <p className="mt-2 text-realm-ink/70">
          We&rsquo;ve sent a confirmation link to <strong>{email}</strong>. Click it to activate your
          subscription. The first Friday briefing arrives after you confirm.
        </p>
        <p className="mt-3 text-sm text-realm-ink/55">
          Not seeing it? Check spam, or email{' '}
          <a className="text-realm-moss underline" href="mailto:radar@realmgroup.global">
            radar@realmgroup.global
          </a>
          .
        </p>
      </div>
    );
  }

  if (status === 'pending_manual') {
    return (
      <div className="mt-8 rounded-2xl border border-realm-line bg-white p-6">
        <h2 className="font-serif text-2xl">Saved — we&rsquo;ll follow up manually.</h2>
        <p className="mt-2 text-realm-ink/70">
          Your details for <strong>{email}</strong> are on file. Our automated confirmation isn&rsquo;t
          live yet, so someone from REALM will reach out to confirm directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-realm-line bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-realm-moss"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Provinces &amp; territories you care about <span className="text-realm-ink/50 font-normal">(optional — leave blank for all)</span></label>
        <div className="flex flex-wrap gap-2">
          {CA_PROVINCES.map((s) => (
            <button type="button" key={s} onClick={() => toggle(s, states, setStates)}
              title={STATE_NAMES[s]}
              className={`px-3 py-1 rounded-full border text-xs transition ${states.includes(s) ? 'bg-realm-moss text-realm-paper border-realm-moss' : 'bg-white border-realm-line text-realm-ink/70'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Categories <span className="text-realm-ink/50 font-normal">(optional)</span></label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button type="button" key={c.slug} onClick={() => toggle(c.slug, categories, setCategories)}
              className={`px-3 py-1.5 rounded-full border text-xs transition ${categories.includes(c.slug) ? 'bg-realm-moss text-realm-paper border-realm-moss' : 'bg-white border-realm-line text-realm-ink/70'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Cadence</label>
        <div className="flex gap-2">
          {(['weekly', 'daily'] as const).map((c) => (
            <button type="button" key={c} onClick={() => setCadence(c)}
              className={`px-4 py-2 rounded-full border text-sm capitalize ${cadence === c ? 'bg-realm-moss text-realm-paper border-realm-moss' : 'bg-white border-realm-line'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={status === 'sending'}
        className="rounded-full bg-realm-moss text-realm-paper px-6 py-2.5 text-sm font-medium disabled:opacity-50">
        {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
      </button>
      {error && <p className="text-realm-rust text-sm">{error}</p>}
    </form>
  );
}

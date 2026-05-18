'use client';
import { useState } from 'react';
import { PHASE_1_STATES, CATEGORIES, STATE_NAMES } from '@/lib/types';

export function SubmitForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setStatus('error'); setErrorMsg((await res.json()).error || 'Submission failed'); return; }
      setStatus('sent');
    } catch (e: any) {
      setStatus('error'); setErrorMsg(e.message);
    }
  }

  if (status === 'sent') {
    return (
      <div className="mt-8 rounded-2xl border border-realm-moss bg-realm-moss/5 p-6">
        <h2 className="font-serif text-xl">Thanks — submission received.</h2>
        <p className="mt-2 text-realm-ink/80">A REALM editor will review it within 24 hours. We&rsquo;ll email you when it&rsquo;s live or if we need more detail.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <Field label="Business name" name="business_name" required />
      <Field label="Contact name" name="contact_name" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone" name="phone" type="tel" />
      </div>
      <Field label="Website" name="website" type="url" placeholder="https://" />
      <Field label="Listing URL" name="listing_url" type="url" required placeholder="https://" />
      <div className="grid sm:grid-cols-2 gap-4">
        <SelectField label="State" name="state" options={[{ v: '', l: 'Select' }, ...PHASE_1_STATES.map(s => ({ v: s, l: STATE_NAMES[s] }))]} />
        <SelectField label="Category" name="category" options={[{ v: '', l: 'Select' }, ...CATEGORIES.map(c => ({ v: c.slug, l: c.label }))]} />
      </div>
      <Field label="Sale date" name="sale_date" type="date" />
      <label className="block">
        <span className="block text-sm font-medium mb-1">Description</span>
        <textarea name="description" rows={4} className="w-full rounded-lg border border-realm-line px-3 py-2 text-sm" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="permission_to_feature" value="true" className="mt-1" />
        <span>I confirm I have permission for REALM Radar to feature this listing.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="paid_feature_interest" value="true" className="mt-1" />
        <span>I&rsquo;m interested in paid featured placement (newsletter + state page top).</span>
      </label>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="self-start rounded-full bg-realm-moss px-6 py-2.5 text-realm-paper text-sm font-medium disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Submit listing'}
      </button>
      {status === 'error' && <p className="text-sm text-realm-rust">{errorMsg}</p>}
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}{props.required && <span className="text-realm-rust"> *</span>}</span>
      <input {...rest} className="w-full rounded-lg border border-realm-line px-3 py-2 text-sm" />
    </label>
  );
}
function SelectField({ label, name, options }: { label: string; name: string; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <select name={name} className="w-full rounded-lg border border-realm-line bg-white px-3 py-2 text-sm">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

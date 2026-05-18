import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Confirm subscription — REALM Radar Canada',
  description: 'Confirm your REALM Radar subscription.',
};

type Outcome =
  | { kind: 'ok'; email: string; what: 'subscription' | 'saved_search'; description?: string }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

function describeFilters(keyword: string | null | undefined, filters: Record<string, unknown> | null): string {
  const parts: string[] = [];
  if (keyword) parts.push(`“${keyword}”`);
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v == null || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      const label = k.replace(/_/g, ' ');
      parts.push(`${label}: ${Array.isArray(v) ? v.join(', ') : v}`);
    }
  }
  return parts.length ? parts.join(' · ') : 'all listings';
}

async function confirmByToken(token: string | undefined, type: string | undefined): Promise<Outcome> {
  if (!token) return { kind: 'missing' };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return { kind: 'invalid' };
  }

  const sb = supabaseAdmin();

  // Saved-search confirmation path.
  if (type === 'saved_search') {
    const { data: existing, error: fetchErr } = await sb
      .from('saved_searches')
      .select('id, email, keyword, filters, confirmed_at')
      .eq('confirm_token', token)
      .maybeSingle();
    if (fetchErr) return { kind: 'error', message: fetchErr.message };
    if (!existing) return { kind: 'invalid' };
    if (existing.confirmed_at) return { kind: 'already' };

    const { error: updateErr } = await sb
      .from('saved_searches')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updateErr) return { kind: 'error', message: updateErr.message };
    return {
      kind: 'ok',
      email: existing.email as string,
      what: 'saved_search',
      description: describeFilters(existing.keyword as string | null, existing.filters as Record<string, unknown> | null),
    };
  }

  // Subscriber confirmation (existing flow).
  const { data: existing, error: fetchErr } = await sb
    .from('subscribers')
    .select('email, confirmed_at')
    .eq('confirm_token', token)
    .maybeSingle();

  if (fetchErr) return { kind: 'error', message: fetchErr.message };
  if (!existing) return { kind: 'invalid' };
  if (existing.confirmed_at) return { kind: 'already' };

  const { error: updateErr } = await sb
    .from('subscribers')
    .update({
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .eq('confirm_token', token);

  if (updateErr) return { kind: 'error', message: updateErr.message };
  return { kind: 'ok', email: existing.email as string, what: 'subscription' };
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; type?: string }>;
}) {
  const { token, type } = await searchParams;
  const outcome = await confirmByToken(token, type);

  return (
    <div className="max-w-xl mx-auto">
      <p className="text-realm-rust text-sm font-medium uppercase tracking-wider">
        {type === 'saved_search' ? 'Saved search' : 'Subscription'}
      </p>
      <h1 className="font-serif text-4xl mt-2">
        {outcome.kind === 'ok' && 'You are confirmed.'}
        {outcome.kind === 'already' && 'Already confirmed.'}
        {outcome.kind === 'invalid' && 'That link is no longer valid.'}
        {outcome.kind === 'missing' && 'No confirmation token.'}
        {outcome.kind === 'error' && 'Something went wrong.'}
      </h1>

      <div className="mt-6 rounded-2xl border border-realm-line bg-white p-6">
        {outcome.kind === 'ok' && outcome.what === 'subscription' && (
          <>
            <p className="text-realm-ink/80 leading-relaxed">
              <strong>{outcome.email}</strong> is now subscribed to REALM Radar Canada. The weekly briefing
              lands Fridays.
            </p>
            <p className="mt-3 text-realm-ink/70 text-sm">
              Want to change your states, categories, or cadence? Re-submit on the{' '}
              <a className="text-realm-moss underline" href="/radar/subscribe">subscribe page</a> with
              the same email.
            </p>
          </>
        )}
        {outcome.kind === 'ok' && outcome.what === 'saved_search' && (
          <>
            <p className="text-realm-ink/80 leading-relaxed">
              <strong>{outcome.email}</strong> will now get email alerts when new listings match:
            </p>
            <p className="mt-3 px-3 py-2 rounded-md bg-realm-paper border-l-2 border-realm-forest text-realm-ink/80 text-sm">
              {outcome.description}
            </p>
            <p className="mt-3 text-realm-ink/70 text-sm">
              Alerts go out with the weekly briefing on Fridays. You can save more searches anytime
              from the <a className="text-realm-moss underline" href="/radar">radar page</a>.
            </p>
          </>
        )}
        {outcome.kind === 'already' && (
          <p className="text-realm-ink/80 leading-relaxed">
            This is already active. You don&rsquo;t need to do anything else.
          </p>
        )}
        {(outcome.kind === 'invalid' || outcome.kind === 'missing') && (
          <p className="text-realm-ink/80 leading-relaxed">
            The link may have been used already, expired, or been mistyped. Head to the{' '}
            <a className="text-realm-moss underline" href="/radar/subscribe">subscribe page</a> to
            request a fresh confirmation email.
          </p>
        )}
        {outcome.kind === 'error' && (
          <p className="text-realm-rust leading-relaxed">
            We hit a database error confirming this. Please email{' '}
            <a className="text-realm-moss underline" href="mailto:radar@realmgroup.global">
              radar@realmgroup.global
            </a>{' '}
            and we&rsquo;ll confirm you manually.
          </p>
        )}
      </div>

      <p className="mt-6 text-sm">
        <a className="text-realm-moss hover:underline" href="/radar">← Back to the radar</a>
      </p>
    </div>
  );
}

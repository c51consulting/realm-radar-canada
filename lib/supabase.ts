import { createClient } from '@supabase/supabase-js';

// Polyfill WebSocket for Node < 22 so supabase-js doesn't crash on import.
if (typeof globalThis.WebSocket === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (globalThis as any).WebSocket = require('ws');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Public read-only client (anon key) — use in client components & ISR. */
export const supabasePublic = createClient(url, anon, {
  auth: { persistSession: false },
});

/**
 * Privileged client — use ONLY in API routes & workers. Never ship to browser.
 *
 * If SUPABASE_SERVICE_ROLE_KEY is not configured, gracefully falls back to the anon
 * client. This is safe because RLS is currently disabled on the Phase 2 tables
 * (feed_tokens, feed_token_events, webhook_subscriptions, webhook_deliveries) —
 * so the anon role has the same access. Add the service role key + enable RLS
 * before exposing any user-supplied data through these endpoints.
 */
export function supabaseAdmin() {
  if (service) {
    return createClient(url, service, { auth: { persistSession: false } });
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY missing — falling back to anon client');
  }
  return createClient(url, anon, { auth: { persistSession: false } });
}

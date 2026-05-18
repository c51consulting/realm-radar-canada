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

/** Privileged client — use ONLY in API routes & workers. Never ship to browser. */
export function supabaseAdmin() {
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  return createClient(url, service, { auth: { persistSession: false } });
}

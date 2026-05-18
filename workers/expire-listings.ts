/** Nightly: archive listings past sale_date or expiry_date. Wraps the SQL function. */
import { supabaseAdmin } from '../lib/supabase';
import { startRun, finishRun } from './_shared';

async function run() {
  const runId = await startRun('expire-listings');
  const sb = supabaseAdmin();
  try {
    const { data, error } = await sb.rpc('expire_past_listings');
    if (error) throw error;
    const affected = (data as number) ?? 0;
    await finishRun(runId, 'success', affected, [], { archived: affected });
    console.log(`Expired ${affected} listings`);
  } catch (e: any) {
    await finishRun(runId, 'error', 0, [e.message]);
    console.error(e);
    process.exit(1);
  }
}

run();

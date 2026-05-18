import { supabaseAdmin } from '../lib/supabase';

export async function startRun(worker: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('worker_runs')
    .insert({ worker, status: 'running' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as number;
}

export async function finishRun(
  id: number,
  status: 'success' | 'error',
  itemsProcessed = 0,
  errors: string[] = [],
  metadata: Record<string, unknown> = {}
) {
  const sb = supabaseAdmin();
  await sb
    .from('worker_runs')
    .update({
      finished_at: new Date().toISOString(),
      status,
      items_processed: itemsProcessed,
      errors,
      metadata,
    })
    .eq('id', id);
}

export function authOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
}

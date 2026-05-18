/**
 * Picks up listings with status='new', runs AI enrichment, writes back fields and new status.
 * Runs on a cron (e.g. every 5 min on Railway). Idempotent — only acts on status='new'.
 */
import { supabaseAdmin } from '../lib/supabase';
import { enrichListing, decideStatus } from '../lib/enrichment';
import { startRun, finishRun } from './_shared';

const BATCH_SIZE = 25;

async function run() {
  const runId = await startRun('enrichment-queue');
  const sb = supabaseAdmin();
  const errors: string[] = [];
  let processed = 0, ok = 0, fail = 0;

  const { data: pending, error } = await sb
    .from('listings')
    .select('id, raw_title, raw_snippet, source_url, source_name, date_found')
    .eq('status', 'new')
    .order('date_found', { ascending: true })
    .limit(BATCH_SIZE);
  if (error) {
    await finishRun(runId, 'error', 0, [error.message]);
    return;
  }

  for (const row of pending || []) {
    processed++;
    try {
      const e = await enrichListing({
        title: row.raw_title,
        snippet: row.raw_snippet,
        url: row.source_url,
        source_name: row.source_name,
        found_date: row.date_found,
      });
      const newStatus = decideStatus(e);
      const expiry = e.sale_date ? addDays(e.sale_date, 1) : null;
      const update: Record<string, unknown> = {
        clean_title: e.clean_title,
        summary: e.summary,
        realm_take: e.realm_take,
        newsletter_snippet: e.newsletter_snippet,
        linkedin_snippet: e.linkedin_snippet,
        state: e.state && e.state !== 'Unknown' ? e.state.toUpperCase().slice(0, 2) : null,
        region: e.region === 'unknown' ? null : e.region,
        category: e.category === 'unknown' ? null : e.category,
        subcategory: e.subcategory,
        source_type: e.source_type,
        sale_date: isIsoDate(e.sale_date) ? e.sale_date : null,
        expiry_date: expiry,
        priority_score: e.priority_score,
        confidence_score: e.confidence_score,
        target_audience: e.target_audience,
        risk_flags: e.risk_flags,
        primary_cta: e.primary_cta,
        secondary_cta: e.secondary_cta,
        status: newStatus,
      };
      const { error: upErr } = await sb.from('listings').update(update).eq('id', row.id);
      if (upErr) { fail++; errors.push(`${row.id}: ${upErr.message}`); }
      else ok++;
    } catch (e: any) {
      fail++;
      errors.push(`${row.id}: ${e.message}`);
      await sb.from('listings').update({ status: 'rejected', notes: `enrichment failed: ${e.message}` }).eq('id', row.id);
    }
  }

  await finishRun(runId, errors.length ? 'error' : 'success', processed, errors, { ok, fail });
  console.log(`Enrichment: processed=${processed} ok=${ok} fail=${fail}`);
}

function isIsoDate(s: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function addDays(iso: string, days: number): string {
  const d = new Date(iso); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}

run().catch(async (e) => { console.error(e); process.exit(1); });

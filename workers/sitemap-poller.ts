/**
 * Sitemap poller — Stream 1 direct-source ingest.
 *
 * For each `sources` row where kind='sitemap', fetch the sitemap index,
 * follow children that have been modified recently, extract <url> entries,
 * pass each through the source-specific URL parser, and dedup-insert via
 * ingestRaw().
 *
 * Politeness:
 *   - REALM-Radar User-Agent with contact URL
 *   - 1.5s gap between every HTTP call (per worker run, single-threaded)
 *   - Per-source URL cap (config.max_urls_per_run, default 500)
 *   - Honours `lastmod` filter — skips child sitemaps unchanged since last run
 *
 * Ethics:
 *   - Links + metadata only. We never store full descriptions or images.
 *   - Skip any response that smells like a CAPTCHA / WAF block page.
 */
import { gunzipSync } from 'node:zlib';
import { supabaseAdmin } from '../lib/supabase';
import { startRun, finishRun } from './_shared';
import { ingestRaw } from './ingest';
import { parseByName, PHASE_1_STATES, type ParserName } from '../lib/parseListingUrl';

const UA =
  'REALM-Radar/1.0 (+https://realm-radar-canada.vercel.app; contact: radar@realmgroup.global)';
const FETCH_TIMEOUT_MS = 20_000;
const POLITENESS_GAP_MS = 1500;
const DEFAULT_MAX_URLS_PER_RUN = 500;
const LASTMOD_MAX_AGE_DAYS = 7;

// --------- helpers ---------
function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function looksLikeBlockPage(body: string): boolean {
  const head = body.slice(0, 4096).toLowerCase();
  return (
    head.includes('pardon our interruption') ||
    head.includes('distil_referrer') ||
    head.includes('captcha') ||
    head.includes('please verify you are a human') ||
    head.includes('access denied') ||
    head.includes('cloudflare') && head.includes('attention required')
  );
}

async function fetchWithTimeout(url: string): Promise<{ body: string; status: number } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept': 'application/xml,text/xml,*/*' },
      signal: ctrl.signal,
    });
    const status = res.status;
    if (!res.ok) {
      return { body: '', status };
    }
    let body: string;
    if (url.endsWith('.gz')) {
      // Manually gunzip — some servers don't set Content-Encoding correctly for .gz URLs
      const buf = Buffer.from(await res.arrayBuffer());
      try {
        body = gunzipSync(buf).toString('utf8');
      } catch {
        body = buf.toString('utf8'); // already decompressed by fetch
      }
    } else {
      body = await res.text();
    }
    return { body, status };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Extract <sitemap><loc>...</loc>[<lastmod>...</lastmod>]</sitemap> entries.
function parseSitemapIndex(xml: string): Array<{ loc: string; lastmod: string | null }> {
  const out: Array<{ loc: string; lastmod: string | null }> = [];
  const re = /<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const locMatch = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/i);
    const lmMatch = block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i);
    if (locMatch) {
      out.push({
        loc: decodeEntities(locMatch[1].trim()),
        lastmod: lmMatch ? lmMatch[1].trim() : null,
      });
    }
  }
  return out;
}

// Extract <url><loc>...</loc>[<lastmod>...</lastmod>]</url> entries.
function parseUrlSet(xml: string): Array<{ loc: string; lastmod: string | null }> {
  const out: Array<{ loc: string; lastmod: string | null }> = [];
  const re = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const locMatch = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/i);
    const lmMatch = block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i);
    if (locMatch) {
      out.push({
        loc: decodeEntities(locMatch[1].trim()),
        lastmod: lmMatch ? lmMatch[1].trim() : null,
      });
    }
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isFresh(lastmod: string | null, maxAgeDays: number): boolean {
  if (!lastmod) return true; // unknown → don't filter out
  const d = Date.parse(lastmod);
  if (!Number.isFinite(d)) return true;
  const ageMs = Date.now() - d;
  return ageMs <= maxAgeDays * 86_400_000;
}

// --------- main ---------

type SourceRow = {
  id: string;
  name: string;
  kind: string;
  url: string | null;
  state: string | null;
  category: string | null;
  config: Record<string, any> | null;
};

export async function pollSitemapsOnce() {
  const runId = await startRun('sitemap-poller');
  const sb = supabaseAdmin();
  const errors: string[] = [];
  let totalUrlsSeen = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalRejected = 0;
  const perSourceStats: Record<string, any> = {};

  const { data: sources, error } = await sb
    .from('sources')
    .select('id,name,kind,url,state,category,config')
    .eq('kind', 'sitemap')
    .eq('active', true);

  if (error) {
    await finishRun(runId, 'error', 0, [error.message]);
    return { error: error.message };
  }

  for (const src of (sources || []) as SourceRow[]) {
    if (!src.url) continue;
    const cfg = src.config || {};
    const parserName = (cfg.parser as ParserName | undefined) || null;
    if (!parserName) {
      errors.push(`${src.name}: no config.parser set — skipping`);
      continue;
    }
    const maxUrls = Number(cfg.max_urls_per_run ?? DEFAULT_MAX_URLS_PER_RUN);
    const sourceDefaultType = (cfg.source_type as string | undefined) || 'public_auction';

    const stats = { urlsSeen: 0, inserted: 0, skipped: 0, rejected: 0, childrenFetched: 0 };
    perSourceStats[src.name] = stats;

    try {
      // 1. Fetch index
      await sleep(POLITENESS_GAP_MS);
      const indexRes = await fetchWithTimeout(src.url);
      if (!indexRes) {
        errors.push(`${src.name}: index fetch failed`);
        continue;
      }
      if (indexRes.status !== 200) {
        errors.push(`${src.name}: index HTTP ${indexRes.status}`);
        continue;
      }
      if (looksLikeBlockPage(indexRes.body)) {
        errors.push(`${src.name}: index returned a block/CAPTCHA page — disabling for this run`);
        continue;
      }

      // 2. Decide if index OR direct urlset
      let children: Array<{ loc: string; lastmod: string | null }>;
      if (/<sitemapindex\b/i.test(indexRes.body)) {
        children = parseSitemapIndex(indexRes.body);
      } else {
        // Direct urlset — treat the source URL itself as the only "child"
        children = [{ loc: src.url, lastmod: null }];
      }

      // 3. Filter children by freshness
      const freshChildren = children.filter((c) => isFresh(c.lastmod, LASTMOD_MAX_AGE_DAYS));

      // 4. For each child, fetch & parse <url> entries
      for (const child of freshChildren) {
        if (stats.urlsSeen >= maxUrls) break;

        let body: string;
        if (child.loc === src.url && !/<sitemapindex\b/i.test(indexRes.body)) {
          body = indexRes.body; // reuse — already fetched
        } else {
          await sleep(POLITENESS_GAP_MS);
          const r = await fetchWithTimeout(child.loc);
          if (!r || r.status !== 200) continue;
          if (looksLikeBlockPage(r.body)) continue;
          body = r.body;
          stats.childrenFetched++;
        }

        const entries = parseUrlSet(body);
        for (const entry of entries) {
          if (stats.urlsSeen >= maxUrls) break;
          stats.urlsSeen++;
          totalUrlsSeen++;

          // Per-URL freshness filter (some sites set lastmod per <url>)
          if (!isFresh(entry.lastmod, LASTMOD_MAX_AGE_DAYS)) {
            stats.rejected++;
            totalRejected++;
            continue;
          }

          const parsed = parseByName(parserName, entry.loc);
          if (!parsed) {
            stats.rejected++;
            totalRejected++;
            continue;
          }

          // Phase 1 state filter
          if (!parsed.state || !PHASE_1_STATES.has(parsed.state)) {
            stats.rejected++;
            totalRejected++;
            continue;
          }

          const sale_date = entry.lastmod && /^\d{4}-\d{2}-\d{2}/.test(entry.lastmod)
            ? entry.lastmod.slice(0, 10)
            : null;

          const res = await ingestRaw({
            source_id: src.id,
            source_name: src.name,
            source_url: entry.loc,
            source_type: sourceDefaultType,
            raw_title: parsed.title,
            raw_snippet: null, // metadata only — never grab descriptions
            state: parsed.state,
            category: parsed.category ?? src.category ?? null,
            sale_date,
            raw_payload: {
              parser: parserName,
              subcategory: parsed.subcategory,
              sitemap_lastmod: entry.lastmod,
            },
          });
          if (res.inserted) {
            stats.inserted++;
            totalInserted++;
          } else {
            stats.skipped++;
            totalSkipped++;
          }
        }
      }

      await sb
        .from('sources')
        .update({ last_polled_at: new Date().toISOString() })
        .eq('id', src.id);
    } catch (e: any) {
      errors.push(`${src.name}: ${e?.message || String(e)}`);
    }
  }

  await finishRun(
    runId,
    errors.length ? 'error' : 'success',
    totalUrlsSeen,
    errors,
    {
      inserted: totalInserted,
      skipped: totalSkipped,
      rejected: totalRejected,
      per_source: perSourceStats,
    },
  );

  console.log(
    `Sitemap: seen=${totalUrlsSeen} inserted=${totalInserted} skipped=${totalSkipped} rejected=${totalRejected} errors=${errors.length}`,
  );

  return {
    seen: totalUrlsSeen,
    inserted: totalInserted,
    skipped: totalSkipped,
    rejected: totalRejected,
    errors,
    per_source: perSourceStats,
  };
}

if (require.main === module) {
  pollSitemapsOnce().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

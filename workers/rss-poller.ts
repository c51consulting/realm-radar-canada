import Parser from 'rss-parser';
import { supabaseAdmin } from '../lib/supabase';
import { startRun, finishRun } from './_shared';
import { ingestRaw } from './ingest';
import { resolveUrl } from '../lib/resolveUrl';
import { parseByName, PHASE_1_STATES, type ParserName } from '../lib/parseListingUrl';

const parser = new Parser({ timeout: 15000 });

export async function pollOnce() {
  const runId = await startRun('rss-poller');
  const sb = supabaseAdmin();
  const errors: string[] = [];
  let processed = 0, inserted = 0, skipped = 0;
  const debug = { parser_null: 0, parser_no_state: 0, dedup_url: 0, dedup_fp: 0, dedup_fuzzy: 0, insert_err: 0, examples: [] as string[] };

  const { data: feeds, error } = await sb
    .from('sources')
    .select('*')
    .eq('kind', 'rss')
    .eq('active', true);
  if (error) {
    await finishRun(runId, 'error', 0, [error.message]);
    return;
  }

  for (const feed of feeds || []) {
    if (!feed.url) continue;
    const cfg = (feed.config || {}) as Record<string, unknown>;
    const parserName = (cfg.parser as ParserName | undefined) || null;
    const sourceType = (cfg.source_type as string | undefined) || 'public_auction';

    try {
      const parsedFeed = await parser.parseURL(feed.url);
      for (const item of parsedFeed.items || []) {
        if (!item.link || !item.title) continue;
        processed++;

        // Per-item parser path: extract state + category from RSS title.
        // Used for sources like Schrader where one feed covers many states.
        let itemState: string | null = feed.state ?? null;
        let itemCategory: string | null = feed.category ?? null;
        let itemTitle: string = item.title;
        let subcategory: string | null = null;

        if (parserName) {
          // Normalise RSS <category> array — rss-parser returns array of
          // strings, but some feeds nest objects.
          const rawCats = Array.isArray((item as any).categories) ? (item as any).categories : [];
          const itemCategories: string[] = rawCats
            .map((c: any) => (typeof c === 'string' ? c : (c && typeof c === 'object' ? (c._ || c.name || '') : '')))
            .filter((s: string) => s && s.length);

          const parsed = parseByName(parserName, item.link, {
            title: item.title,
            description: item.contentSnippet || item.content || '',
            categories: itemCategories,
            homeState: feed.state ?? null,
            defaultCategory: feed.category ?? null,
          });
          if (!parsed) {
            debug.parser_null++;
            if (debug.examples.length < 3) debug.examples.push(`null|${(item.title||'').slice(0,60)}`);
            skipped++;
            continue;
          }
          if (!parsed.state || !PHASE_1_STATES.has(parsed.state)) {
            debug.parser_no_state++;
            if (debug.examples.length < 3) debug.examples.push(`no-state(${parsed.state})|${(item.title||'').slice(0,60)}`);
            skipped++;
            continue;
          }
          itemState = parsed.state;
          itemCategory = parsed.category ?? itemCategory;
          itemTitle = parsed.title;
          subcategory = parsed.subcategory;
        }

        // Resolve Google News redirector to actual publisher URL for display
        const displayUrl = await resolveUrl(item.link).catch(() => item.link);
        const res = await ingestRaw({
          source_id: feed.id,
          source_name: feed.name,
          source_url: item.link,
          display_url: displayUrl !== item.link ? displayUrl : null,
          source_type: sourceType,
          raw_title: itemTitle,
          raw_snippet: parserName ? null : (item.contentSnippet || item.content || null),
          state: itemState,
          category: itemCategory,
          sale_date: item.isoDate ? item.isoDate.slice(0, 10) : null,
          raw_payload: parserName ? { parser: parserName, subcategory } : undefined,
        });
        if (res.inserted) inserted++;
        else {
          skipped++;
          if (res.reason === 'duplicate_url') debug.dedup_url++;
          else if (res.reason === 'duplicate_fingerprint') debug.dedup_fp++;
          else if (res.reason === 'duplicate_fuzzy') debug.dedup_fuzzy++;
          else debug.insert_err++;
          if (debug.examples.length < 6 && res.reason && res.reason !== 'duplicate_url' && res.reason !== 'duplicate_fingerprint') {
            debug.examples.push(`${res.reason}|${(item.title||'').slice(0,60)}`);
          }
        }
      }
      await sb.from('sources').update({ last_polled_at: new Date().toISOString() }).eq('id', feed.id);
    } catch (e: any) {
      errors.push(`${feed.name}: ${e.message}`);
    }
  }

  await finishRun(runId, errors.length ? 'error' : 'success', processed, errors, { inserted, skipped, debug });
  console.log(`RSS: processed=${processed} inserted=${inserted} skipped=${skipped} errors=${errors.length}`);
  return { processed, inserted, skipped, errors, feeds: feeds?.length || 0, debug };
}

// Allow direct CLI invocation
if (require.main === module) {
  pollOnce().catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
}

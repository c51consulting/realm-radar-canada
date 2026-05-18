import { supabaseAdmin } from '../lib/supabase';
import { canonicalizeUrl, buildFingerprint } from '../lib/dedup';

export type RawIngest = {
  source_id?: string | null;
  source_name: string;
  source_url: string;
  source_type?: string;
  raw_title: string;
  raw_snippet?: string | null;
  state?: string | null;
  category?: string | null;
  sale_date?: string | null;
  display_url?: string | null;
  raw_payload?: Record<string, unknown>;
};

export async function ingestRaw(item: RawIngest): Promise<{ inserted: boolean; id: string | null; reason?: string }> {
  const sb = supabaseAdmin();
  const canonical = canonicalizeUrl(item.source_url);
  const fp = buildFingerprint(item.raw_title, item.state ?? null, item.sale_date ?? null);

  // Exact URL dedup
  const { data: existingUrl } = await sb
    .from('listings').select('id').eq('canonical_url', canonical).maybeSingle();
  if (existingUrl) return { inserted: false, id: existingUrl.id, reason: 'duplicate_url' };

  // Exact fingerprint dedup
  const { data: existingFp } = await sb
    .from('listings').select('id').eq('content_fingerprint', fp).maybeSingle();
  if (existingFp) return { inserted: false, id: existingFp.id, reason: 'duplicate_fingerprint' };

  // Fuzzy trigram dedup (only when state known)
  if (item.state) {
    const { data: fuzzy } = await sb.rpc('find_fuzzy_duplicates', {
      p_title: item.raw_title,
      p_state: item.state,
      p_threshold: 0.7,
    });
    if (fuzzy && fuzzy.length > 0) {
      return { inserted: false, id: fuzzy[0].id, reason: 'duplicate_fuzzy' };
    }
  }

  const { data, error } = await sb
    .from('listings')
    .insert({
      source_id: item.source_id ?? null,
      source_name: item.source_name,
      source_url: item.source_url,
      display_url: item.display_url ?? null,
      source_type: (item.source_type as any) || 'public_auction',
      canonical_url: canonical,
      content_fingerprint: fp,
      raw_title: item.raw_title.slice(0, 500),
      raw_snippet: item.raw_snippet?.slice(0, 2000) ?? null,
      state: item.state ?? null,
      category: item.category ?? null,
      sale_date: item.sale_date ?? null,
      raw_payload: item.raw_payload ?? {},
      status: 'new',
    })
    .select('id')
    .single();
  if (error) return { inserted: false, id: null, reason: error.message };
  return { inserted: true, id: data.id };
}

import crypto from 'node:crypto';

/** Strip UTM/tracking params, fragment, trailing slash. Mirrors SQL canonicalize_url. */
export function canonicalizeUrl(u: string): string {
  try {
    const url = new URL(u.trim());
    url.hash = '';
    const drop = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','mc_cid','mc_eid','ref','source'];
    drop.forEach((k) => url.searchParams.delete(k));
    let s = url.toString().toLowerCase();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return u.trim().toLowerCase();
  }
}

/** md5(title|state|sale_date) — exact match for near-duplicates. */
export function buildFingerprint(title: string, state: string | null, saleDate: string | null): string {
  const clean = (title || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const payload = `${clean}|${(state || '').toLowerCase()}|${saleDate || ''}`;
  return crypto.createHash('md5').update(payload).digest('hex');
}

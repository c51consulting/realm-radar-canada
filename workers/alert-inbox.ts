/**
 * Google Alerts inbox watcher.
 * Set up Gmail with label "REALM Radar Alerts" and forward Google Alerts there.
 * This worker reads unread messages, extracts links + titles, ingests them, then marks read.
 */
// @ts-expect-error - imap-simple lacks types
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { ingestRaw } from './ingest';
import { startRun, finishRun } from './_shared';

const CONFIG = {
  imap: {
    user: process.env.ALERT_INBOX_USER!,
    password: process.env.ALERT_INBOX_PASS!,
    host: process.env.ALERT_INBOX_HOST || 'imap.gmail.com',
    port: Number(process.env.ALERT_INBOX_PORT || 993),
    tls: true,
    authTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

/** Extract anchor links + titles from a Google Alert HTML body. */
function extractAlertLinks(html: string): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  // Google Alerts wrap clicked URLs as https://www.google.com/url?q=REAL_URL&...
  const anchorRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const rawHref = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (!text || text.length < 8) continue;
    let url = rawHref;
    const gMatch = rawHref.match(/url\?q=([^&]+)/);
    if (gMatch) url = decodeURIComponent(gMatch[1]);
    if (!url.startsWith('http')) continue;
    if (url.includes('google.com/alerts')) continue;
    results.push({ title: text, url, snippet: '' });
  }
  return results;
}

async function run() {
  const runId = await startRun('alert-inbox');
  if (!CONFIG.imap.user || !CONFIG.imap.password) {
    await finishRun(runId, 'error', 0, ['ALERT_INBOX_USER/PASS not set']);
    return;
  }
  let processed = 0, inserted = 0;
  const errors: string[] = [];
  let conn: imaps.ImapSimple | null = null;
  try {
    conn = await imaps.connect(CONFIG);
    await conn.openBox('INBOX');
    const searchCriteria = ['UNSEEN', ['FROM', 'googlealerts-noreply@google.com']];
    const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: true };
    const messages = await conn.search(searchCriteria, fetchOptions);

    for (const msg of messages as any[]) {
      try {
        const all = msg.parts.find((p: any) => p.which === '');
        if (!all) continue;
        const parsed = await simpleParser(all.body);
        const subject = parsed.subject || '';
        // Extract "Google Alert - WI farm auction" style query from subject
        const queryMatch = subject.match(/Google Alert\s*-\s*(.+)/i);
        const query = queryMatch?.[1]?.trim() || '';
        const html = parsed.html || parsed.textAsHtml || '';
        const links = extractAlertLinks(html as string);

        // Map query → state/category. Simple keyword inference.
        const state = inferState(query);
        const category = inferCategory(query);

        for (const link of links) {
          processed++;
          const res = await ingestRaw({
            source_name: `Google Alert: ${query}`,
            source_url: link.url,
            source_type: 'public_auction',
            raw_title: link.title,
            raw_snippet: link.snippet,
            state,
            category,
          });
          if (res.inserted) inserted++;
        }
      } catch (e: any) {
        errors.push(`msg parse: ${e.message}`);
      }
    }
    await conn.end();
  } catch (e: any) {
    errors.push(`imap: ${e.message}`);
    if (conn) try { await conn.end(); } catch {}
  }

  await finishRun(runId, errors.length ? 'error' : 'success', processed, errors, { inserted });
  console.log(`Alerts: processed=${processed} inserted=${inserted} errors=${errors.length}`);
}

function inferState(q: string): string | null {
  const map: Record<string, string> = {
    wisconsin: 'WI', iowa: 'IA', illinois: 'IL', minnesota: 'MN',
    nebraska: 'NE', kansas: 'KS', texas: 'TX', oklahoma: 'OK',
    missouri: 'MO', indiana: 'IN', ohio: 'OH', michigan: 'MI',
    'north dakota': 'ND', 'south dakota': 'SD', colorado: 'CO', montana: 'MT',
  };
  const lower = q.toLowerCase();
  for (const [name, code] of Object.entries(map)) if (lower.includes(name)) return code;
  return null;
}
function inferCategory(q: string): string | null {
  const lower = q.toLowerCase();
  if (/livestock|cattle|sheep|pig|dairy/.test(lower)) return 'livestock';
  if (/land|property|acre|ranch|farm sale/.test(lower)) return 'land_property';
  if (/machinery|tractor|harvest|hay|implement|equipment/.test(lower)) return 'machinery';
  if (/clearing|retirement|estate/.test(lower)) return 'clearing_sales';
  return null;
}

run().catch(async (e) => { console.error(e); process.exit(1); });

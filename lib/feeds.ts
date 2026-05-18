/**
 * Shared feed serialization helpers for RSS 2.0 + JSON Feed 1.1.
 *
 * Design rules (per REALM syndication policy):
 *   - Link-only publishing: never include full body, always link to canonical_url.
 *   - Summaries capped at 280 chars.
 *   - No images in feed items (avoid hotlinking / IP exposure).
 *   - Always attribute source via <source> tag (RSS) or `source` field (JSON).
 *   - Cache via Cache-Control: public, s-maxage=600, stale-while-revalidate=3600.
 */

export type FeedItem = {
  /** Stable identifier. Prefer canonical_url, fall back to id. */
  id: string;
  title: string;
  /** Short summary, max ~280 chars. Plain text. */
  summary: string;
  /** Where the user lands. Should be the canonical (off-site) URL. */
  link: string;
  /** Original source publication. */
  source_name?: string | null;
  source_url?: string | null;
  /** ISO timestamp. */
  published_at?: string | null;
  /** Optional ISO expiry. Items past this should be filtered upstream. */
  expires_at?: string | null;
  /** Categorical / geographic tags for filtering by consumers. */
  category?: string | null;
  state_or_region?: string | null;
  country?: string | null;
  /** Optional plain-text price. */
  price_text?: string | null;
};

export type FeedMeta = {
  title: string;
  description: string;
  /** Canonical URL of the feed itself (self link). */
  feedUrl: string;
  /** Site root URL. */
  siteUrl: string;
  /** Optional language tag. Defaults to en. */
  language?: string;
};

const MAX_SUMMARY = 280;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(s: string): string {
  // Wrap in CDATA, escaping any nested ]]> sequences.
  return `<![CDATA[${(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function trimSummary(s: string | null | undefined): string {
  if (!s) return '';
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= MAX_SUMMARY) return t;
  return t.slice(0, MAX_SUMMARY - 1).trimEnd() + '…';
}

function rfc822(date: string | null | undefined): string {
  if (!date) return new Date().toUTCString();
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function iso(date: string | null | undefined): string {
  if (!date) return new Date().toISOString();
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/** Build an RSS 2.0 XML document. */
export function buildRss(meta: FeedMeta, items: FeedItem[]): string {
  const language = meta.language || 'en';
  const lastBuild = items.length
    ? rfc822(
        items
          .map((i) => i.published_at)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null
      )
    : new Date().toUTCString();

  const itemsXml = items
    .map((item) => {
      const summary = trimSummary(item.summary);
      const guid = item.id || item.link;
      const cats: string[] = [];
      if (item.category) cats.push(`<category>${escapeXml(item.category)}</category>`);
      if (item.state_or_region) cats.push(`<category>${escapeXml(item.state_or_region)}</category>`);
      const sourceTag = item.source_name && item.source_url
        ? `<source url="${escapeXml(item.source_url)}">${escapeXml(item.source_name)}</source>`
        : '';
      const pub = `<pubDate>${rfc822(item.published_at)}</pubDate>`;
      const dcCreator = item.source_name
        ? `<dc:creator>${cdata(item.source_name)}</dc:creator>`
        : '';
      return `    <item>
      <title>${cdata(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      ${pub}
      <description>${cdata(summary)}</description>
      ${dcCreator}
      ${sourceTag}
      ${cats.join('\n      ')}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${cdata(meta.title)}</title>
    <link>${escapeXml(meta.siteUrl)}</link>
    <atom:link href="${escapeXml(meta.feedUrl)}" rel="self" type="application/rss+xml" />
    <description>${cdata(meta.description)}</description>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>REALM Radar Syndication</generator>
${itemsXml}
  </channel>
</rss>`;
}

/** Build a JSON Feed 1.1 document. */
export function buildJsonFeed(meta: FeedMeta, items: FeedItem[]): object {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: meta.title,
    description: meta.description,
    home_page_url: meta.siteUrl,
    feed_url: meta.feedUrl,
    language: meta.language || 'en',
    items: items.map((i) => ({
      id: i.id || i.link,
      url: i.link,
      title: i.title,
      summary: trimSummary(i.summary),
      content_text: trimSummary(i.summary),
      date_published: iso(i.published_at),
      ...(i.expires_at ? { _realm: { expires_at: iso(i.expires_at) } } : {}),
      tags: [i.category, i.state_or_region, i.country].filter(Boolean) as string[],
      ...(i.source_name && i.source_url
        ? { authors: [{ name: i.source_name, url: i.source_url }] }
        : {}),
      ...(i.price_text ? { _realm_price: i.price_text } : {}),
    })),
  };
}

/** Standard cache headers for feed responses. */
export const FEED_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
  'X-Robots-Tag': 'noindex',
};

export function rssHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    ...FEED_CACHE_HEADERS,
  };
}

export function jsonHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/feed+json; charset=utf-8',
    ...FEED_CACHE_HEADERS,
  };
}

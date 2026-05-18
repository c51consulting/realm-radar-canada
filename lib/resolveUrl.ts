/** Resolve a Google News redirect URL to the actual publisher URL.
 *
 * Google News RSS items have URLs like:
 *   https://news.google.com/rss/articles/CBMi...
 * which redirect through Google to the real publisher. We follow redirects
 * and return the final URL. Falls back to the original on any error.
 */

export async function resolveUrl(url: string, timeoutMs = 8000): Promise<string> {
  if (!url) return url;
  // Only resolve Google News redirector URLs — leave others alone
  if (!/^https?:\/\/news\.google\.com\//i.test(url)) return url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; REALM-Radar/1.0; +https://realm-radar-canada.vercel.app)',
        'accept': 'text/html,application/xhtml+xml',
      },
    });
    // res.url is the final URL after all redirects
    if (res.url && !res.url.startsWith('https://news.google.com/')) return res.url;
    // Some Google News pages embed the destination in a meta refresh / data-n-au; try regex on body
    const text = await res.text();
    const m = text.match(/data-n-au=\"(https?:\/\/[^\"]+)\"/) ||
              text.match(/<a[^>]+href=\"(https?:\/\/[^\"]+)\"[^>]+>/);
    if (m && m[1] && !m[1].startsWith('https://news.google.com/')) return m[1];
    return url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

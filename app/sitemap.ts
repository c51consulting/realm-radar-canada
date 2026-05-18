import type { MetadataRoute } from 'next';
import { CATEGORY_SLUGS, STATE_SLUGS } from '@/lib/seo';

const PHASE_1_COMBOS: Array<[string, string]> = [
  ['texas', 'equipment'],
  ['wisconsin', 'livestock'],
  ['iowa', 'land'],
  ['nebraska', 'auctions'],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://realm-radar-canada.vercel.app';
  const base = siteBase + '/radar';
  const now = new Date();

  return [
    // Homepage
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    // Static utility pages
    { url: `${base}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/subscribe`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/affiliate`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    // Category landing pages (clean slugs only)
    ...CATEGORY_SLUGS.map((c) => ({
      url: `${base}/${c}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    // State landing pages (full names only)
    ...STATE_SLUGS.map((s) => ({
      url: `${base}/${s}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    // State × Category combos
    ...PHASE_1_COMBOS.map(([s, c]) => ({
      url: `${base}/${s}/${c}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    // Syndication / feed URLs
    { url: `${siteBase}/feeds`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${siteBase}/feeds/all.xml`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${siteBase}/feeds/all.json`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.7 },
    { url: `${siteBase}/partners/feeds`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${siteBase}/partners/webhooks`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
  ];
}

/**
 * 301 redirects from DB slugs to clean canonical slugs.
 * Examples:
 *   /radar/machinery       → /radar/equipment
 *   /radar/land_property   → /radar/land
 *   /radar/TX              → /radar/texas
 *   /radar/TX/machinery    → /radar/texas/equipment
 *
 * Runs at the edge before pages render, so SEO crawlers see 301 + clean URL.
 */
import { NextRequest, NextResponse } from 'next/server';
import { SLUG_REDIRECTS } from '@/lib/seo-constants';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Only intercept /radar/* paths with 1 or 2 segments after /radar
  if (!pathname.startsWith('/radar/')) return NextResponse.next();

  const parts = pathname.split('/').filter(Boolean); // ['radar', ...]
  if (parts.length < 2 || parts.length > 3) return NextResponse.next();

  // Don't intercept static sibling routes
  const STATIC = new Set(['about', 'submit', 'subscribe', 'affiliate', 'confirm']);
  if (parts.length === 2 && STATIC.has(parts[1])) return NextResponse.next();

  const seg1 = parts[1];
  const seg2 = parts[2];

  const r1 = SLUG_REDIRECTS[seg1];
  const r2 = seg2 ? SLUG_REDIRECTS[seg2] : undefined;

  // No redirects needed
  if (!r1 && !r2) return NextResponse.next();

  // Build new path with whichever segments were rewritten
  const newSeg1 = r1 ?? seg1;
  const newSeg2 = seg2 ? (r2 ?? seg2) : undefined;
  const newPath = newSeg2 ? `/radar/${newSeg1}/${newSeg2}` : `/radar/${newSeg1}`;

  if (newPath === pathname) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = newPath;
  url.search = search;
  return NextResponse.redirect(url, 301);
}

export const config = {
  // Match /radar/* but not /radar (homepage handled separately).
  // Also exclude API, _next, static assets.
  matcher: ['/radar/:path+'],
};

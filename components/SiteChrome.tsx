'use client';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { ShortlistDrawer } from '@/components/ShortlistDrawer';
import { MobileBottomNav } from '@/components/MobileBottomNav';

/**
 * Hides the persistent overlay UI (drawer + mobile nav) on iframe-embed routes
 * so partner embeds stay clean.
 */
export function SiteChromeOverlays() {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed')) return null;
  return (
    <>
      <ShortlistDrawer />
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </>
  );
}

export function SiteHeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed')) return null;
  return <>{children}</>;
}

export function SiteFooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed')) return null;
  return <>{children}</>;
}

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed')) {
    // No max-width/padding for embed surfaces
    return <main>{children}</main>;
  }
  return <main className="mx-auto max-w-content px-5 py-8 md:py-10">{children}</main>;
}

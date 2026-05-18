'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useShortlist } from './ShortlistProvider';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string, search: string) => boolean;
  badge?: number;
};

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12 12 3l9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconMap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" />
      <path d="M9 3v16" />
      <path d="M15 5v16" />
    </svg>
  );
}
function IconCompare() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="7" height="14" rx="1.5" />
      <rect x="14" y="5" width="7" height="14" rx="1.5" />
      <path d="M10 12h4" />
    </svg>
  );
}
function IconSubmit() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() || '/';
  const sp = useSearchParams();
  const view = sp?.get('view') || '';
  const q = sp?.get('q') || '';
  const { items, setOpen } = useShortlist();

  if (pathname.startsWith('/admin')) return null;

  const onRadarRoot = pathname === '/radar' || pathname.startsWith('/radar/machinery') || pathname.startsWith('/radar/livestock') || pathname.startsWith('/radar/land_property');

  const navItems: NavItem[] = [
    {
      href: '/radar',
      label: 'Home',
      icon: <IconHome />,
      match: (p, _s) => p === '/radar' && view !== 'map',
    },
    {
      href: '/radar?q=',
      label: 'Search',
      icon: <IconSearch />,
      match: (_p, _s) => onRadarRoot && q.length > 0,
    },
    {
      href: '/radar?view=map',
      label: 'Map',
      icon: <IconMap />,
      match: (_p, _s) => view === 'map',
    },
    {
      href: '#shortlist',
      label: 'Compare',
      icon: <IconCompare />,
      match: () => false,
      badge: items.length,
    },
    {
      href: '/radar/submit',
      label: 'Submit',
      icon: <IconSubmit />,
      match: (p) => p.startsWith('/radar/submit'),
    },
  ];

  return (
    <>
      {/* Spacer so content isn't hidden behind the nav on mobile */}
      <div className="h-16 md:hidden" aria-hidden />
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-realm-line bg-realm-cream/95 backdrop-blur supports-[backdrop-filter]:bg-realm-cream/80"
        role="navigation"
        aria-label="Primary mobile navigation"
      >
        <ul className="grid grid-cols-5 max-w-content mx-auto">
          {navItems.map((item) => {
            const active = item.match(pathname, sp?.toString() || '');
            const isShortlist = item.href === '#shortlist';
            const common = (
              <span className={`relative flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] uppercase tracking-wider font-semibold ${active ? 'text-realm-forest' : 'text-realm-charcoal/70'}`}>
                <span className="relative">
                  {item.icon}
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-realm-forest text-realm-cream text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="leading-none">{item.label}</span>
                {active ? <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-realm-forest rounded-full" /> : null}
              </span>
            );
            return (
              <li key={item.label} className="contents">
                {isShortlist ? (
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="w-full"
                    aria-label={`Open shortlist (${item.badge ?? 0} items)`}
                  >
                    {common}
                  </button>
                ) : (
                  <a href={item.href} className="w-full" aria-label={item.label}>
                    {common}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

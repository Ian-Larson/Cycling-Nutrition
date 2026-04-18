export type NavSection = 'nutrition' | 'gear' | 'labs' | 'account';

export interface NavRouteItem {
  path: string;
  label: string;
  matchPaths: readonly string[];
}

export interface PrimaryNavItem extends NavRouteItem {
  section: NavSection;
  mobileLabel?: string;
}

export const primaryNavItems: readonly PrimaryNavItem[] = [
  {
    path: '/',
    label: 'Nutrition Plan',
    mobileLabel: 'Nutrition',
    section: 'nutrition',
    matchPaths: ['/', '/nutrition-plan', '/inventory', '/bottles', '/products', '/history'],
  },
  {
    path: '/gear',
    label: 'Gear',
    section: 'gear',
    matchPaths: ['/gear'],
  },
  {
    path: '/power-meter-analyzer',
    label: 'Labs',
    section: 'labs',
    matchPaths: ['/labs', '/power-meter-analyzer'],
  },
  {
    path: '/account',
    label: 'Account',
    section: 'account',
    matchPaths: [
      '/account',
      '/athlete',
      '/settings',
      '/auth/callback',
      '/auth/strava/callback',
    ],
  },
];

export const sectionLabels: Record<NavSection, string> = {
  nutrition: 'Nutrition Plan',
  gear: 'Gear',
  labs: 'Labs',
  account: 'Account',
};

const sectionNavItems: Record<NavSection, readonly NavRouteItem[]> = {
  nutrition: [
    { path: '/', label: 'Build plan', matchPaths: ['/', '/nutrition-plan'] },
    {
      path: '/inventory',
      label: 'Inventory',
      matchPaths: ['/inventory', '/bottles', '/products'],
    },
    { path: '/history', label: 'Saved plans', matchPaths: ['/history'] },
  ],
  gear: [],
  labs: [
    {
      path: '/power-meter-analyzer',
      label: 'Power meter',
      matchPaths: ['/labs', '/power-meter-analyzer'],
    },
  ],
  account: [
    {
      path: '/account',
      label: 'Sync',
      matchPaths: ['/account', '/auth/callback', '/auth/strava/callback'],
    },
    { path: '/athlete', label: 'Athlete', matchPaths: ['/athlete', '/settings'] },
  ],
};

function normalizePathname(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

function routeMatches(pathname: string, routePath: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedRoute = normalizePathname(routePath);

  if (normalizedRoute === '/') {
    return normalizedPathname === '/';
  }

  return (
    normalizedPathname === normalizedRoute ||
    normalizedPathname.startsWith(`${normalizedRoute}/`)
  );
}

export function isNavItemActive(
  item: Pick<NavRouteItem, 'matchPaths'>,
  pathname: string
): boolean {
  return item.matchPaths.some((path) => routeMatches(pathname, path));
}

export function getActivePrimaryNavItem(
  pathname: string
): PrimaryNavItem | undefined {
  return primaryNavItems.find((item) => isNavItemActive(item, pathname));
}

export function getSectionNavItems(
  section: NavSection
): readonly NavRouteItem[] {
  return sectionNavItems[section];
}

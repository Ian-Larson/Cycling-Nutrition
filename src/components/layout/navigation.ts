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
    label: 'Fuel plan',
    mobileLabel: 'Fuel',
    section: 'nutrition',
    matchPaths: ['/', '/nutrition-plan', '/inventory', '/bottles', '/products', '/history'],
  },
  {
    path: '/gear',
    label: 'Garage',
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

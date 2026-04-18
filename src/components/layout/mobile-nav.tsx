import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { isNavItemActive, primaryNavItems } from './navigation';

export function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-area-bottom)+var(--mobile-nav-gap))] z-40 md:hidden"
      aria-label="Primary"
    >
      <div className="pointer-events-auto mx-auto grid h-[var(--mobile-nav-height)] w-[calc(100%-1rem)] max-w-[30rem] grid-cols-4 gap-1 rounded-lg border border-white/75 bg-white/90 p-1 shadow-[var(--shadow-float)] backdrop-blur-xl">
        {primaryNavItems.map((item) => {
          const isActive = isNavItemActive(item, location.pathname);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex min-h-11 items-center justify-center rounded-md px-1 text-center text-[0.75rem] font-semibold leading-none transition-[background-color,color,box-shadow,transform] duration-200 motion-safe:active:scale-[0.98]',
                isActive
                  ? 'bg-info-100 text-info-800 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-info-300)_62%,white)]'
                  : 'text-ink-700 hover:bg-shell-50 hover:text-ink-900'
              )}
            >
              <span className="block truncate">{item.mobileLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

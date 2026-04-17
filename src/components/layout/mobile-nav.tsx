import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'Plan' },
  { path: '/athlete', label: 'Athlete' },
  { path: '/inventory', label: 'Inventory' },
  { path: '/history', label: 'Plans' },
  { path: '/gear', label: 'Gear' },
  { path: '/account', label: 'Account' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-area-bottom)+var(--mobile-nav-gap))] z-40 md:hidden">
      <div className="pointer-events-auto mx-auto grid h-[var(--mobile-nav-height)] w-[calc(100%-1.5rem)] max-w-[28rem] grid-cols-6 gap-1 rounded-[2rem] border border-white/75 bg-white/88 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            aria-current={location.pathname === item.path ? 'page' : undefined}
            className={clsx(
              'flex min-h-12 items-center justify-center rounded-[1.55rem] px-1 text-center text-[0.72rem] font-semibold leading-none tracking-[0.01em] transition-[background-color,color,box-shadow,transform] duration-200 motion-safe:active:scale-[0.98]',
              location.pathname === item.path
                ? 'bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand-200)_52%,white)]'
                : 'text-ink-700 hover:bg-shell-50 hover:text-ink-900'
            )}
          >
            <span className="block truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'Plan', short: 'NP', primary: true },
  { path: '/athlete', label: 'Athlete', short: 'AT' },
  { path: '/inventory', label: 'Inventory', short: 'IV' },
  { path: '/history', label: 'Plans', short: 'PL' },
  { path: '/settings', label: 'Settings', short: 'ST' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border-soft)] bg-shell-50/92 backdrop-blur-xl md:hidden pb-safe">
      <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-3 py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              'rounded-2xl px-2 py-2.5 text-center transition-colors',
              item.primary &&
                (location.pathname === item.path
                  ? 'bg-brand-600 text-shell-50 shadow-[0_18px_32px_-24px_rgb(145_66_24_/_0.7)]'
                  : 'text-brand-700'),
              !item.primary &&
                (location.pathname === item.path
                  ? 'bg-white text-ink-900 ring-1 ring-[color:var(--border-soft)]'
                  : 'text-ink-500')
            )}
          >
            <span className="block font-sans text-[0.72rem] uppercase tracking-[0.18em] opacity-75">
              {item.short}
            </span>
            <span className="mt-1 block truncate text-[0.72rem] font-semibold tracking-[0.04em]">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

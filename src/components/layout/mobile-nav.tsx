import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'Planner', short: 'Plan' },
  { path: '/athlete', label: 'Athlete', short: 'Ath' },
  { path: '/inventory', label: 'Inventory', short: 'Inv' },
  { path: '/history', label: 'Plans', short: 'Plans' },
  { path: '/settings', label: 'Settings', short: 'Set' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border-soft)] bg-shell-50/96 backdrop-blur md:hidden pb-safe">
      <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-3 py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              'rounded-xl px-2 py-2.5 text-center transition-colors',
              location.pathname === item.path
                ? 'bg-brand-100 text-brand-900'
                : 'text-ink-500'
            )}
          >
            <span className="block text-[0.7rem] font-medium opacity-75">
              {item.short}
            </span>
            <span className="mt-1 block truncate text-[0.72rem] font-medium">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

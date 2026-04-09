import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'Plan' },
  { path: '/athlete', label: 'Athlete' },
  { path: '/inventory', label: 'Inventory' },
  { path: '/history', label: 'Plans' },
  { path: '/settings', label: 'Settings' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border-soft)] bg-shell-50/96 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2.5 pt-1.5 [padding-bottom:calc(var(--safe-area-bottom)+0.5rem)]">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            aria-current={location.pathname === item.path ? 'page' : undefined}
            className={clsx(
              'flex min-h-12 items-center justify-center rounded-[1rem] px-1 text-center text-[0.68rem] font-medium leading-none tracking-[0.01em] transition-colors',
              location.pathname === item.path
                ? 'bg-white text-brand-900 shadow-[var(--shadow-soft)]'
                : 'text-ink-600'
            )}
          >
            <span className="block truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

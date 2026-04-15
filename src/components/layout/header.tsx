import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'Plan' },
  { path: '/athlete', label: 'Athlete' },
  { path: '/inventory', label: 'Inventory' },
  { path: '/history', label: 'Plans' },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-[color:var(--border-soft)] bg-shell-50/96 backdrop-blur md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-2.5">
        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-brand-100 text-brand-900'
                  : 'text-ink-700 hover:bg-white hover:text-ink-900'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

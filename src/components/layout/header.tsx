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
    <header className="sticky top-0 z-40 border-b border-[color:var(--border-soft)] bg-shell-50/96 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 md:px-6 md:py-3">
        <Link to="/" className="app-brand min-w-0 truncate text-[1.02rem] text-ink-900 md:text-[1.12rem]">
          Cycling Nutrition
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
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

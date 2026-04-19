import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { isNavItemActive, primaryNavItems } from './navigation';

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-[color:var(--border-soft)] bg-shell-50/96 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2.5">
        <nav className="flex items-center gap-1.5" aria-label="Primary">
          {primaryNavItems.map((item) => {
            const isActive = isNavItemActive(item, location.pathname);

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-700 hover:bg-white hover:text-ink-900'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

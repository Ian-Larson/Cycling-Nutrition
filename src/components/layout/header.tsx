import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { isNavItemActive, primaryNavItems } from './navigation';

function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="Domestique home"
      className="inline-flex items-baseline gap-1.5 rounded-sm font-sans text-base font-semibold tracking-[-0.012em] text-ink-900 transition-colors hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-50 md:text-[1.05rem]"
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500"
      />
      Domestique
    </Link>
  );
}

export function Header() {
  const location = useLocation();

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-[color:var(--border-soft)] bg-shell-50/96 px-4 py-2.5 backdrop-blur md:hidden">
        <Wordmark />
      </div>

      <header className="sticky top-0 z-40 hidden border-b border-[color:var(--border-soft)] bg-shell-50/96 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-2.5">
          <Wordmark />
          <nav className="flex items-center gap-1" aria-label="Primary">
            {primaryNavItems.map((item) => {
              const isActive = isNavItemActive(item, location.pathname);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-50',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-600 hover:text-ink-900'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}

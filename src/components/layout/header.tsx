import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'New Plan', primary: true },
  { path: '/athlete', label: 'Athlete' },
  { path: '/inventory', label: 'Inventory' },
  { path: '/history', label: 'Plans' },
  { path: '/settings', label: 'Settings' },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border-soft)] bg-shell-50/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link to="/" className="min-w-0">
          <div className="section-kicker text-[0.64rem]">Cycling Nutrition</div>
          <div className="font-sans text-[1.9rem] font-bold uppercase leading-none tracking-[0.08em] text-ink-900">
            Fuel Planner
          </div>
          <div className="mt-1 max-w-[28ch] text-sm leading-5 text-ink-600">
            Build a ride-ready nutrition brief before wheels roll.
          </div>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'rounded-full px-4 py-2.5 font-body text-sm font-semibold tracking-[0.04em] transition-all',
                item.primary &&
                  (location.pathname === item.path
                    ? 'bg-brand-600 text-shell-50 shadow-[0_20px_40px_-24px_rgb(145_66_24_/_0.7)]'
                    : 'bg-brand-500 text-shell-50 hover:-translate-y-0.5 hover:bg-brand-600'),
                !item.primary &&
                  (location.pathname === item.path
                    ? 'bg-white text-ink-900 shadow-[0_12px_24px_-18px_rgb(72_36_12_/_0.45)] ring-1 ring-[color:var(--border-soft)]'
                    : 'text-ink-700 hover:bg-white/75 hover:text-ink-900')
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

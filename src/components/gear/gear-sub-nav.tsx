import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/gear', label: 'Garage', end: true },
  { to: '/gear/inventory', label: 'Inventory', end: false },
] as const;

export function GearSubNav() {
  return (
    <nav
      aria-label="Gear sections"
      className="mb-2 flex w-full gap-1 border-b border-[color:var(--border-soft)] md:mb-3"
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            clsx(
              'min-h-11 inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 md:px-4',
              isActive
                ? 'border-brand-600 text-brand-800'
                : 'border-transparent text-ink-700 hover:border-shell-300 hover:text-ink-900'
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

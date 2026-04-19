import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/gear', label: 'Gear', end: true },
  { to: '/gear/inventory', label: 'Inventory', end: false },
] as const;

export function GearSubNav() {
  return (
    <div
      role="navigation"
      aria-label="Gear sections"
      className="inline-flex w-fit gap-1 rounded-lg border border-[color:var(--border-soft)] bg-white p-1"
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            clsx(
              'min-h-9 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200',
              isActive
                ? 'bg-brand-100 text-brand-900'
                : 'text-ink-700 hover:bg-shell-50'
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}

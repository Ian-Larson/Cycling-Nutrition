import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'Plan', icon: '📋' },
  { path: '/athlete', label: 'Athlete', icon: '🧍' },
  { path: '/inventory', label: 'Inventory', icon: '🎒' },
  { path: '/history', label: 'History', icon: '📜' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              'flex flex-col items-center py-2 px-4 text-xs',
              location.pathname === item.path
                ? 'text-brand-600'
                : 'text-gray-500'
            )}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

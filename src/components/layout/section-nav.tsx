import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  getSectionNavItems,
  isNavItemActive,
  sectionLabels,
  type NavSection,
} from './navigation';

interface SectionNavProps {
  section: NavSection;
}

export function SectionNav({ section }: SectionNavProps) {
  const location = useLocation();
  const items = getSectionNavItems(section);

  if (items.length <= 1) return null;

  return (
    <nav
      aria-label={`${sectionLabels[section]} sections`}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:px-0"
    >
      {items.map((item) => {
        const isActive = isNavItemActive(item, location.pathname);

        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors md:min-h-10',
              isActive
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50 hover:text-ink-900'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

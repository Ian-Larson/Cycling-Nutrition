import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Card } from './card';

interface SectionPanelProps {
  title: ReactNode;
  /** Optional one-line subtitle rendered below the title. */
  subtitle?: ReactNode;
  /** Trailing action(s) on the header row, independent of the toggle. */
  actions?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Anchor ID used for hash-based scroll navigation. */
  id?: string;
  /** Extra class for the outer Card. */
  className?: string;
  /** Indicates this section is the current scroll target — drives a brief ring pulse. */
  highlighted?: boolean;
  children: ReactNode;
}

export function SectionPanel({
  title,
  subtitle,
  actions,
  open,
  onToggle,
  id,
  className,
  highlighted,
  children,
}: SectionPanelProps) {
  const headerId = id ? `${id}-header` : undefined;
  const contentId = id ? `${id}-content` : undefined;

  return (
    <Card
      id={id}
      className={clsx(
        'overflow-hidden scroll-mt-24 md:scroll-mt-28',
        highlighted && 'animate-section-target',
        className
      )}
    >
      <div className="flex items-stretch gap-1 px-2 py-1.5 md:px-3 md:py-2">
        <button
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={onToggle}
          className={clsx(
            'flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors',
            'hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-inset md:px-2.5'
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="section-title block text-base">{title}</span>
            {subtitle ? (
              <span className="mt-0.5 block text-sm leading-5 text-ink-600">
                {subtitle}
              </span>
            ) : null}
          </span>
          <span
            aria-hidden
            className={clsx(
              'mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center text-ink-500 transition-transform duration-200',
              open && 'rotate-180'
            )}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M5 7.5 10 12.5 15 7.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        {actions ? (
          <div className="flex shrink-0 items-center pr-1">{actions}</div>
        ) : null}
      </div>
      {open ? (
        <div
          id={contentId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-[color:var(--border-soft)] px-4 py-3 md:px-5 md:py-4"
        >
          {children}
        </div>
      ) : null}
    </Card>
  );
}

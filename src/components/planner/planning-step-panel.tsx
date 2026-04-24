import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';

interface PlanningStepPanelProps {
  step: number;
  title: string;
  summary: string;
  active: boolean;
  complete: boolean;
  disabled?: boolean;
  disabledReason?: string;
  stale?: boolean;
  children: ReactNode;
  onToggle: () => void;
}

export function PlanningStepPanel({
  step,
  title,
  summary,
  active,
  complete,
  disabled,
  disabledReason,
  stale,
  children,
  onToggle,
}: PlanningStepPanelProps) {
  return (
    <Card
      className={clsx(
        'overflow-hidden transition-[border-color,box-shadow] duration-200',
        active && 'border-brand-200 shadow-[var(--shadow-float)]',
        disabled && 'opacity-70'
      )}
    >
      <button
        type="button"
        disabled={disabled}
        aria-expanded={active}
        onClick={onToggle}
        className={clsx(
          'flex min-h-[4.75rem] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-inset md:px-5',
          active ? 'bg-brand-50/70' : 'bg-white hover:bg-shell-50',
          disabled && 'cursor-not-allowed hover:bg-white'
        )}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span
            className={clsx(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
              active || complete
                ? 'border-brand-300 bg-brand-100 text-brand-800'
                : 'border-[color:var(--border-soft)] bg-shell-50 text-ink-600'
            )}
          >
            {step}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="section-title text-base">{title}</span>
              {stale ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.68rem] font-semibold text-amber-800">
                  Needs rebuild
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-sm leading-5 text-ink-600">
              {disabled && disabledReason ? disabledReason : summary}
            </span>
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className={clsx(
            'h-4 w-4 shrink-0 text-ink-500 transition-transform',
            active && 'rotate-180'
          )}
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {active ? (
        <CardContent className="border-t border-[color:var(--border-soft)]">
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}

import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface SpecRowProps {
  label: string;
  value: ReactNode;
  /** When true, the value is rendered dimmer (for "—" placeholders). */
  muted?: boolean;
  /**
   * When provided, the value becomes a button that invokes onEdit on click.
   * Used for inline-edit affordances without pushing the value off its axis.
   */
  onEdit?: () => void;
  /** Accessible label describing the edit action (required when onEdit is set). */
  editAriaLabel?: string;
  /** Optional accent on the value (e.g., for hero stats). */
  accent?: boolean;
}

export function SpecRow({
  label,
  value,
  muted,
  onEdit,
  editAriaLabel,
  accent,
}: SpecRowProps) {
  const valueClasses = clsx(
    'shrink-0 font-medium tabular-nums',
    muted ? 'text-ink-400' : accent ? 'text-brand-700' : 'text-ink-900'
  );

  return (
    <div className="flex items-baseline gap-2 text-sm leading-6">
      <span className="shrink-0 text-ink-600">{label}</span>
      <span
        aria-hidden
        className="mx-1 min-w-[1.5rem] flex-1 translate-y-[-0.22em] border-b border-dotted border-[color:var(--border-soft)]"
      />
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editAriaLabel}
          className={clsx(
            valueClasses,
            'rounded-md px-1.5 py-0 -my-0.5 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'
          )}
        >
          {value}
        </button>
      ) : (
        <span className={valueClasses}>{value}</span>
      )}
    </div>
  );
}

import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional longer description announced to screen readers. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group (required — rendered sr-only). */
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'min-h-9 text-xs md:min-h-8',
  md: 'min-h-11 text-sm md:min-h-10',
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx(
        'inline-grid w-full rounded-full border border-[color:var(--border-soft)] bg-white p-1',
        'shadow-[inset_0_0_0_1px_rgba(34,43,51,0.02)]',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={clsx(
              'inline-flex items-center justify-center rounded-full px-3 font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
              sizeClasses[size],
              selected
                ? 'bg-brand-500 text-white shadow-[var(--shadow-brand-glow-sm)]'
                : 'text-ink-700 hover:text-ink-900'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

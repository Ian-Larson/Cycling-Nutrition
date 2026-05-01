import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ChipSize = 'sm' | 'md';
type ChipTone = 'subtle' | 'outlined';

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  selected?: boolean;
  size?: ChipSize;
  tone?: ChipTone;
  children: ReactNode;
}

const sizeClasses: Record<ChipSize, string> = {
  sm: 'min-h-7 px-2.5 py-1 text-xs',
  md: 'min-h-11 px-3 py-1.5 text-sm md:min-h-10',
};

const toneClasses: Record<ChipTone, { idle: string; active: string }> = {
  subtle: {
    idle: 'bg-shell-100 text-ink-700 hover:bg-shell-200',
    active: 'bg-brand-100 text-brand-900',
  },
  outlined: {
    idle: 'border border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50',
    active: 'border border-brand-300 bg-brand-100 text-brand-800',
  },
};

export function Chip({
  selected = false,
  size = 'md',
  tone = 'outlined',
  className,
  children,
  type,
  ...rest
}: ChipProps) {
  const tones = toneClasses[tone];
  return (
    <button
      type={type ?? 'button'}
      aria-pressed={selected}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizeClasses[size],
        selected ? tones.active : tones.idle,
        tone === 'outlined' && 'border',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface ChipGroupOption<T extends string> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

interface ChipGroupProps<T extends string> {
  options: ReadonlyArray<ChipGroupOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group (rendered as aria-label). */
  label: string;
  size?: ChipSize;
  tone?: ChipTone;
  /** Layout: 'wrap' for flex-wrap, 'grid' for equal-width columns. */
  layout?: 'wrap' | 'grid';
  className?: string;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  tone = 'outlined',
  layout = 'wrap',
  className,
}: ChipGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx(
        layout === 'grid'
          ? 'grid gap-2'
          : 'flex flex-wrap gap-2',
        className
      )}
      style={
        layout === 'grid'
          ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={option.value}
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            disabled={option.disabled}
            selected={selected}
            size={size}
            tone={tone}
            onClick={() => onChange(option.value)}
            className={layout === 'grid' ? 'w-full' : undefined}
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}

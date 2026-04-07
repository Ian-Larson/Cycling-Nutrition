import { clsx } from 'clsx';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="block text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-ink-600"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={clsx(
          'block min-h-12 w-full rounded-[1rem] border px-4 py-3 text-base text-ink-900',
          'border-[color:var(--border-soft)] bg-white/88 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.65)]',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-300 focus:outline-none',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

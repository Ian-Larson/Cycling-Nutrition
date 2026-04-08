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
          className="block text-sm font-medium text-ink-700"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={clsx(
          'block min-h-12 w-full rounded-[0.95rem] border px-3.5 py-2.5 text-base text-ink-900 md:min-h-11 md:rounded-xl',
          'border-[color:var(--border-soft)] bg-white',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none',
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

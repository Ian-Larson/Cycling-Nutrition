import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
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
      <input
        id={id}
        className={clsx(
          'block min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-base text-ink-900',
          'border-[color:var(--border-soft)] bg-white',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none',
          'placeholder:text-ink-400',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-200',
          className
        )}
        {...(error ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {})}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

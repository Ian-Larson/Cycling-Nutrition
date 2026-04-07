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
          className="block text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-ink-600"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          'block min-h-12 w-full rounded-[1rem] border px-4 py-3 text-base text-ink-900',
          'border-[color:var(--border-soft)] bg-white/88 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.65)]',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-300 focus:outline-none',
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

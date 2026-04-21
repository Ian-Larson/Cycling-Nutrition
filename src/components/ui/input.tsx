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
          'block min-h-12 w-full rounded-xl border px-3.5 py-2.5 text-base text-ink-900 md:min-h-11',
          'border-[color:var(--border-soft)] bg-white',
          'transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none',
          'placeholder:text-ink-400',
          error && 'border-error-500 bg-error-50 focus:border-error-500 focus:ring-error-200',
          className
        )}
        {...(error ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {})}
        {...props}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-sm text-error-700"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          >
            <path
              d="M8 1.75 14.5 13.5h-13L8 1.75Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M8 6.5v3.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="11.5" r="0.85" fill="currentColor" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

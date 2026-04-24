import { useEffect } from 'react';
import { clsx } from 'clsx';

type ToastVariant = 'success' | 'error';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
  variant?: ToastVariant;
}

export function Toast({
  message,
  onDismiss,
  duration = 3000,
  variant = 'success',
}: ToastProps) {
  const isError = variant === 'error';
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className="fixed left-1/2 z-50 -translate-x-1/2 animate-fade-in bottom-[var(--mobile-toast-offset)] md:bottom-6"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className={clsx(
          'group relative block overflow-hidden rounded-xl border px-4 py-3 text-left text-sm font-medium shadow-[var(--shadow-soft)] backdrop-blur transition-[transform,box-shadow] duration-150 ease-out motion-reduce:transition-none motion-safe:hover:-translate-y-px hover:shadow-[var(--shadow-float)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
          isError
            ? 'border-error-200 bg-error-50/98 text-error-900 focus-visible:ring-error-200'
            : 'border-brand-200 bg-brand-100/98 text-brand-900 focus-visible:ring-brand-200'
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={clsx(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/78',
              isError ? 'text-error-700' : 'text-brand-700'
            )}
          >
            {isError ? (
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M10 3 17.5 16.5h-15L10 3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 8.5v3.25"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="13.75" r="0.95" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M5.5 10.5 8.5 13.5 14.5 6.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span>{message}</span>
        </div>
        <span
          aria-hidden
          className={clsx(
            'absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[shrink_var(--toast-duration)_linear_forwards]',
            isError ? 'bg-error-500/75' : 'bg-brand-400/75'
          )}
          style={{ ['--toast-duration' as string]: `${duration}ms` }}
        />
      </button>
    </div>
  );
}

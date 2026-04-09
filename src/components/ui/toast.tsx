import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      aria-live="polite"
      className="fixed left-1/2 z-50 -translate-x-1/2 animate-fade-in bottom-[var(--mobile-toast-offset)] md:bottom-6"
    >
      <div className="relative overflow-hidden rounded-xl border border-brand-200 bg-brand-100/98 px-4 py-3 text-sm font-medium text-brand-900 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/78 text-brand-700">
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
              <path
                d="M5.5 10.5 8.5 13.5 14.5 6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>{message}</span>
        </div>
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[shrink_var(--toast-duration)_linear_forwards] bg-brand-400/75"
          style={{ ['--toast-duration' as string]: `${duration}ms` }}
        />
      </div>
    </div>
  );
}

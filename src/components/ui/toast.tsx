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
    <div className="fixed left-1/2 z-50 -translate-x-1/2 animate-fade-in bottom-[var(--mobile-toast-offset)] md:bottom-6">
      <div className="rounded-xl border border-brand-200 bg-brand-100 px-4 py-2 text-sm font-medium text-brand-900 shadow-[var(--shadow-soft)]">
        {message}
      </div>
    </div>
  );
}

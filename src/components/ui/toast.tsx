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
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="rounded-full border border-brand-700 bg-brand-600 px-5 py-2.5 text-sm font-semibold tracking-[0.04em] text-shell-50 shadow-[0_20px_40px_-24px_rgb(145_66_24_/_0.72)]">
        {message}
      </div>
    </div>
  );
}

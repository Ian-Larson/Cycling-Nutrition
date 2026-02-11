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
      <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
        {message}
      </div>
    </div>
  );
}

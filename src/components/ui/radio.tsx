import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  onChange?: (checked: boolean) => void;
}

export function Radio({ className, onChange, ...props }: RadioProps) {
  return (
    <input
      type="radio"
      className={clsx(
        'h-4 w-4 border-gray-300 text-brand-600',
        'focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
        className
      )}
      onChange={(event) => onChange?.(event.target.checked)}
      {...props}
    />
  );
}

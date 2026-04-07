import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  onChange?: (checked: boolean) => void;
}

export function Checkbox({ className, onChange, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={clsx(
        'h-[1.125rem] w-[1.125rem] rounded border-[color:var(--border-soft)] text-brand-600',
        'focus:ring-2 focus:ring-brand-300 focus:ring-offset-1 focus:ring-offset-shell-50',
        className
      )}
      onChange={(event) => onChange?.(event.target.checked)}
      {...props}
    />
  );
}

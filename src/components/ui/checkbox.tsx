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
        'h-5 w-5 rounded border-[color:var(--border-soft)] text-brand-600 md:h-[1.125rem] md:w-[1.125rem]',
        'focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 focus:ring-offset-shell-100',
        className
      )}
      onChange={(event) => onChange?.(event.target.checked)}
      {...props}
    />
  );
}

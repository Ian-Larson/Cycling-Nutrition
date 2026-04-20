import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  onChange?: (checked: boolean) => void;
}

export function Checkbox({ className, onChange, ...props }: CheckboxProps) {
  return (
    <span
      className={clsx(
        'relative inline-flex h-5 w-5 shrink-0 items-center justify-center',
        className
      )}
    >
      <input
        type="checkbox"
        onChange={(event) => onChange?.(event.target.checked)}
        className={clsx(
          'peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-md border bg-white transition-colors',
          'border-[color:var(--border-soft)] hover:border-brand-300',
          'checked:border-brand-500 checked:bg-brand-500',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-1 focus-visible:ring-offset-shell-100',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        {...props}
      />
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none relative h-3 w-3 origin-center scale-75 stroke-white opacity-0 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none peer-checked:scale-100 peer-checked:opacity-100"
      >
        <path
          d="M3 8.5 6.5 12 13 5"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

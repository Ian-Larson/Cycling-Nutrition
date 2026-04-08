import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl border font-body text-sm font-medium transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 focus:ring-offset-shell-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'border-brand-600 bg-brand-600 text-white hover:bg-brand-700': variant === 'primary',
          'border-[color:var(--border-soft)] bg-white text-ink-900 hover:bg-shell-50': variant === 'secondary',
          'border-transparent bg-transparent text-ink-700 hover:bg-shell-50 hover:text-ink-900': variant === 'ghost',
          'border-rose-600 bg-rose-600 text-white hover:bg-rose-700': variant === 'danger',
          'min-h-11 px-3.5 text-sm md:min-h-9 md:px-3': size === 'sm',
          'min-h-11 px-4 text-sm md:min-h-10': size === 'md',
          'min-h-11 px-5 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

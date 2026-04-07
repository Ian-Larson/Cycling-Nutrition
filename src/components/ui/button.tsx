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
        'inline-flex items-center justify-center gap-2 rounded-full border font-body font-semibold tracking-[0.04em] transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 focus:ring-offset-shell-50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'border-brand-700 bg-brand-600 text-shell-50 shadow-[0_20px_36px_-24px_rgb(145_66_24_/_0.72)] hover:-translate-y-0.5 hover:bg-brand-700': variant === 'primary',
          'border-[color:var(--border-soft)] bg-white text-ink-900 shadow-[0_14px_26px_-22px_rgb(72_36_12_/_0.45)] hover:-translate-y-0.5 hover:bg-shell-50': variant === 'secondary',
          'border-transparent bg-transparent text-ink-700 hover:bg-white/70 hover:text-ink-900': variant === 'ghost',
          'border-rose-800 bg-rose-700 text-shell-50 hover:bg-rose-800': variant === 'danger',
          'min-h-10 px-3.5 text-sm': size === 'sm',
          'min-h-11 px-[1.125rem] text-sm': size === 'md',
          'min-h-[3.25rem] px-6 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

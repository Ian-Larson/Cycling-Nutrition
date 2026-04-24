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
        'inline-flex items-center justify-center gap-2 rounded-xl border font-body text-sm font-medium',
        'transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out motion-reduce:transition-none',
        'motion-safe:hover:-translate-y-px motion-safe:active:translate-y-[1px]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        {
          'border-brand-500 bg-brand-500 text-white shadow-[0_12px_26px_-16px_rgba(248,98,46,0.74)] hover:border-brand-700 hover:bg-brand-700 hover:shadow-[0_16px_32px_-18px_rgba(248,98,46,0.82)]': variant === 'primary',
          'border-[color:var(--border-soft)] bg-white text-ink-900 hover:bg-shell-50 hover:shadow-[0_10px_22px_-18px_rgba(34,43,51,0.2)]': variant === 'secondary',
          'border-transparent bg-transparent text-ink-700 hover:bg-shell-50 hover:text-ink-900': variant === 'ghost',
          'border-error-600 bg-error-600 text-white shadow-[0_10px_22px_-18px_rgba(225,29,72,0.55)] hover:bg-error-700 hover:shadow-[0_14px_28px_-20px_rgba(225,29,72,0.62)]': variant === 'danger',
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

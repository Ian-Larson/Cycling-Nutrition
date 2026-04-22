import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Required — icon-only buttons must announce their purpose. */
  'aria-label': string;
}

const variantClasses: Record<IconButtonVariant, string> = {
  primary:
    'border-brand-500 bg-brand-500 text-white hover:border-brand-700 hover:bg-brand-700',
  secondary:
    'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50 hover:text-ink-900',
  ghost:
    'border-transparent bg-transparent text-ink-700 hover:bg-shell-50 hover:text-ink-900',
  danger:
    'border-error-600 bg-error-600 text-white hover:bg-error-700',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-11 w-11 md:h-8 md:w-8',
  md: 'h-11 w-11 md:h-10 md:w-10',
  lg: 'h-12 w-12 md:h-11 md:w-11',
};

export function IconButton({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-xl border',
        'transition-[background-color,color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

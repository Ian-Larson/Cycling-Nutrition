import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  title?: ReactNode;
  icon?: ReactNode;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-900',
  success: 'border-success-200 bg-success-50 text-success-900',
  warning: 'border-warning-200 bg-warning-50 text-warning-900',
  error: 'border-error-200 bg-error-50 text-error-900',
};

const iconClasses: Record<AlertVariant, string> = {
  info: 'text-brand-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  error: 'text-error-600',
};

const defaultIcons: Record<AlertVariant, ReactNode> = {
  info: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9v5M10 6.5v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="m6.5 10.25 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5">
      <path d="M10 2.5 18 17H2L10 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 8.5v3.5M10 14.5v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="m7 7 6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export function Alert({
  variant = 'info',
  title,
  icon,
  className,
  children,
  ...props
}: AlertProps) {
  const resolvedIcon = icon ?? defaultIcons[variant];
  const role = variant === 'error' ? 'alert' : 'status';
  const ariaLive = variant === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={clsx(
        'flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-6 md:px-4 md:py-3.5',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {resolvedIcon && (
        <span className={clsx('mt-0.5 shrink-0', iconClasses[variant])}>
          {resolvedIcon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && (
          <p className="font-semibold leading-snug">{title}</p>
        )}
        {children && (
          <div className={clsx(title && 'mt-1')}>{children}</div>
        )}
      </div>
    </div>
  );
}

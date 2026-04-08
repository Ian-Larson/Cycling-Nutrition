import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-[1.1rem] border bg-[var(--surface-panel)] shadow-[var(--shadow-soft)] md:rounded-2xl',
        'border-[color:var(--border-soft)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'border-b border-[color:var(--border-soft)] px-4 py-3 md:px-5 md:py-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx('px-4 py-3 md:px-5 md:py-4', className)} {...props}>
      {children}
    </div>
  );
}

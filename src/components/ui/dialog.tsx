import { clsx } from 'clsx';
import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';

type DialogSize = 'sm' | 'md' | 'lg';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: DialogSize;
  /** Prevents backdrop clicks from closing the dialog. */
  closeOnBackdropClick?: boolean;
  className?: string;
  /** Accessible label. Use when the dialog has no visible heading. */
  ariaLabel?: string;
  /** ID of the heading element that labels the dialog. */
  ariaLabelledBy?: string;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
};

export function Dialog({
  open,
  onClose,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  className,
  ariaLabel,
  ariaLabelledBy,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdropClick) return;
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onClick={handleClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={clsx(
        'm-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-4 shadow-[var(--shadow-float)]',
        'md:m-auto md:rounded-2xl md:p-6',
        'backdrop:bg-black/40 backdrop:backdrop-blur-sm',
        sizeClasses[size],
        className
      )}
    >
      {open ? children : null}
    </dialog>
  );
}

interface DialogHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
  titleId?: string;
}

export function DialogHeader({
  title,
  description,
  onClose,
  titleId,
  className,
  ...props
}: DialogHeaderProps) {
  return (
    <div
      className={clsx('flex items-start justify-between gap-3', className)}
      {...props}
    >
      <div className="min-w-0">
        <h2
          id={titleId}
          className="font-sans text-lg font-semibold text-ink-900"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-5 text-ink-600">{description}</p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5">
            <path
              d="m6 6 8 8M14 6l-8 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mt-4 space-y-4', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

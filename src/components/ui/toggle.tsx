import { clsx } from 'clsx';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full md:h-6 md:w-11',
        'transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transition-none',
        'motion-safe:hover:shadow-[var(--shadow-brand-glow-sm)] motion-safe:active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'absolute h-7 w-12 rounded-full border md:h-6 md:w-11',
          'transition-[background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
          checked
            ? 'border-brand-300 bg-brand-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]'
            : 'border-[color:var(--border-soft)] bg-shell-200'
        )}
      />
      <span
        className={clsx(
          'absolute left-2 h-5 w-5 rounded-full shadow-[0_3px_10px_-7px_rgb(0_0_0_/_0.35)] md:left-1 md:h-4 md:w-4',
          'transition-[transform,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
          checked ? 'bg-brand-500' : 'bg-white',
          checked
            ? 'translate-x-6 shadow-[var(--shadow-brand-glow-sm)]'
            : 'translate-x-0'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

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
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border md:h-6 md:w-11',
        'transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
        'motion-safe:hover:shadow-[0_8px_18px_-16px_rgba(217,63,13,0.7)] motion-safe:active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 focus:ring-offset-shell-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked
          ? 'border-brand-300 bg-brand-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]'
          : 'border-[color:var(--border-soft)] bg-shell-200'
      )}
    >
      <span
        className={clsx(
          'absolute h-5 w-5 rounded-full shadow-[0_3px_10px_-7px_rgb(0_0_0_/_0.35)] md:h-4 md:w-4',
          'transition-[transform,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
          checked ? 'bg-brand-600' : 'bg-white',
          checked
            ? 'translate-x-6 shadow-[0_6px_14px_-10px_rgba(132,41,13,0.75)]'
            : 'translate-x-1'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

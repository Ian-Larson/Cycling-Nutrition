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
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors md:h-6 md:w-11',
        'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 focus:ring-offset-shell-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked
          ? 'border-brand-300 bg-brand-200'
          : 'border-[color:var(--border-soft)] bg-shell-200'
      )}
    >
      <span
        className={clsx(
          'absolute h-5 w-5 rounded-full shadow-[0_3px_10px_-7px_rgb(0_0_0_/_0.35)] transition-transform md:h-4 md:w-4',
          checked ? 'bg-brand-700' : 'bg-white',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

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
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 focus:ring-offset-shell-50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked
          ? 'border-brand-700 bg-brand-600'
          : 'border-[color:var(--border-soft)] bg-shell-200'
      )}
    >
      <span
        className={clsx(
          'absolute h-[1.125rem] w-[1.125rem] rounded-full bg-white shadow-[0_4px_14px_-8px_rgb(0_0_0_/_0.45)] transition-transform',
          checked ? 'translate-x-[1.625rem]' : 'translate-x-1.5'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

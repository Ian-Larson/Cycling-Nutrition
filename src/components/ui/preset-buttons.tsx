import { clsx } from 'clsx';

interface PresetOption {
  label: string;
  value: number;
}

interface PresetButtonsProps {
  options: PresetOption[];
  value: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
}

export function PresetButtons({
  options,
  value,
  onChange,
  ariaLabel = 'Preset options',
}: PresetButtonsProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={clsx(
              'min-h-10 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
              selected
                ? 'border-brand-300 bg-brand-100 text-brand-800'
                : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

import { clsx } from 'clsx';

interface PresetOption {
  label: string;
  value: number;
}

interface PresetButtonsProps {
  options: PresetOption[];
  value: number;
  onChange: (value: number) => void;
}

export function PresetButtons({ options, value, onChange }: PresetButtonsProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            'min-h-10 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
            value === opt.value
              ? 'border-brand-300 bg-brand-100 text-brand-800'
              : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

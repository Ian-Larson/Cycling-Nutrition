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
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
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

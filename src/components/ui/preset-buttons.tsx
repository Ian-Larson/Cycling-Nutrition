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
            'rounded-full border px-3.5 py-1.5 text-sm font-semibold tracking-[0.03em] transition-all',
            value === opt.value
              ? 'border-brand-700 bg-brand-600 text-shell-50 shadow-[0_16px_28px_-24px_rgb(145_66_24_/_0.72)]'
              : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

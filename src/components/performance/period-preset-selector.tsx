import { clsx } from 'clsx';
import type { PeriodPreset } from '@/lib/performance/period';

const OPTIONS: readonly { key: PeriodPreset; label: string }[] = [
  { key: 'last-90d-vs-previous-90d', label: 'Last 90d' },
  { key: 'this-year-vs-last-year', label: 'This year' },
  { key: 'last-30d-vs-all-time-best', label: 'Last 30d' },
];

interface PeriodPresetSelectorProps {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset) => void;
}

export function PeriodPresetSelector({ value, onChange }: PeriodPresetSelectorProps) {
  return (
    <div className="inline-flex rounded-md border border-ink-200 bg-shell-50 p-0.5">
      {OPTIONS.map((opt) => {
        const pressed = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(opt.key)}
            className={clsx(
              'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
              pressed
                ? 'bg-ink-900 text-white'
                : 'text-ink-700 hover:bg-shell-100'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

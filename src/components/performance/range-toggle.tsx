import { clsx } from 'clsx';

export type RangeKey = '3mo' | '6mo' | '12mo' | 'all';

const OPTIONS: readonly { key: RangeKey; label: string }[] = [
  { key: '3mo', label: '3mo' },
  { key: '6mo', label: '6mo' },
  { key: '12mo', label: '12mo' },
  { key: 'all', label: 'All' },
];

interface RangeToggleProps {
  value: RangeKey;
  onChange: (key: RangeKey) => void;
}

export function RangeToggle({ value, onChange }: RangeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
      {OPTIONS.map((opt) => {
        const pressed = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(opt.key)}
            className={clsx(
              'px-3 py-1 text-sm font-medium rounded-sm transition-colors',
              pressed
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

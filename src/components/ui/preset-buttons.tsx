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
            'px-3 py-1 rounded-full text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-brand-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

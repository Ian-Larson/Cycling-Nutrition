import { clsx } from 'clsx';

interface GearTabsProps {
  value: 'due' | 'history';
  onChange: (v: 'due' | 'history') => void;
}

const TABS: Array<{ id: 'due' | 'history'; label: string }> = [
  { id: 'due', label: 'Due' },
  { id: 'history', label: 'History' },
];

export function GearTabs({ value, onChange }: GearTabsProps) {
  return (
    <div
      role="group"
      aria-label="Gear view"
      className="inline-flex gap-1 rounded-lg border border-[color:var(--border-soft)] bg-white p-1"
    >
      {TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'min-h-9 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-100 text-brand-900'
                : 'text-ink-700 hover:bg-shell-50'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

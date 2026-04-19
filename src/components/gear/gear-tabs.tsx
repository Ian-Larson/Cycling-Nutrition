import { clsx } from 'clsx';
import type { KeyboardEvent } from 'react';

interface GearTabsProps {
  value: GearTabValue;
  onChange: (v: GearTabValue) => void;
}

export type GearTabValue = 'active' | 'due' | 'parts' | 'history';

const TABS: Array<{ id: GearTabValue; label: string }> = [
  { id: 'active', label: 'Active setup' },
  { id: 'due', label: 'Due' },
  { id: 'parts', label: 'Parts' },
  { id: 'history', label: 'History' },
];

export function GearTabs({ value, onChange }: GearTabsProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === value);
    if (currentIndex === -1) return;

    const lastIndex = TABS.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    onChange(TABS[nextIndex].id);
  };

  return (
    <div
      role="tablist"
      aria-label="Gear view"
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[color:var(--border-soft)] bg-white p-1"
    >
      {TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={clsx(
              'min-h-9 shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200 sm:px-4',
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

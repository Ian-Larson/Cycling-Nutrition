import { clsx } from 'clsx';
import { useRef, type KeyboardEvent } from 'react';
import { gearPanelId, gearTabId, type GearTabValue } from './gear-tab-ids';

interface GearTabsProps {
  value: GearTabValue;
  onChange: (v: GearTabValue) => void;
}

const TABS: Array<{ id: GearTabValue; label: string }> = [
  { id: 'active', label: 'Active setup' },
  { id: 'due', label: 'Service' },
  { id: 'history', label: 'History' },
];

export function GearTabs({ value, onChange }: GearTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === value);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextTab = TABS[nextIndex];
    onChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Gear view"
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[color:var(--border-soft)] bg-white p-1"
    >
      {TABS.map((tab, index) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={gearTabId(tab.id)}
            aria-selected={active}
            aria-controls={gearPanelId(tab.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={clsx(
              'min-h-9 shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 sm:px-4',
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

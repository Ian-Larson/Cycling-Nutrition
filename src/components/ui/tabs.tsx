import { clsx } from 'clsx';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
  baseId: string;
  orientation: 'horizontal' | 'vertical';
  registerTab: (value: string, el: HTMLButtonElement | null) => void;
  focusTab: (direction: 1 | -1 | 'first' | 'last', from: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(`${componentName} must be used inside <Tabs>.`);
  }
  return ctx;
}

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  children: ReactNode;
  className?: string;
}

export function Tabs({
  value,
  onChange,
  orientation = 'horizontal',
  children,
  className,
}: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const orderRef = useRef<string[]>([]);

  const registerTab = useCallback(
    (tabValue: string, el: HTMLButtonElement | null) => {
      if (el) {
        tabRefs.current.set(tabValue, el);
        if (!orderRef.current.includes(tabValue)) {
          orderRef.current.push(tabValue);
        }
      } else {
        tabRefs.current.delete(tabValue);
        orderRef.current = orderRef.current.filter((v) => v !== tabValue);
      }
    },
    []
  );

  const focusTab = useCallback(
    (direction: 1 | -1 | 'first' | 'last', from: string) => {
      const order = orderRef.current;
      if (order.length === 0) return;
      let nextIndex: number;
      if (direction === 'first') {
        nextIndex = 0;
      } else if (direction === 'last') {
        nextIndex = order.length - 1;
      } else {
        const currentIndex = order.indexOf(from);
        nextIndex = (currentIndex + direction + order.length) % order.length;
      }
      const target = tabRefs.current.get(order[nextIndex]);
      target?.focus();
      if (target) onChange(order[nextIndex]);
    },
    [onChange]
  );

  const contextValue = useMemo(
    () => ({ value, onChange, baseId, orientation, registerTab, focusTab }),
    [value, onChange, baseId, orientation, registerTab, focusTab]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className} data-orientation={orientation}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: ReactNode;
  label: string;
  className?: string;
}

export function TabList({ children, label, className }: TabListProps) {
  const { orientation } = useTabsContext('TabList');
  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation={orientation}
      className={clsx('inline-flex gap-1', className)}
    >
      {children}
    </div>
  );
}

interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ value, children, disabled, className }: TabProps) {
  const ctx = useTabsContext('Tab');
  const selected = ctx.value === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const isHorizontal = ctx.orientation === 'horizontal';
    switch (event.key) {
      case isHorizontal ? 'ArrowRight' : 'ArrowDown':
        event.preventDefault();
        ctx.focusTab(1, value);
        break;
      case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
        event.preventDefault();
        ctx.focusTab(-1, value);
        break;
      case 'Home':
        event.preventDefault();
        ctx.focusTab('first', value);
        break;
      case 'End':
        event.preventDefault();
        ctx.focusTab('last', value);
        break;
    }
  };

  return (
    <button
      ref={(el) => ctx.registerTab(value, el)}
      id={tabId}
      role="tab"
      type="button"
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => ctx.onChange(value)}
      onKeyDown={handleKeyDown}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors md:min-h-10',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'bg-brand-500 text-white shadow-[var(--shadow-brand-glow-sm)]'
          : 'text-ink-700 hover:bg-shell-50 hover:text-ink-900',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
  /** Keep panel mounted when inactive (useful for preserving form state). */
  keepMounted?: boolean;
}

export function TabPanel({
  value,
  children,
  className,
  keepMounted = false,
}: TabPanelProps) {
  const ctx = useTabsContext('TabPanel');
  const active = ctx.value === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  if (!active && !keepMounted) return null;

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      hidden={!active}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { Bike } from '@/types/gear';
import type { GearUrgency } from '@/lib/gear/derive-active-setup';

interface BikeSwitcherProps {
  bikes: Bike[];
  selectedBikeId: string | null;
  selectedBikeName: string;
  selectedBikeUrgency: GearUrgency | null;
  perBikeUrgency: Record<string, GearUrgency | null>;
  worstAcrossGarage: GearUrgency | null;
  syncLabel: string | null;
  syncIsError: boolean;
  onSelect: (bikeId: string | null) => void;
  /** Triggered when the user picks the current bike from the menu's footer. */
  onRename: () => void;
}

function urgencyDotClass(urgency: GearUrgency | null): string | null {
  if (urgency === 'overdue') return 'bg-error-500';
  if (urgency === 'soon') return 'bg-warning-500';
  return null;
}

function urgencyAriaSuffix(urgency: GearUrgency | null): string {
  if (urgency === 'overdue') return ', service overdue';
  if (urgency === 'soon') return ', service due soon';
  return '';
}

interface UrgencyDotProps {
  urgency: GearUrgency | null;
  /** Smaller dot for trigger; default size for menu rows. */
  size?: 'sm' | 'md';
  ringColor?: 'shell' | 'panel';
}

function UrgencyDot({ urgency, size = 'md', ringColor = 'panel' }: UrgencyDotProps) {
  const dotClass = urgencyDotClass(urgency);
  if (!dotClass) return null;
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-block shrink-0 rounded-full',
        size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
        ringColor === 'shell'
          ? 'ring-2 ring-shell-100'
          : 'ring-2 ring-[var(--surface-panel)]',
        dotClass
      )}
    />
  );
}

export function BikeSwitcher({
  bikes,
  selectedBikeId,
  selectedBikeName,
  selectedBikeUrgency,
  perBikeUrgency,
  worstAcrossGarage,
  syncLabel,
  syncIsError,
  onSelect,
  onRename,
}: BikeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const triggerLabel =
    selectedBikeId === null ? 'Garage' : selectedBikeName || 'Pick a bike';
  const triggerUrgency =
    selectedBikeId === null ? worstAcrossGarage : selectedBikeUrgency;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Switch bike${urgencyAriaSuffix(triggerUrgency)}. Currently ${triggerLabel}.`}
        className={clsx(
          '-mx-1.5 -my-0.5 inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-left transition-colors',
          'hover:border-[color:var(--border-soft)] hover:bg-shell-50',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100'
        )}
      >
        <span className="truncate font-heading text-sm font-semibold tracking-tight text-ink-900">
          {triggerLabel}
        </span>
        <span
          aria-hidden
          className={clsx(
            'relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-ink-500 transition-transform duration-200',
            open && 'rotate-180'
          )}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
            <path
              d="M5 7.5 10 12.5 15 7.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {urgencyDotClass(triggerUrgency) ? (
            <span
              aria-hidden
              className={clsx(
                'absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-[var(--surface-panel)]',
                urgencyDotClass(triggerUrgency)
              )}
            />
          ) : null}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Select bike"
          className="absolute left-0 top-full z-30 mt-1.5 min-w-[14rem] max-w-[20rem] overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white shadow-[var(--shadow-float)]"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {bikes.map((bike) => {
              const urgency = perBikeUrgency[bike.id] ?? null;
              const selected = bike.id === selectedBikeId;
              return (
                <li key={bike.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      onSelect(bike.id);
                      setOpen(false);
                    }}
                    className={clsx(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      'hover:bg-shell-50 focus:outline-none focus-visible:bg-shell-50',
                      selected && 'bg-brand-50'
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-brand-700',
                        !selected && 'opacity-0'
                      )}
                    >
                      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                        <path
                          d="m3.5 8.5 3 3L12.5 5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink-900">
                        {bike.name}
                      </span>
                    </span>
                    {bike.isPrimary ? (
                      <span aria-hidden className="text-xs text-ink-500">
                        ·primary
                      </span>
                    ) : null}
                    <UrgencyDot urgency={urgency} />
                  </button>
                </li>
              );
            })}
            {bikes.length > 0 ? (
              <li>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selectedBikeId === null}
                  onClick={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                    'hover:bg-shell-50 focus:outline-none focus-visible:bg-shell-50',
                    selectedBikeId === null && 'bg-brand-50'
                  )}
                >
                  <span
                    aria-hidden
                    className={clsx(
                      'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-brand-700',
                      selectedBikeId !== null && 'opacity-0'
                    )}
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                      <path
                        d="m3.5 8.5 3 3L12.5 5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-ink-700">
                    All bikes
                  </span>
                  <UrgencyDot urgency={worstAcrossGarage} />
                </button>
              </li>
            ) : null}
          </ul>

          <div className="border-t border-[color:var(--border-soft)] bg-shell-50">
            {selectedBikeId !== null ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onRename();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 transition-colors hover:bg-shell-100 focus:outline-none focus-visible:bg-shell-100"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-ink-500"
                >
                  <path
                    d="M4 14.5 14 4.5l2 2L6 16.5H4v-2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Rename {selectedBikeName}</span>
              </button>
            ) : null}
            {syncLabel ? (
              <p
                className={clsx(
                  'px-3 py-2 text-xs leading-4',
                  syncIsError ? 'text-error-700' : 'text-ink-500'
                )}
              >
                {syncLabel}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

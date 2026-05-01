import { clsx } from 'clsx';

export interface StepDefinition<S extends number = number> {
  step: S;
  label: string;
}

interface StepNavigationProps<S extends number> {
  steps: ReadonlyArray<StepDefinition<S>>;
  current: S;
  /** Returns true if the step is reachable by the user right now. */
  canOpen: (step: S) => boolean;
  onSelect: (step: S) => void;
}

export function StepNavigation<S extends number>({
  steps,
  current,
  canOpen,
  onSelect,
}: StepNavigationProps<S>) {
  return (
    <section
      aria-label="Plan steps"
      className="grid gap-2 md:gap-3"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((item) => {
        const isActive = item.step === current;
        const isComplete = item.step < current;
        const isDisabled = !canOpen(item.step);

        return (
          <button
            key={item.step}
            type="button"
            disabled={isDisabled}
            aria-current={isActive ? 'step' : undefined}
            onClick={() => onSelect(item.step)}
            className={clsx(
              'min-h-[4rem] rounded-lg border px-3 py-2 text-left md:min-h-[4.25rem] md:px-4 md:py-2.5',
              'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
              'disabled:cursor-not-allowed',
              isActive &&
                'border-brand-500 bg-brand-500 text-white shadow-[var(--shadow-brand-glow-md)]',
              !isActive &&
                isComplete &&
                'border-brand-200 bg-white text-ink-900 hover:bg-brand-50',
              !isActive &&
                !isComplete &&
                'border-[color:var(--border-soft)] bg-white text-ink-600 hover:bg-shell-50 disabled:text-ink-400 disabled:hover:bg-white'
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[0.7rem] font-semibold opacity-80 md:text-xs">
                Step {item.step}
              </span>
              {isComplete ? (
                <span
                  aria-label="Completed"
                  className="flex items-center text-brand-700"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden
                    className="h-3.5 w-3.5"
                  >
                    <path
                      d="M5.5 10.5 8.5 13.5 14.5 6.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
            </span>
            <span className="mt-1 block font-sans text-sm font-semibold leading-none md:text-base">
              {item.label}
            </span>
          </button>
        );
      })}
    </section>
  );
}

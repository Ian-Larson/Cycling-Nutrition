interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function Stepper({ value, onChange, min = 0, max = 99, label }: StepperProps) {
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <div className="flex items-center gap-2.5">
      {label && (
        <span className="mr-1 text-xs font-medium text-ink-500">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => canDecrement && onChange(value - 1)}
        disabled={!canDecrement}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-white text-sm font-medium text-ink-700 transition-colors enabled:hover:bg-shell-50 disabled:cursor-not-allowed disabled:opacity-30 md:h-8 md:w-8 md:rounded-lg"
        aria-label="Decrease"
      >
        -
      </button>
      <span className="min-w-[2rem] text-center font-sans text-base font-medium text-ink-900 tabular-nums md:min-w-[1.75rem]">
        {value}
      </span>
      <button
        type="button"
        onClick={() => canIncrement && onChange(value + 1)}
        disabled={!canIncrement}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-white text-sm font-medium text-ink-700 transition-colors enabled:hover:bg-shell-50 disabled:cursor-not-allowed disabled:opacity-30 md:h-8 md:w-8 md:rounded-lg"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

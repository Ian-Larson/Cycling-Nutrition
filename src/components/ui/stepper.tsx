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
    <div className="flex items-center gap-2">
      {label && (
        <span className="mr-1 text-xs font-medium text-ink-500">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => canDecrement && onChange(value - 1)}
        disabled={!canDecrement}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white text-sm font-medium text-ink-700 transition-colors enabled:hover:bg-shell-50 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Decrease"
      >
        -
      </button>
      <span className="min-w-[1.75rem] text-center font-sans text-base font-medium text-ink-900 tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => canIncrement && onChange(value + 1)}
        disabled={!canIncrement}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white text-sm font-medium text-ink-700 transition-colors enabled:hover:bg-shell-50 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

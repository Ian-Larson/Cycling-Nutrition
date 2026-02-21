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
      {label && <span className="text-xs text-gray-500 mr-1">{label}</span>}
      <button
        type="button"
        onClick={() => canDecrement && onChange(value - 1)}
        disabled={!canDecrement}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm font-medium transition-colors enabled:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Decrease"
      >
        -
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => canIncrement && onChange(value + 1)}
        disabled={!canIncrement}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm font-medium transition-colors enabled:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

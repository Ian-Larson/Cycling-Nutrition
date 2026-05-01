import { useId } from 'react';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /** Hide the visible label, keep it for assistive tech only. */
  hideLabel?: boolean;
  /** Optional formatter for the displayed value (e.g., "75 g/h"). */
  formatValue?: (value: number) => string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  hideLabel,
  formatValue,
}: StepperProps) {
  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;
  const ariaValueId = useId();

  return (
    <div className="flex items-center gap-2.5">
      {label && !hideLabel && (
        <span className="mr-1 text-xs font-medium text-ink-500">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => canDecrement && onChange(value - step)}
        disabled={!canDecrement}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-white text-sm font-medium text-ink-700 transition-[background-color,transform,box-shadow] duration-150 ease-out enabled:hover:bg-shell-50 motion-safe:enabled:active:scale-[0.94] motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 disabled:cursor-not-allowed disabled:opacity-30 md:h-8 md:w-8 md:rounded-lg"
        aria-label={label ? `Decrease ${label}` : 'Decrease'}
        aria-controls={ariaValueId}
      >
        -
      </button>
      <span
        id={ariaValueId}
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label ? `${label} value` : 'Value'}
        aria-live="polite"
        aria-atomic="true"
        className="min-w-[2.5rem] text-center font-sans text-base font-medium text-ink-900 tabular-nums md:min-w-[2rem]"
      >
        {formatValue ? formatValue(value) : value}
      </span>
      <button
        type="button"
        onClick={() => canIncrement && onChange(value + step)}
        disabled={!canIncrement}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-white text-sm font-medium text-ink-700 transition-[background-color,transform,box-shadow] duration-150 ease-out enabled:hover:bg-shell-50 motion-safe:enabled:active:scale-[0.94] motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 disabled:cursor-not-allowed disabled:opacity-30 md:h-8 md:w-8 md:rounded-lg"
        aria-label={label ? `Increase ${label}` : 'Increase'}
        aria-controls={ariaValueId}
      >
        +
      </button>
    </div>
  );
}

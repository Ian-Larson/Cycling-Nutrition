import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  displayValue?: string;
}

export function Slider({
  label,
  displayValue,
  className,
  id,
  ...props
}: SliderProps) {
  return (
    <div className="space-y-2">
      {(label || displayValue) && (
        <div className="flex justify-between">
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-gray-700">
              {label}
            </label>
          )}
          {displayValue && (
            <span className="text-sm font-semibold text-brand-600">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        id={id}
        className={clsx(
          'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer',
          'accent-brand-600',
          className
        )}
        {...props}
      />
    </div>
  );
}

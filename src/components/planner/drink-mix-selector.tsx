import { clsx } from 'clsx';
import { Checkbox } from '@/components/ui';
import type { Product } from '@/types';

interface DrinkMixSelectorProps {
  drinkMixes: Product[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export function DrinkMixSelector({
  drinkMixes,
  selectedId,
  onChange,
}: DrinkMixSelectorProps) {
  if (drinkMixes.length === 0) return null;

  const effectiveSelectedId = selectedId ?? drinkMixes[0].id;

  return (
    <div className="space-y-3">
      {drinkMixes.map((mix) => {
        const isSelected = mix.id === effectiveSelectedId;
        return (
          <label
            key={mix.id}
            htmlFor={`drink-mix-${mix.id}`}
            className={clsx(
              'flex cursor-pointer items-center justify-between gap-3 rounded-[1.25rem] border p-4 transition-colors',
              isSelected
                ? 'border-brand-300 bg-[color:color-mix(in_oklch,var(--color-brand-50)_78%,white)] shadow-[0_16px_32px_-26px_rgb(145_66_24_/_0.35)]'
                : 'border-[color:var(--border-soft)] bg-white hover:bg-shell-50'
            )}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                id={`drink-mix-${mix.id}`}
                checked={isSelected}
                onChange={(checked) => {
                  if (checked) {
                    onChange(mix.id);
                  }
                }}
                aria-label={`Select ${mix.name}`}
              />
              <div>
                <p className="font-semibold text-ink-900">{mix.name}</p>
                <p className="mt-1 text-sm leading-6 text-ink-600">
                  {mix.nutrition.carbsGrams}g carbs/serving
                </p>
                {!mix.isAvailable && (
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-amber-700">
                    Unavailable in inventory
                  </p>
                )}
              </div>
            </div>
            <div
              className={clsx(
                'rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]',
                isSelected
                  ? 'bg-brand-600 text-shell-50'
                  : 'bg-shell-100 text-ink-600'
              )}
            >
              {isSelected ? 'Primary mix' : 'Tap to use'}
            </div>
          </label>
        );
      })}
    </div>
  );
}

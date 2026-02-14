import { clsx } from 'clsx';
import { Radio } from '@/components/ui';
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
    <div className="space-y-3" role="radiogroup" aria-label="Drink mix">
      {drinkMixes.map((mix) => {
        const isSelected = mix.id === effectiveSelectedId;
        return (
          <label
            key={mix.id}
            htmlFor={`drink-mix-${mix.id}`}
            className={clsx(
              'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
              isSelected
                ? 'border-brand-200 bg-brand-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            )}
          >
            <div className="flex items-center gap-3">
              <Radio
                id={`drink-mix-${mix.id}`}
                name="drink-mix"
                checked={isSelected}
                onChange={() => onChange(mix.id)}
                aria-label={`Select ${mix.name}`}
              />
              <p className="font-medium text-sm">{mix.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {mix.nutrition.carbsGrams}g carbs/serving
              </p>
              {isSelected && (
                <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                  Selected
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

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
              'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
              isSelected
                ? 'border-brand-200 bg-brand-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
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
                <p className="font-medium text-sm">{mix.name}</p>
                <p className="text-xs text-gray-500">
                  {mix.nutrition.carbsGrams}g carbs/serving
                </p>
              </div>
            </div>
            <div className="text-xs font-medium text-gray-500">
              {isSelected ? 'Included' : 'Not included'}
            </div>
          </label>
        );
      })}
    </div>
  );
}

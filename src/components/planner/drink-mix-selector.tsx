import { Toggle } from '@/components/ui';
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

  return (
    <div className="space-y-3">
      {drinkMixes.map((mix) => {
        const isSelected = mix.id === selectedId;
        return (
          <div
            key={mix.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium text-sm">{mix.name}</p>
              <p className="text-xs text-gray-500">
                {mix.nutrition.carbsGrams}g carbs/serving
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Toggle
                checked={isSelected}
                onChange={() => onChange(isSelected ? null : mix.id)}
              />
              <span className="text-sm text-gray-500 w-10">
                {isSelected ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

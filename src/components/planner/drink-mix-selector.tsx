import { Toggle } from '@/components/ui';
import type { Product } from '@/types';

interface DrinkMixSelectorProps {
  drinkMixes: Product[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function DrinkMixSelector({
  drinkMixes,
  selectedId,
  onChange,
}: DrinkMixSelectorProps) {
  if (drinkMixes.length === 0) return null;

  const activeId = selectedId || drinkMixes[0].id;

  return (
    <div className="space-y-3">
      {drinkMixes.map((mix) => {
        const isSelected = mix.id === activeId;
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
                onChange={() => {
                  if (!isSelected) onChange(mix.id);
                }}
              />
              <span className="text-sm text-gray-500 w-16">
                {isSelected ? 'Active' : 'Off'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

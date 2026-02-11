import { Select } from '@/components/ui';
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

  return (
    <Select
      label="Drink Mix"
      value={selectedId || drinkMixes[0].id}
      onChange={(e) => onChange(e.target.value)}
      options={drinkMixes.map((m) => ({
        value: m.id,
        label: `${m.name} — ${m.nutrition.carbsGrams}g carbs/serving`,
      }))}
    />
  );
}

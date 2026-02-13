import { Card, CardContent, CardHeader } from '@/components/ui';
import { DrinkMixSelector } from './drink-mix-selector';
import { SolidFuelSelector } from './solid-fuel-selector';
import type { Product } from '@/types';

interface FuelOptionsCardProps {
  drinkMixes: Product[];
  solidProducts: Product[];
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
  onDrinkMixChange: (id: string | null) => void;
  onSolidChange: (ids: string[]) => void;
}

export function FuelOptionsCard({
  drinkMixes,
  solidProducts,
  selectedDrinkMixId,
  selectedSolidIds,
  onDrinkMixChange,
  onSolidChange,
}: FuelOptionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Fuel Options</h2>
      </CardHeader>
      <CardContent className="space-y-6">
        {drinkMixes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Drink Mix</h3>
            <DrinkMixSelector
              drinkMixes={drinkMixes}
              selectedId={selectedDrinkMixId}
              onChange={onDrinkMixChange}
            />
          </div>
        )}

        {drinkMixes.length > 0 && <div className="border-t border-gray-200" />}

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Solids</h3>
          <SolidFuelSelector
            solidProducts={solidProducts}
            selectedIds={selectedSolidIds}
            onChange={onSolidChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}

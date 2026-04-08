import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui';
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
  const selectedSolidCount = selectedSolidIds.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[color:color-mix(in_srgb,var(--color-shell-100)_78%,white)]">
        <p className="section-kicker">Fuel</p>
        <h2 className="section-title">Fuel</h2>
        <p className="section-copy">
          Choose one drink mix, then add solids if needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {drinkMixes.length > 0 && (
          <section className="rounded-[1.1rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_82%,white)] p-4 md:p-5">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-[color:var(--border-soft)] pb-3">
              <div>
                <p className="section-kicker text-[0.68rem]">Drink Mix</p>
                <h3 className="section-title text-lg">Drink Mix</h3>
              </div>
              <p className="text-sm leading-6 text-ink-600">1 selected</p>
            </div>
            <DrinkMixSelector
              drinkMixes={drinkMixes}
              selectedId={selectedDrinkMixId}
              onChange={onDrinkMixChange}
            />
          </section>
        )}

        <section className="rounded-[1.1rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_82%,white)] p-4 md:p-5">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-[color:var(--border-soft)] pb-3">
            <div>
              <p className="section-kicker text-[0.68rem]">Solids</p>
              <h3 className="section-title text-lg">Solids</h3>
            </div>
            <p className="text-sm leading-6 text-ink-600">
              {selectedSolidCount > 0 ? `${selectedSolidCount} selected` : 'Optional'}
            </p>
          </div>
          <SolidFuelSelector
            solidProducts={solidProducts}
            selectedIds={selectedSolidIds}
            onChange={onSolidChange}
          />
        </section>
      </CardContent>
    </Card>
  );
}

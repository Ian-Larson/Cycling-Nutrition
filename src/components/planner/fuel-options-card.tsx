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
      <CardHeader className="bg-[var(--surface-soft)]">
        <h2 className="section-title">Fuel</h2>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {drinkMixes.length > 0 && (
          <section className="rounded-[1.05rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_88%,white)] p-3.5 md:rounded-[1.1rem] md:p-5">
            <div className="mb-3 border-b border-[color:var(--border-soft)] pb-2.5 md:mb-4 md:pb-3">
              <h3 className="text-sm font-semibold text-ink-900">Drink mix</h3>
            </div>
            <DrinkMixSelector
              drinkMixes={drinkMixes}
              selectedId={selectedDrinkMixId}
              onChange={onDrinkMixChange}
            />
          </section>
        )}

        <section className="rounded-[1.05rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_88%,white)] p-3.5 md:rounded-[1.1rem] md:p-5">
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-[color:var(--border-soft)] pb-2.5 md:mb-4 md:pb-3">
            <h3 className="text-sm font-semibold text-ink-900">Solids</h3>
            {selectedSolidCount > 0 ? (
              <p className="text-sm leading-6 text-ink-600">
                {selectedSolidCount} selected
              </p>
            ) : null}
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

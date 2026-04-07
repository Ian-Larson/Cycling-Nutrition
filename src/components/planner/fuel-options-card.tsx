import {
  Card,
  CardContent,
  CardHeader,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
      <CardHeader className="space-y-2 bg-white/50">
        <p className="section-kicker">Fuel Kit</p>
        <h2 className="section-title">Choose what you will pack</h2>
        <p className="section-copy">
          Start with one primary bottle mix. Add solids only if you want extra
          flexibility on the bike.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {drinkMixes.length > 0 && (
          <div className="space-y-3">
            <div>
              <p className="section-kicker text-[0.68rem]">Primary Mix</p>
              <h3 className="section-title text-lg">Bottle drink mix</h3>
            </div>
            <DrinkMixSelector
              drinkMixes={drinkMixes}
              selectedId={selectedDrinkMixId}
              onChange={onDrinkMixChange}
            />
          </div>
        )}

        <Collapsible
          defaultOpen={selectedSolidCount > 0}
          className="surface-note overflow-hidden"
        >
          <CollapsibleTrigger className="px-4 py-3 md:px-5" showChevron>
            <div>
              <p className="section-kicker text-[0.68rem]">Optional Extras</p>
              <h3 className="section-title text-lg">Solid fuel</h3>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                {selectedSolidCount > 0
                  ? `${selectedSolidCount} solid option${selectedSolidCount === 1 ? '' : 's'} selected for this plan.`
                  : 'Skip this for a bottle-only plan, or add gels, chews, and bars for extra flexibility.'}
              </p>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-[color:var(--border-soft)] px-4 py-4 md:px-5">
            <SolidFuelSelector
              solidProducts={solidProducts}
              selectedIds={selectedSolidIds}
              onChange={onSolidChange}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

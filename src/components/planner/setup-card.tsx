import { useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui';
import type { Bottle, Product } from '@/types';

interface SetupCardProps {
  bottles: Bottle[];
  drinkMixes: Product[];
  solidProducts: Product[];
  selectedBottleIds: string[];
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
  onBottleIdsChange: (ids: string[]) => void;
  onDrinkMixChange: (id: string | null) => void;
  onSolidChange: (ids: string[]) => void;
}

function SelectionRow({
  id,
  title,
  subtitle,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex cursor-pointer items-start justify-between gap-3 rounded-[0.95rem] border px-3 py-3 transition-colors',
        checked
          ? 'border-brand-300 bg-brand-50/60'
          : 'border-[color:var(--border-soft)] bg-white hover:bg-shell-50'
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">{title}</p>
        <p
          className={clsx(
            'mt-1 text-sm leading-5',
            checked ? 'text-brand-800' : 'text-ink-600'
          )}
        >
          {subtitle}
        </p>
      </div>
      <Checkbox id={id} checked={checked} onChange={onChange} />
    </label>
  );
}

function getFuelSummary(
  selectedDrinkMix: Product | null,
  selectedSolidCount: number
): string {
  if (!selectedDrinkMix && selectedSolidCount === 0) return 'Select fuel';
  if (!selectedDrinkMix) {
    return `${selectedSolidCount} solid${selectedSolidCount === 1 ? '' : 's'}`;
  }
  if (selectedSolidCount === 0) return selectedDrinkMix.name;
  return `${selectedDrinkMix.name} • ${selectedSolidCount} solid${selectedSolidCount === 1 ? '' : 's'}`;
}

export function SetupCard({
  bottles,
  drinkMixes,
  solidProducts,
  selectedBottleIds,
  selectedDrinkMixId,
  selectedSolidIds,
  onBottleIdsChange,
  onDrinkMixChange,
  onSolidChange,
}: SetupCardProps) {
  const [bottlesOpen, setBottlesOpen] = useState(selectedBottleIds.length === 0);
  const [fuelOpen, setFuelOpen] = useState(selectedDrinkMixId === null);

  const selectedDrinkMix =
    drinkMixes.find((mix) => mix.id === selectedDrinkMixId) ?? null;

  const toggleBottle = (bottleId: string) => {
    if (selectedBottleIds.includes(bottleId)) {
      onBottleIdsChange(selectedBottleIds.filter((id) => id !== bottleId));
      return;
    }

    onBottleIdsChange([...selectedBottleIds, bottleId]);
  };

  const toggleSolid = (productId: string) => {
    if (selectedSolidIds.includes(productId)) {
      onSolidChange(selectedSolidIds.filter((id) => id !== productId));
      return;
    }

    onSolidChange([...selectedSolidIds, productId]);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1.5 bg-[var(--surface-soft)]">
        <h2 className="section-title">Setup</h2>
        <p className="section-copy">Choose bottles and fuel.</p>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <Collapsible
          open={bottlesOpen}
          onOpenChange={setBottlesOpen}
          className="overflow-hidden rounded-[1.1rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_82%,white)]"
        >
          <CollapsibleTrigger className="px-4 py-3.5 md:px-5 md:py-4">
            <div className="min-w-0">
              <p className="section-title text-base">Bottles</p>
              <p className="mt-1 text-sm leading-5 text-brand-800">
                {selectedBottleIds.length === 0
                  ? 'Select bottles'
                  : `${selectedBottleIds.length} selected`}
              </p>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-[color:var(--border-soft)] px-4 py-4 md:px-5">
            {bottles.length === 0 ? (
              <p className="text-sm leading-6 text-ink-600">
                No bottles saved.{' '}
                <Link to="/inventory" className="font-semibold text-brand-700 underline">
                  Add bottles
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {bottles.map((bottle) => (
                  <SelectionRow
                    key={bottle.id}
                    id={`planner-bottle-${bottle.id}`}
                    title={bottle.name}
                    subtitle={`${bottle.capacityMl}ml`}
                    checked={selectedBottleIds.includes(bottle.id)}
                    onChange={() => toggleBottle(bottle.id)}
                  />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          open={fuelOpen}
          onOpenChange={setFuelOpen}
          className="overflow-hidden rounded-[1.1rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_82%,white)]"
        >
          <CollapsibleTrigger className="px-4 py-3.5 md:px-5 md:py-4">
            <div className="min-w-0">
              <p className="section-title text-base">Fuel</p>
              <p className="mt-1 truncate text-sm leading-5 text-brand-800">
                {getFuelSummary(selectedDrinkMix, selectedSolidIds.length)}
              </p>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 border-t border-[color:var(--border-soft)] px-4 py-4 md:px-5">
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink-900">Drink mix</h3>
                {selectedDrinkMix ? (
                  <p className="text-sm leading-5 text-brand-700">1 selected</p>
                ) : null}
              </div>
              {drinkMixes.length === 0 ? (
                <p className="text-sm leading-6 text-ink-600">
                  No drink mixes saved.{' '}
                  <Link to="/inventory" className="font-semibold text-brand-700 underline">
                    Add fuel
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-2">
                  {drinkMixes.map((mix) => (
                    <SelectionRow
                      key={mix.id}
                      id={`planner-mix-${mix.id}`}
                      title={mix.name}
                      subtitle={`${mix.nutrition.carbsGrams}g carbs • ${mix.nutrition.calories} kcal`}
                      checked={selectedDrinkMixId === mix.id}
                      onChange={(checked) =>
                        onDrinkMixChange(checked ? mix.id : null)
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink-900">Solids</h3>
                {selectedSolidIds.length > 0 ? (
                  <p className="text-sm leading-5 text-brand-700">
                    {selectedSolidIds.length} selected
                  </p>
                ) : null}
              </div>
              {solidProducts.length === 0 ? (
                <p className="text-sm leading-6 text-ink-600">
                  No solid fuel saved.{' '}
                  <Link to="/inventory" className="font-semibold text-brand-700 underline">
                    Add fuel
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-2">
                  {solidProducts.map((product) => (
                    <SelectionRow
                      key={product.id}
                      id={`planner-solid-${product.id}`}
                      title={product.name}
                      subtitle={`${product.nutrition.carbsGrams}g carbs • ${product.nutrition.calories} kcal`}
                      checked={selectedSolidIds.includes(product.id)}
                      onChange={() => toggleSolid(product.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

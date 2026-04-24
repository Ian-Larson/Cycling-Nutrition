import { Link } from 'react-router-dom';
import { Toggle } from '@/components/ui';
import { BOTTLE_SIZES, totalBottleCount } from '@/types/bottle';
import type { BottleInventory } from '@/types/bottle';
import type { Product } from '@/types';
import { NutritionRailPanel } from './nutrition-rail';

const PRODUCT_TYPE_LABELS: Record<Product['type'], string> = {
  drink_mix: 'Drink mix',
  gel: 'Gel',
  chews: 'Chews',
  bar: 'Bar',
  other: 'Other',
};

interface InventoryRailPanelProps {
  bottleCounts: BottleInventory;
  products: Product[];
  onToggleProductAvailability: (productId: string, isAvailable: boolean) => void;
}

export function InventoryRailPanel({
  bottleCounts,
  products,
  onToggleProductAvailability,
}: InventoryRailPanelProps) {
  const bottleTotal = totalBottleCount(bottleCounts);
  const availableProducts = products.filter((product) => product.isAvailable);
  const drinkMixCount = products.filter((product) => product.type === 'drink_mix').length;
  const solidCount = products.filter((product) => product.type !== 'drink_mix').length;

  return (
    <NutritionRailPanel
      title="Inventory"
      summary={`${bottleTotal} bottles - ${availableProducts.length} fuel available`}
      defaultOpen
    >
      <div className="space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">Bottles</h3>
            <span className="text-sm text-ink-600">{bottleTotal} total</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BOTTLE_SIZES.map((size) => (
              <div
                key={size}
                className="rounded-xl border border-[color:var(--border-soft)] bg-shell-50 px-2 py-2 text-center"
              >
                <p className="text-[0.7rem] font-semibold text-ink-500">
                  {size}ml
                </p>
                <p className="mt-1 font-sans text-lg font-semibold tabular-nums text-ink-900">
                  {bottleCounts[size]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">Fuel</h3>
            <span className="text-sm text-ink-600">
              {drinkMixCount} mix - {solidCount} solids
            </span>
          </div>

          {products.length === 0 ? (
            <p className="rounded-xl border border-[color:var(--border-soft)] bg-shell-50 px-3 py-3 text-sm leading-5 text-ink-600">
              No fuel saved yet.
            </p>
          ) : (
            <div className="max-h-[22rem] divide-y divide-[color:var(--border-soft)] overflow-y-auto rounded-xl border border-[color:var(--border-soft)] bg-white">
              {products.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs leading-5 text-ink-600">
                      {PRODUCT_TYPE_LABELS[product.type]} -{' '}
                      {product.nutrition.carbsGrams}g carbs
                    </p>
                  </div>
                  <Toggle
                    checked={product.isAvailable}
                    onChange={(checked) =>
                      onToggleProductAvailability(product.id, checked)
                    }
                    label={`Use ${product.name} in planning`}
                  />
                </div>
              ))}
            </div>
          )}

          {products.length > 8 ? (
            <p className="text-xs leading-5 text-ink-500">
              Showing 8 of {products.length}. Open inventory for the full list.
            </p>
          ) : null}
        </section>

        <Link
          to="/inventory"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-shell-50"
        >
          Manage inventory
        </Link>
      </div>
    </NutritionRailPanel>
  );
}

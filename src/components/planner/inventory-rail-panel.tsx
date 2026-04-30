import { Link } from 'react-router-dom';
import { Toggle } from '@/components/ui';
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
  products: Product[];
  onToggleProductAvailability: (productId: string, isAvailable: boolean) => void;
}

function formatFuelCounter(drinkMixCount: number, solidCount: number): string {
  const solidPart =
    solidCount === 0 ? '' : `${solidCount} ${solidCount === 1 ? 'solid' : 'solids'}`;
  const mixPart = drinkMixCount === 0 ? '' : `${drinkMixCount} drink mix`;

  if (mixPart && solidPart) return `${mixPart} · ${solidPart}`;
  return mixPart || solidPart;
}

export function InventoryRailPanel({
  products,
  onToggleProductAvailability,
}: InventoryRailPanelProps) {
  const drinkMixCount = products.filter((product) => product.type === 'drink_mix').length;
  const solidCount = products.filter((product) => product.type !== 'drink_mix').length;
  const counterSummary = formatFuelCounter(drinkMixCount, solidCount);

  return (
    <NutritionRailPanel
      title="Fuel Inventory"
      summary={counterSummary || undefined}
      defaultOpen
    >
      <div className="space-y-3">
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { Toggle } from '@/components/ui';
import type { Product } from '@/types';
import { NutritionRailPanel } from './nutrition-rail';

type ProductFilter = 'all' | 'drink_mix' | 'solid';

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

function matchesFilter(product: Product, filter: ProductFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'drink_mix') return product.type === 'drink_mix';
  return product.type !== 'drink_mix';
}

export function InventoryRailPanel({
  products,
  onToggleProductAvailability,
}: InventoryRailPanelProps) {
  const [filter, setFilter] = useState<ProductFilter>('all');

  const drinkMixCount = products.filter((p) => p.type === 'drink_mix').length;
  const solidCount = products.length - drinkMixCount;
  const filteredProducts = products.filter((p) => matchesFilter(p, filter));
  const visibleProducts = filteredProducts.slice(0, 8);

  const filters: Array<{ value: ProductFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: products.length },
    { value: 'drink_mix', label: 'Drink mix', count: drinkMixCount },
    { value: 'solid', label: 'Solids', count: solidCount },
  ];

  const summary =
    products.length === 0
      ? undefined
      : `${drinkMixCount} drink mix · ${solidCount} ${
          solidCount === 1 ? 'solid' : 'solids'
        }`;

  return (
    <NutritionRailPanel title="Fuel inventory" summary={summary} defaultOpen>
      <div className="space-y-3">
        {products.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {filters.map(({ value, label, count }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={clsx(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-brand-100 text-brand-900'
                      : 'bg-shell-100 text-ink-700 hover:bg-shell-200'
                  )}
                >
                  {label}
                  <span className="ml-1 text-[0.66rem] text-ink-500 tabular-nums">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {products.length === 0 ? (
          <p className="text-sm leading-5 text-ink-600">No fuel saved yet.</p>
        ) : visibleProducts.length === 0 ? (
          <p className="text-sm leading-5 text-ink-600">
            No fuel matches this filter.
          </p>
        ) : (
          <ul className="max-h-[22rem] divide-y divide-[color:var(--border-soft)] overflow-y-auto">
            {visibleProducts.map((product, index) => (
              <li
                key={product.id}
                className={clsx(
                  'flex items-center justify-between gap-3 py-2.5',
                  index === 0 && 'pt-0'
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {product.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs leading-5 text-ink-600">
                    {PRODUCT_TYPE_LABELS[product.type]} ·{' '}
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
              </li>
            ))}
          </ul>
        )}

        {filteredProducts.length > 8 ? (
          <p className="text-xs leading-5 text-ink-500">
            Showing 8 of {filteredProducts.length}. Open inventory for the full
            list.
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

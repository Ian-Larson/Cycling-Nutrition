import { useState } from 'react';
import { clsx } from 'clsx';
import { Toggle } from '@/components/ui';
import { ProductForm } from '@/components/products/product-form';
import { useStore } from '@/store';
import type { Product } from '@/types';
import { NutritionRailPanel } from './nutrition-rail';

type ProductFilter = 'all' | 'drink_mix' | 'solid';
type EditorMode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; productId: string };

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
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const [filter, setFilter] = useState<ProductFilter>('all');
  const [mode, setMode] = useState<EditorMode>({ kind: 'list' });

  const drinkMixCount = products.filter((p) => p.type === 'drink_mix').length;
  const solidCount = products.length - drinkMixCount;
  const filteredProducts = products.filter((p) => matchesFilter(p, filter));
  const visibleProducts = filteredProducts.slice(0, 8);

  const filters: Array<{ value: ProductFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: products.length },
    { value: 'drink_mix', label: 'Drink mix', count: drinkMixCount },
    { value: 'solid', label: 'Solids', count: solidCount },
  ];

  const editingProduct =
    mode.kind === 'edit'
      ? products.find((product) => product.id === mode.productId) ?? null
      : null;

  const summary =
    products.length === 0
      ? undefined
      : `${drinkMixCount} drink mix · ${solidCount} ${
          solidCount === 1 ? 'solid' : 'solids'
        }`;

  const handleAdd = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    addProduct(data);
    setMode({ kind: 'list' });
  };

  const handleEdit = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (mode.kind !== 'edit') return;
    updateProduct(mode.productId, data);
    setMode({ kind: 'list' });
  };

  const handleDelete = () => {
    if (mode.kind !== 'edit') return;
    deleteProduct(mode.productId);
    setMode({ kind: 'list' });
  };

  const cancelEditor = () => setMode({ kind: 'list' });

  return (
    <NutritionRailPanel title="Fuel inventory" summary={summary} defaultOpen>
      {mode.kind === 'add' ? (
        <div className="space-y-3">
          <p className="section-kicker text-[0.66rem] text-ink-500">Add fuel</p>
          <ProductForm
            compact
            onSubmit={handleAdd}
            onCancel={cancelEditor}
            submitLabel="Add fuel"
          />
        </div>
      ) : editingProduct ? (
        <div className="space-y-3">
          <p className="section-kicker text-[0.66rem] text-ink-500">
            Edit {editingProduct.name}
          </p>
          <ProductForm
            compact
            initialData={editingProduct}
            onSubmit={handleEdit}
            onCancel={cancelEditor}
            onDelete={handleDelete}
            submitLabel="Save"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {products.length > 0
              ? filters.map(({ value, label, count }) => {
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
                })
              : null}
            <button
              type="button"
              onClick={() => setMode({ kind: 'add' })}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
              aria-label="Add fuel"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="h-3 w-3"
              >
                <path
                  d="M8 3.5v9M3.5 8h9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Add fuel
            </button>
          </div>

          {products.length === 0 ? (
            <p className="text-sm leading-5 text-ink-600">
              No fuel saved yet. Add your first drink mix, gel, chew, or bar
              with the button above.
            </p>
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
                  <button
                    type="button"
                    onClick={() => setMode({ kind: 'edit', productId: product.id })}
                    className="-mx-1 min-w-0 flex-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                    aria-label={`Edit ${product.name}`}
                  >
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs leading-5 text-ink-600">
                      {PRODUCT_TYPE_LABELS[product.type]} ·{' '}
                      {product.nutrition.carbsGrams}g carbs
                    </p>
                  </button>
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
              Showing 8 of {filteredProducts.length}. Filter to find a specific
              fuel.
            </p>
          ) : null}
        </div>
      )}
    </NutritionRailPanel>
  );
}

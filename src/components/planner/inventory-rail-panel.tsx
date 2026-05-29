import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Chip, Toggle } from '@/components/ui';
import { FuelEditorSheet } from '@/components/products/fuel-editor-sheet';
import { useStore } from '@/store';
import type { Product } from '@/types';
import { NutritionRailPanel } from './nutrition-rail';

type ProductFilter = 'all' | 'drink_mix' | 'solid';
type EditorMode = { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; productId: string };

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
  defaultOpen?: boolean;
}

function matchesFilter(product: Product, filter: ProductFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'drink_mix') return product.type === 'drink_mix';
  return product.type !== 'drink_mix';
}

export function InventoryRailPanel({
  products,
  onToggleProductAvailability,
  defaultOpen = true,
}: InventoryRailPanelProps) {
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const [filter, setFilter] = useState<ProductFilter>('all');
  const [mode, setMode] = useState<EditorMode>({ kind: 'closed' });
  const [pulsed, setPulsed] = useState<{ id: string; token: number } | null>(null);
  const [flashSummary, setFlashSummary] = useState<string | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const pendingNameRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  const triggerPulse = useCallback((productId: string) => {
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    setPulsed((prev) => ({ id: productId, token: (prev?.token ?? 0) + 1 }));
    pulseTimerRef.current = window.setTimeout(() => {
      setPulsed(null);
      pulseTimerRef.current = null;
    }, 700);
  }, []);

  const flashLogged = useCallback(() => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    setFlashSummary('Logged.');
    flashTimerRef.current = window.setTimeout(() => {
      setFlashSummary(null);
      flashTimerRef.current = null;
    }, 1600);
  }, []);

  // When products list updates after an add, find the new row and pulse it.
  useEffect(() => {
    if (!pendingNameRef.current) return;
    const target = products.find((p) => p.name === pendingNameRef.current);
    if (!target) return;
    pendingNameRef.current = null;
    triggerPulse(target.id);
  }, [products, triggerPulse]);

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
  const sheetOpen =
    mode.kind === 'add' || (mode.kind === 'edit' && editingProduct !== null);

  const baseSummary =
    products.length === 0
      ? undefined
      : `${drinkMixCount} drink mix · ${solidCount} ${
          solidCount === 1 ? 'solid' : 'solids'
        }`;
  const summary = flashSummary ?? baseSummary;

  const handleAdd = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    pendingNameRef.current = data.name;
    addProduct(data);
    setMode({ kind: 'closed' });
    flashLogged();
  };

  const handleEdit = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (mode.kind !== 'edit') return;
    const id = mode.productId;
    updateProduct(id, data);
    setMode({ kind: 'closed' });
    triggerPulse(id);
    flashLogged();
  };

  const handleDelete = () => {
    if (mode.kind !== 'edit') return;
    deleteProduct(mode.productId);
    setMode({ kind: 'closed' });
  };

  const closeEditor = () => setMode({ kind: 'closed' });

  return (
    <>
      <NutritionRailPanel
        title="Fuel inventory"
        summary={summary}
        defaultOpen={defaultOpen}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {products.length > 0
              ? filters.map(({ value, label, count }) => (
                  <Chip
                    key={value}
                    size="md"
                    tone="subtle"
                    selected={filter === value}
                    onClick={() => setFilter(value)}
                    className="md:min-h-7 md:px-2.5 md:py-1 md:text-xs"
                  >
                    {label}
                    <span className="ml-1 text-[0.66rem] text-ink-500 tabular-nums">
                      {count}
                    </span>
                  </Chip>
                ))
              : null}
            <button
              type="button"
              onClick={() => setMode({ kind: 'add' })}
              className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 md:min-h-7 md:px-2.5 md:py-1 md:text-xs"
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
              Add the fuel you have.
            </p>
          ) : visibleProducts.length === 0 ? (
            <p className="text-sm leading-5 text-ink-600">
              No fuel matches this filter.
            </p>
          ) : (
            <ul className="max-h-[22rem] divide-y divide-[color:var(--border-soft)] overflow-y-auto">
              {visibleProducts.map((product, index) => {
                const isPulsed = pulsed?.id === product.id;
                const rowKey = isPulsed
                  ? `pulse-${product.id}-${pulsed.token}`
                  : product.id;
                return (
                  <li
                    key={rowKey}
                    className={clsx(
                      'flex items-center justify-between gap-3 py-2.5',
                      index === 0 && 'pt-0',
                      isPulsed && 'animate-saved-row rounded-md'
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
                );
              })}
            </ul>
          )}

          {filteredProducts.length > 8 ? (
            <p className="text-xs leading-5 text-ink-500">
              Showing 8 of {filteredProducts.length}. Filter to find a specific
              fuel.
            </p>
          ) : null}
        </div>
      </NutritionRailPanel>

      {sheetOpen && (
        <FuelEditorSheet
          initialData={editingProduct ?? undefined}
          onSubmit={mode.kind === 'edit' ? handleEdit : handleAdd}
          onCancel={closeEditor}
          onDelete={mode.kind === 'edit' ? handleDelete : undefined}
        />
      )}
    </>
  );
}

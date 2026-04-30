import { clsx } from 'clsx';
import { Checkbox } from '@/components/ui';
import type { Product } from '@/types';

interface SolidFuelSelectorProps {
  solidProducts: Product[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function SolidFuelSelector({
  solidProducts,
  selectedIds,
  onChange,
}: SolidFuelSelectorProps) {
  if (solidProducts.length === 0) {
    return (
      <p className="text-sm leading-6 text-ink-600">
        No gels, chews, or bars added yet. Add one from the Fuel inventory
        panel.
      </p>
    );
  }

  const toggleProduct = (productId: string) => {
    if (selectedIds.includes(productId)) {
      onChange(selectedIds.filter((id) => id !== productId));
    } else {
      onChange([...selectedIds, productId]);
    }
  };

  return (
    <div className="space-y-2.5">
      {solidProducts.map((product) => {
        const isSelected = selectedIds.includes(product.id);
        return (
          <label
            key={product.id}
            htmlFor={`solid-product-${product.id}`}
            className={clsx(
              'flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 transition-colors md:p-4',
              isSelected
                ? 'border-brand-300 bg-[color:color-mix(in_srgb,var(--color-brand-50)_60%,var(--color-shell-100))] shadow-[0_12px_24px_-20px_rgb(248_98_46_/_0.26)]'
                : 'border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,white_88%,var(--color-shell-100))] hover:bg-white'
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Checkbox
                id={`solid-product-${product.id}`}
                checked={isSelected}
                onChange={() => toggleProduct(product.id)}
                aria-label={`Select ${product.name}`}
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">{product.name}</p>
                <p className="mt-1 text-sm leading-5 text-ink-600 md:leading-6">
                  {product.nutrition.carbsGrams}g carbs • {product.nutrition.calories} kcal each
                </p>
                {!product.isAvailable && (
                  <p className="inline-flex items-center gap-1 text-xs font-medium text-warning-700">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                      className="h-3 w-3"
                    >
                      <path
                        d="M8 1.75 14.5 13.5h-13L8 1.75Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 6.5v3.25"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <circle cx="8" cy="11.5" r="0.85" fill="currentColor" />
                    </svg>
                    Unavailable in inventory
                  </p>
                )}
              </div>
            </div>
            <div
              className={clsx(
                'shrink-0 rounded-lg px-3 py-1 text-xs font-medium',
                isSelected
                  ? 'bg-brand-100 text-brand-800'
                  : 'bg-shell-100 text-ink-600'
              )}
            >
              {isSelected ? 'Included' : 'Add'}
            </div>
          </label>
        );
      })}
    </div>
  );
}

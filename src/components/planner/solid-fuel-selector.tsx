import { Link } from 'react-router-dom';
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
        No gels, chews, or bars added yet.{' '}
        <Link to="/inventory" className="font-semibold text-brand-700 underline">
          Add products
        </Link>
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
    <div className="space-y-3">
      {solidProducts.map((product) => {
        const isSelected = selectedIds.includes(product.id);
        return (
          <label
            key={product.id}
            htmlFor={`solid-product-${product.id}`}
            className={clsx(
              'flex cursor-pointer items-center justify-between gap-3 rounded-[1.2rem] border p-4 transition-colors',
              isSelected
                ? 'border-brand-300 bg-[color:color-mix(in_oklch,var(--color-brand-50)_78%,white)]'
                : 'border-[color:var(--border-soft)] bg-white hover:bg-shell-50'
            )}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                id={`solid-product-${product.id}`}
                checked={isSelected}
                onChange={() => toggleProduct(product.id)}
                aria-label={`Select ${product.name}`}
              />
              <div>
                <p className="font-semibold text-ink-900">{product.name}</p>
                <p className="mt-1 text-sm leading-6 text-ink-600">
                  {product.nutrition.carbsGrams}g carbs each
                </p>
                {!product.isAvailable && (
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-amber-700">
                    Unavailable in inventory
                  </p>
                )}
              </div>
            </div>
            <div
              className={clsx(
                'rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]',
                isSelected
                  ? 'bg-brand-600 text-shell-50'
                  : 'bg-shell-100 text-ink-600'
              )}
            >
              {isSelected ? 'Packed' : 'Optional'}
            </div>
          </label>
        );
      })}
    </div>
  );
}

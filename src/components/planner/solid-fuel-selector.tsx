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
      <p className="text-sm text-gray-500">
        No gels, chews, or bars added yet.{' '}
        <Link to="/inventory" className="text-brand-600 underline font-medium">
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
      <p className="text-sm text-gray-500">
        Select which solids are available. The calculator will auto-recommend the right amount.
      </p>
      {solidProducts.map((product) => {
        const isSelected = selectedIds.includes(product.id);
        return (
          <label
            key={product.id}
            htmlFor={`solid-product-${product.id}`}
            className={clsx(
              'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
              isSelected
                ? 'border-brand-200 bg-brand-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
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
                <p className="font-medium text-sm">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {product.nutrition.carbsGrams}g carbs each
                </p>
              </div>
            </div>
            <div className="text-xs font-medium text-gray-500">
              {isSelected ? 'Included' : 'Not included'}
            </div>
          </label>
        );
      })}
    </div>
  );
}

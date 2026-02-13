import { Link } from 'react-router-dom';
import { Toggle } from '@/components/ui';
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
        Toggle which solids are available. The calculator will auto-recommend the right amount.
      </p>
      {solidProducts.map((product) => {
        const isSelected = selectedIds.includes(product.id);
        return (
          <div
            key={product.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-gray-500">
                {product.nutrition.carbsGrams}g carbs each
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Toggle
                checked={isSelected}
                onChange={() => toggleProduct(product.id)}
              />
              <span className="text-sm text-gray-500 w-10">
                {isSelected ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

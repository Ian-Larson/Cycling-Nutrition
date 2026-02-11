import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import type { Product } from '@/types';

export interface SolidSelection {
  productId: string;
  quantity: number;
}

interface SolidFuelSelectorProps {
  solidProducts: Product[];
  selections: SolidSelection[];
  onChange: (selections: SolidSelection[]) => void;
}

export function SolidFuelSelector({
  solidProducts,
  selections,
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

  const getQuantity = (productId: string) =>
    selections.find((s) => s.productId === productId)?.quantity || 0;

  const updateQuantity = (productId: string, quantity: number) => {
    const next = selections.filter((s) => s.productId !== productId);
    if (quantity > 0) {
      next.push({ productId, quantity });
    }
    onChange(next);
  };

  const totalSolidCarbs = selections.reduce((sum, sel) => {
    const product = solidProducts.find((p) => p.id === sel.productId);
    return sum + (product?.nutrition.carbsGrams || 0) * sel.quantity;
  }, 0);

  return (
    <div className="space-y-3">
      {solidProducts.map((product) => {
        const qty = getQuantity(product.id);
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateQuantity(product.id, Math.max(0, qty - 1))}
                disabled={qty === 0}
              >
                -
              </Button>
              <span className="w-8 text-center font-medium text-sm">{qty}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateQuantity(product.id, qty + 1)}
              >
                +
              </Button>
            </div>
          </div>
        );
      })}
      {totalSolidCarbs > 0 && (
        <p className="text-sm font-medium text-brand-600">
          Solid fuel total: {totalSolidCarbs}g carbs
        </p>
      )}
    </div>
  );
}

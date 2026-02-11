import { Card, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onDelete: () => void;
}

const typeLabels: Record<Product['type'], string> = {
  drink_mix: 'Drink Mix',
  gel: 'Gel',
  chews: 'Chews',
  bar: 'Bar',
  other: 'Other',
};

export function ProductCard({ product, onDelete }: ProductCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{product.name}</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {typeLabels[product.type]}
            </span>
          </div>
          {product.brand && (
            <p className="text-sm text-gray-500">{product.brand}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            {product.nutrition.carbsGrams}g carbs
            {product.serving.servingSizeGrams &&
              ` per ${product.serving.servingSizeGrams}g serving`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </CardContent>
    </Card>
  );
}

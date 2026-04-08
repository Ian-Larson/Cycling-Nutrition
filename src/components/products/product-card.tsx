import { useState, useEffect } from 'react';
import { Button, Card, CardContent, Toggle } from '@/components/ui';
import type { Product } from '@/types';
import { clsx } from 'clsx';

interface ProductCardProps {
  product: Product;
  onToggleAvailable: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const typeLabels: Record<Product['type'], string> = {
  drink_mix: 'Drink Mix',
  gel: 'Gel',
  chews: 'Chews',
  bar: 'Bar',
  other: 'Other',
};

export function ProductCard({
  product,
  onToggleAvailable,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <Card className={clsx('overflow-hidden', !product.isAvailable && 'opacity-70')}>
      <CardContent className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink-900">{product.name}</h3>
            <span className="rounded-full bg-shell-100 px-2.5 py-1 text-xs font-medium text-ink-600">
              {typeLabels[product.type]}
            </span>
            {!product.isAvailable && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                Unavailable
              </span>
            )}
          </div>
          {product.brand && (
            <p className="text-sm leading-6 text-ink-600">{product.brand}</p>
          )}
          <p className="text-sm leading-6 text-ink-700">
            {product.nutrition.carbsGrams}g carbs • {product.nutrition.calories} kcal
            {product.serving.servingSizeGrams &&
              ` per ${product.serving.servingSizeGrams}g serving`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <div className="flex items-center gap-3 rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-2">
            <Toggle
              checked={product.isAvailable}
              onChange={onToggleAvailable}
              label={product.isAvailable ? 'Available' : 'Unavailable'}
            />
            <span className="text-sm font-semibold text-ink-600">
              {product.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          {confirming ? (
            <Button variant="danger" size="sm" onClick={onDelete} className="relative overflow-hidden">
              Confirm?
              <span className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards]" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

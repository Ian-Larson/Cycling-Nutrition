import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardContent, Toggle } from '@/components/ui';
import type { Product } from '@/types';
import { clsx } from 'clsx';

interface ProductCardProps {
  product: Product;
  onToggleAvailable: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const typeLabels: Record<Product['type'], string> = {
  drink_mix: 'Drink mix',
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
      <CardContent className="flex flex-col gap-2.5 px-4 py-3.5 md:flex-row md:items-start md:justify-between md:px-5 md:py-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink-900">{product.name}</h3>
            <Badge variant="neutral">{typeLabels[product.type]}</Badge>
          </div>
          {product.brand && (
            <p className="text-sm leading-5 text-ink-600 md:leading-6">
              {product.brand}
            </p>
          )}
          <p className="text-sm leading-5 text-ink-700 md:leading-6">
            {product.nutrition.carbsGrams}g carbs • {product.nutrition.calories} kcal
            {product.serving.servingSizeGrams &&
              ` per ${product.serving.servingSizeGrams}g serving`}
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex w-full justify-end rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-1.5 md:w-auto">
            <Toggle
              checked={product.isAvailable}
              onChange={onToggleAvailable}
              label={`Use ${product.name} in planning`}
            />
          </div>
          <div className="flex w-full gap-2 md:w-auto md:justify-end">
            <Button variant="ghost" size="sm" onClick={onEdit} className="flex-1 md:flex-none">
              Edit
            </Button>
            {confirming ? (
              <Button
                variant="danger"
                size="sm"
                onClick={onDelete}
                className="relative flex-1 overflow-hidden md:flex-none"
              >
                Confirm?
                <span className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards]" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(true)}
                className="flex-1 md:flex-none"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

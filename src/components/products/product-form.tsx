import { useEffect, useState } from 'react';
import { Button, Input, Select, Toggle } from '@/components/ui';
import type { Product, ProductType, ConcentrationRange } from '@/types';

interface ProductFormProps {
  onSubmit: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  initialData?: Product;
}

const typeOptions = [
  { value: 'drink_mix', label: 'Drink Mix' },
  { value: 'gel', label: 'Gel' },
  { value: 'chews', label: 'Chews' },
  { value: 'bar', label: 'Bar' },
  { value: 'other', label: 'Other' },
];

export function ProductForm({
  onSubmit,
  onCancel,
  onDelete,
  initialData,
}: ProductFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [brand, setBrand] = useState(initialData?.brand ?? '');
  const [type, setType] = useState<ProductType>(initialData?.type ?? 'drink_mix');
  const [carbsGrams, setCarbsGrams] = useState(initialData ? String(initialData.nutrition.carbsGrams) : '');
  const [calories, setCalories] = useState(
    initialData ? String(initialData.nutrition.calories) : ''
  );
  const [servingSizeGrams, setServingSizeGrams] = useState(initialData?.serving.servingSizeGrams ? String(initialData.serving.servingSizeGrams) : '');
  const [scoopSizeGrams, setScoopSizeGrams] = useState(initialData?.serving.scoopSizeGrams ? String(initialData.serving.scoopSizeGrams) : '');
  const [concMin, setConcMin] = useState(initialData?.concentration?.minGPerMl ? String(initialData.concentration.minGPerMl) : '');
  const [concMax, setConcMax] = useState(initialData?.concentration?.maxGPerMl ? String(initialData.concentration.maxGPerMl) : '');
  const [isAvailable, setIsAvailable] = useState(initialData?.isAvailable ?? true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !carbsGrams || !calories) return;

    const concentration: ConcentrationRange | undefined =
      type === 'drink_mix' && (concMin || concMax)
        ? {
            minGPerMl: concMin ? Number(concMin) : undefined,
            maxGPerMl: concMax ? Number(concMax) : undefined,
          }
        : undefined;

    onSubmit({
      name: name.trim(),
      brand: brand.trim() || undefined,
      type,
      isAvailable,
      nutrition: {
        carbsGrams: Number(carbsGrams),
        calories: Number(calories),
      },
      serving: {
        servingSizeGrams: servingSizeGrams ? Number(servingSizeGrams) : undefined,
        scoopSizeGrams: scoopSizeGrams ? Number(scoopSizeGrams) : undefined,
      },
      ...(concentration ? { concentration } : {}),
    });
  };

  const isDrinkMix = type === 'drink_mix';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        <Input
          label="Product Name"
          placeholder="e.g., Maurten 320"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Brand (optional)"
          placeholder="e.g., Maurten"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
      </div>

      <Select
        label="Type"
        options={typeOptions}
        value={type}
        onChange={(e) => setType(e.target.value as ProductType)}
      />

      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        <Input
          label="Carbs per serving (g)"
          type="number"
          placeholder="e.g., 80"
          value={carbsGrams}
          onChange={(e) => setCarbsGrams(e.target.value)}
          required
          min="0"
        />
        <Input
          label="Calories per serving"
          type="number"
          placeholder="e.g., 320"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          required
          min="0"
        />
      </div>

      {isDrinkMix && (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
          <Input
            label="Serving size (g)"
            type="number"
            placeholder="e.g., 80"
            value={servingSizeGrams}
            onChange={(e) => setServingSizeGrams(e.target.value)}
            min="0"
          />
          <Input
            label="Scoop size (g, optional)"
            type="number"
            placeholder="e.g., 40"
            value={scoopSizeGrams}
            onChange={(e) => setScoopSizeGrams(e.target.value)}
            min="0"
          />
        </div>
      )}

      {isDrinkMix && (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
          <Input
            label="Min concentration (g/ml)"
            type="number"
            placeholder="per label"
            value={concMin}
            onChange={(e) => setConcMin(e.target.value)}
            min="0"
            max="0.16"
            step="0.01"
          />
          <Input
            label="Max concentration (g/ml)"
            type="number"
            placeholder="per label"
            value={concMax}
            onChange={(e) => setConcMax(e.target.value)}
            min="0"
            max="0.16"
            step="0.01"
          />
        </div>
      )}

      <div className="surface-note flex items-center justify-between gap-3 px-3.5 py-3 md:px-4">
        <div>
          <p className="font-semibold text-ink-900">Available now</p>
          <p className="text-sm leading-5 text-ink-600 md:leading-6">
            Use this product in planner recommendations.
          </p>
        </div>
        <Toggle
          checked={isAvailable}
          onChange={setIsAvailable}
          label="Product availability"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="w-full sm:w-auto">
          {initialData ? 'Save' : 'Add product'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        {onDelete &&
          (confirmingDelete ? (
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              className="relative w-full overflow-hidden sm:w-auto"
            >
              Confirm?
              <span className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards]" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmingDelete(true)}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          ))}
      </div>
    </form>
  );
}

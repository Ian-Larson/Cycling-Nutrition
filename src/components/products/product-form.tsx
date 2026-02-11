import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import type { Product, ProductType } from '@/types';

interface ProductFormProps {
  onSubmit: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const typeOptions = [
  { value: 'drink_mix', label: 'Drink Mix' },
  { value: 'gel', label: 'Gel' },
  { value: 'chews', label: 'Chews' },
  { value: 'bar', label: 'Bar' },
  { value: 'other', label: 'Other' },
];

export function ProductForm({ onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState<ProductType>('drink_mix');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [servingSizeGrams, setServingSizeGrams] = useState('');
  const [scoopSizeGrams, setScoopSizeGrams] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !carbsGrams) return;

    onSubmit({
      name: name.trim(),
      brand: brand.trim() || undefined,
      type,
      nutrition: {
        carbsGrams: Number(carbsGrams),
      },
      serving: {
        servingSizeGrams: servingSizeGrams ? Number(servingSizeGrams) : undefined,
        scoopSizeGrams: scoopSizeGrams ? Number(scoopSizeGrams) : undefined,
      },
    });
  };

  const isDrinkMix = type === 'drink_mix';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Carbs per serving (g)"
          type="number"
          placeholder="e.g., 80"
          value={carbsGrams}
          onChange={(e) => setCarbsGrams(e.target.value)}
          required
          min="0"
        />
        {isDrinkMix && (
          <Input
            label="Serving size (g)"
            type="number"
            placeholder="e.g., 80"
            value={servingSizeGrams}
            onChange={(e) => setServingSizeGrams(e.target.value)}
            min="0"
          />
        )}
      </div>

      {isDrinkMix && (
        <Input
          label="Scoop size (g, optional)"
          type="number"
          placeholder="e.g., 40"
          value={scoopSizeGrams}
          onChange={(e) => setScoopSizeGrams(e.target.value)}
          min="0"
        />
      )}

      <div className="flex gap-2">
        <Button type="submit">Add Product</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

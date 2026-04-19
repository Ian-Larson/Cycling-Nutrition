import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { getGearPartCategory } from '@/lib/gear/constants';
import type { GearPartCatalogItem } from '@/types/gear';

interface AddInstancesInput {
  catalogItemId: string;
  quantity: number;
  labelPrefix?: string;
  acquiredDateIso?: string;
  notes?: string;
}

interface PartInstanceFormProps {
  catalog: GearPartCatalogItem[];
  onSubmit: (input: AddInstancesInput) => void;
  onCancel: () => void;
}

interface FormErrors {
  catalogItemId?: string;
  quantity?: string;
}

function catalogOptionLabel(item: GearPartCatalogItem): string {
  const title = [item.brand, item.model].filter(Boolean).join(' ');
  const category = getGearPartCategory(item.category).label;
  return `${title || item.model} - ${category}`;
}

export function PartInstanceForm({
  catalog,
  onSubmit,
  onCancel,
}: PartInstanceFormProps) {
  const [catalogItemId, setCatalogItemId] = useState(catalog[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [labelPrefix, setLabelPrefix] = useState('');
  const [acquiredDateIso, setAcquiredDateIso] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedCatalogItemId = catalog.some((item) => item.id === catalogItemId)
    ? catalogItemId
    : catalog[0]?.id ?? '';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const parsedQuantity = Number(quantity);

    if (!selectedCatalogItemId) {
      nextErrors.catalogItemId = 'Choose a catalog part.';
    }

    if (
      !quantity.trim() ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      nextErrors.quantity = 'Quantity must be a positive whole number.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmit({
      catalogItemId: selectedCatalogItemId,
      quantity: parsedQuantity,
      labelPrefix: labelPrefix.trim() || undefined,
      acquiredDateIso: acquiredDateIso || undefined,
      notes: notes.trim() || undefined,
    });
  };

  if (catalog.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-5 text-ink-600">
          Add a catalog part before logging physical parts.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
      <div className="space-y-2">
        <Select
          id="part-instance-catalog"
          label="Catalog part"
          options={catalog.map((item) => ({
            value: item.id,
            label: catalogOptionLabel(item),
          }))}
          value={selectedCatalogItemId}
          onChange={(event) => setCatalogItemId(event.target.value)}
          required
        />
        {errors.catalogItemId ? (
          <p className="text-sm text-rose-700">{errors.catalogItemId}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        <Input
          id="part-instance-quantity"
          label="Quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          error={errors.quantity}
          required
        />
        <Input
          id="part-instance-acquired"
          label="Acquired date"
          type="date"
          value={acquiredDateIso}
          onChange={(event) => setAcquiredDateIso(event.target.value)}
        />
      </div>

      <Input
        id="part-instance-label-prefix"
        label="Label prefix"
        placeholder="e.g., Waxed chain"
        value={labelPrefix}
        onChange={(event) => setLabelPrefix(event.target.value)}
      />

      <Input
        id="part-instance-notes"
        label="Notes"
        placeholder="Optional storage or batch notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="w-full sm:w-auto">
          Add physical parts
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

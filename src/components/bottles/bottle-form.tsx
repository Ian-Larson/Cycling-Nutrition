import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';

interface BottleFormProps {
  onSubmit: (data: { name: string; capacityMl: number }) => void;
  onCancel: () => void;
  initialData?: { name: string; capacityMl: number };
  submitLabel?: string;
}

const capacityOptions = [
  { value: '550', label: '550ml (Small)' },
  { value: '750', label: '750ml (Standard)' },
  { value: '950', label: '950ml (Large)' },
];

export function BottleForm({
  onSubmit,
  onCancel,
  initialData,
  submitLabel,
}: BottleFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [capacityMl, setCapacityMl] = useState(
    String(initialData?.capacityMl ?? 750)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), capacityMl: Number(capacityMl) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Bottle Name"
        placeholder="e.g., Blue Specialized 26oz"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Select
        label="Capacity"
        options={capacityOptions}
        value={capacityMl}
        onChange={(e) => setCapacityMl(e.target.value)}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="w-full sm:w-auto">
          {submitLabel ?? 'Add bottle'}
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

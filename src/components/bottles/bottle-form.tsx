import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';

interface BottleFormProps {
  onSubmit: (data: { name: string; capacityMl: number }) => void;
  onCancel: () => void;
}

const capacityOptions = [
  { value: '550', label: '550ml (Small)' },
  { value: '750', label: '750ml (Standard)' },
  { value: '950', label: '950ml (Large)' },
];

export function BottleForm({ onSubmit, onCancel }: BottleFormProps) {
  const [name, setName] = useState('');
  const [capacityMl, setCapacityMl] = useState('750');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), capacityMl: Number(capacityMl) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div className="flex gap-2">
        <Button type="submit">Add Bottle</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

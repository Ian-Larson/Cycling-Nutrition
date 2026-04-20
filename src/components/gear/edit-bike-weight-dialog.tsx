import { useEffect, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useStore } from '@/store';
import type { Bike } from '@/types/gear';

interface EditBikeWeightDialogProps {
  open: boolean;
  bike: Bike | null;
  onClose: () => void;
}

function gramsToKgInputValue(grams: number | undefined): string {
  if (grams === undefined || !Number.isFinite(grams) || grams <= 0) return '';
  return (grams / 1000).toFixed(2);
}

export function EditBikeWeightDialog({ open, bike, onClose }: EditBikeWeightDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !bike) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
      />
      <EditBikeWeightForm key={bike.id} bike={bike} onClose={onClose} />
    </div>
  );
}

function EditBikeWeightForm({ bike, onClose }: { bike: Bike; onClose: () => void }) {
  const updateBike = useStore((s) => s.updateBike);
  const [value, setValue] = useState(() => gramsToKgInputValue(bike.totalWeightGrams));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed === '') {
      updateBike(bike.id, { totalWeightGrams: undefined });
      onClose();
      return;
    }
    const kg = Number(trimmed);
    if (!Number.isFinite(kg) || kg <= 0 || kg > 50) {
      setError('Enter a weight between 0 and 50 kg.');
      return;
    }
    updateBike(bike.id, { totalWeightGrams: Math.round(kg * 1000) });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-bike-weight-title"
      className="relative w-full max-w-sm rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 shadow-[var(--shadow-float)]"
    >
      <h3 id="edit-bike-weight-title" className="section-title">
        {bike.name} weight
      </h3>
      <p className="mt-1 text-sm leading-5 text-ink-600">
        Enter the total system weight in kilograms. Leave blank to clear.
      </p>
      <div className="mt-4">
        <Input
          id="edit-bike-weight-input"
          label="Weight (kg)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          autoFocus
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}

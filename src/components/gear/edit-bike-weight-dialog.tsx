import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Input,
} from '@/components/ui';
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
  return (
    <Dialog open={open} onClose={onClose} size="sm">
      {bike ? <EditBikeWeightForm key={bike.id} bike={bike} onClose={onClose} /> : null}
    </Dialog>
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
    <>
      <DialogHeader
        title={`${bike.name} weight`}
        description="Enter the total system weight in kilograms. Leave blank to clear."
        onClose={onClose}
      />
      <DialogContent>
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
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSave();
            }
          }}
          error={error ?? undefined}
          autoFocus
        />
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </DialogFooter>
    </>
  );
}

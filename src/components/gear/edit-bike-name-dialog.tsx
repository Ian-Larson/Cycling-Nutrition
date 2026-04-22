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

interface EditBikeNameDialogProps {
  open: boolean;
  bike: Bike | null;
  onClose: () => void;
}

export function EditBikeNameDialog({ open, bike, onClose }: EditBikeNameDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} size="sm">
      {bike ? <EditBikeNameForm key={bike.id} bike={bike} onClose={onClose} /> : null}
    </Dialog>
  );
}

function EditBikeNameForm({ bike, onClose }: { bike: Bike; onClose: () => void }) {
  const updateBike = useStore((s) => s.updateBike);
  const [value, setValue] = useState(bike.name);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed === '') {
      setError('Name cannot be empty.');
      return;
    }
    if (trimmed.length > 60) {
      setError('Keep the name under 60 characters.');
      return;
    }
    updateBike(bike.id, { name: trimmed });
    onClose();
  };

  return (
    <>
      <DialogHeader
        title="Rename bike"
        description="Give this bike a nickname like “Tarmac SL8” or “Rain bike”."
        onClose={onClose}
      />
      <DialogContent>
        <Input
          id="edit-bike-name-input"
          label="Name"
          type="text"
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

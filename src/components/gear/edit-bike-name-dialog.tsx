import { useEffect, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useStore } from '@/store';
import type { Bike } from '@/types/gear';

interface EditBikeNameDialogProps {
  open: boolean;
  bike: Bike | null;
  onClose: () => void;
}

export function EditBikeNameDialog({ open, bike, onClose }: EditBikeNameDialogProps) {
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
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
      />
      <EditBikeNameForm key={bike.id} bike={bike} onClose={onClose} />
    </div>
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-bike-name-title"
      className="relative w-full max-w-sm rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 shadow-[var(--shadow-float)]"
    >
      <h3 id="edit-bike-name-title" className="section-title">
        Rename bike
      </h3>
      <p className="mt-1 text-sm leading-5 text-ink-600">
        Give this bike a nickname like “Tarmac SL8” or “Rain bike”.
      </p>
      <div className="mt-4">
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

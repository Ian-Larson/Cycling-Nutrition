import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Toggle } from '@/components/ui';
import type { Bottle } from '@/types';
import { clsx } from 'clsx';

interface BottleCardProps {
  bottle: Bottle;
  onToggleAvailable: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function BottleCard({
  bottle,
  onToggleAvailable,
  onEdit,
  onDelete,
}: BottleCardProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <Card className={clsx(!bottle.isAvailable && 'opacity-60')}>
      <CardContent className="px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{bottle.name}</h3>
          <p className="text-sm text-gray-500">{bottle.capacityMl}ml</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Toggle
              checked={bottle.isAvailable}
              onChange={onToggleAvailable}
              label={bottle.isAvailable ? 'On' : 'Off'}
            />
            <span className="text-sm text-gray-500 w-10">
              {bottle.isAvailable ? 'On' : 'Off'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          {confirming ? (
            <Button variant="danger" size="sm" onClick={onDelete} className="relative overflow-hidden">
              Confirm?
              <span className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards]" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

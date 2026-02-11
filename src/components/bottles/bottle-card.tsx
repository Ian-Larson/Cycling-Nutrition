import { Card, CardContent, Button, Toggle } from '@/components/ui';
import type { Bottle } from '@/types';
import { clsx } from 'clsx';

interface BottleCardProps {
  bottle: Bottle;
  onToggleAvailable: () => void;
  onDelete: () => void;
}

export function BottleCard({
  bottle,
  onToggleAvailable,
  onDelete,
}: BottleCardProps) {
  return (
    <Card className={clsx(!bottle.isAvailable && 'opacity-60')}>
      <CardContent className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{bottle.name}</h3>
          <p className="text-sm text-gray-500">{bottle.capacityMl}ml</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Toggle
              checked={bottle.isAvailable}
              onChange={onToggleAvailable}
              label={bottle.isAvailable ? 'Available' : 'Unavailable'}
            />
            <span className="text-sm text-gray-500 w-20">
              {bottle.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

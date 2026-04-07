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
    <Card className={clsx('overflow-hidden', !bottle.isAvailable && 'opacity-70')}>
      <CardContent className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink-900">{bottle.name}</h3>
            {!bottle.isAvailable && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-amber-800">
                Unavailable
              </span>
            )}
          </div>
          <p className="text-sm leading-6 text-ink-600">{bottle.capacityMl}ml</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <div className="flex items-center gap-3 rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-2">
            <Toggle
              checked={bottle.isAvailable}
              onChange={onToggleAvailable}
              label={bottle.isAvailable ? 'On' : 'Off'}
            />
            <span className="text-sm font-semibold text-ink-600">
              {bottle.isAvailable ? 'Available' : 'Unavailable'}
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

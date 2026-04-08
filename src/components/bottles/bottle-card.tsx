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
      <CardContent className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between md:px-5 md:py-5">
        <div className="space-y-2">
          <h3 className="font-semibold text-ink-900">{bottle.name}</h3>
          <p className="text-sm leading-6 text-ink-600">{bottle.capacityMl}ml</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex w-full items-center justify-between gap-3 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 md:w-auto md:justify-start">
            <Toggle
              checked={bottle.isAvailable}
              onChange={onToggleAvailable}
              label="Set availability"
            />
            <span className="text-sm font-semibold text-ink-600">
              {bottle.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <div className="flex w-full gap-2 md:w-auto md:justify-end">
            <Button variant="ghost" size="sm" onClick={onEdit} className="flex-1 md:flex-none">
              Edit
            </Button>
            {confirming ? (
              <Button
                variant="danger"
                size="sm"
                onClick={onDelete}
                className="relative flex-1 overflow-hidden md:flex-none"
              >
                Confirm?
                <span className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards]" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(true)}
                className="flex-1 md:flex-none"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

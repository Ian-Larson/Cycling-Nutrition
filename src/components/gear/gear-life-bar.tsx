import { clsx } from 'clsx';
import { computeLifeBar, type LifeBarInput } from '@/lib/gear/life-bar';

interface GearLifeBarProps extends LifeBarInput {
  className?: string;
}

export function GearLifeBar({ className, ...input }: GearLifeBarProps) {
  const result = computeLifeBar(input);
  if (!result) return null;

  const pctPercent = `${Math.round(result.pct * 100)}%`;

  return (
    <div
      className={clsx(
        'h-1 w-full overflow-hidden rounded-full bg-shell-200',
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(result.pct * 100)}
      aria-label="Service life remaining"
    >
      <div
        className="h-full rounded-full bg-ink-400 motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out"
        style={{ width: pctPercent }}
      />
    </div>
  );
}

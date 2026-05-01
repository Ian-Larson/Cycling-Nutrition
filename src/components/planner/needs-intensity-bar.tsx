import { clsx } from 'clsx';
import type { NeedsLevel } from '@/types';

interface NeedsIntensityBarProps {
  score: number;
  level: NeedsLevel;
  label?: string;
  compact?: boolean;
}

const LEVEL_LABELS: Record<NeedsLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  extreme: 'Extreme',
};

const LEVEL_BADGE: Record<NeedsLevel, string> = {
  low: 'bg-success-100 text-success-700 border-success-200',
  moderate: 'bg-warning-100 text-warning-700 border-warning-200',
  high: 'bg-brand-100 text-brand-800 border-brand-200',
  extreme: 'bg-error-100 text-error-700 border-error-200',
};

export function NeedsIntensityBar({
  score,
  level,
  label = 'Needs Intensity',
  compact = false,
}: NeedsIntensityBarProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className={clsx('space-y-2', compact && 'space-y-1')}>
      <div className="flex items-center justify-between">
        <p className={clsx('font-medium text-ink-700', compact ? 'text-xs' : 'text-sm')}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          <span className={clsx('tabular-nums text-ink-500', compact ? 'text-xs' : 'text-sm')}>
            {clampedScore}/100
          </span>
          <span
            className={clsx(
              'rounded-full border px-2 py-0.5 font-medium',
              compact ? 'text-[11px]' : 'text-xs',
              LEVEL_BADGE[level]
            )}
          >
            {LEVEL_LABELS[level]}
          </span>
        </div>
      </div>

      <div className={clsx('relative rounded-full overflow-hidden', compact ? 'h-2.5' : 'h-3')}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-success-500),var(--color-warning-500),var(--color-brand-500),var(--color-error-500))]" />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-ink-900 shadow transition-[left] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: `${clampedScore}%` }}
          aria-hidden
        />
      </div>

      <div className={clsx('grid grid-cols-4 text-ink-500', compact ? 'text-[11px]' : 'text-xs')}>
        <span>Low</span>
        <span className="text-center">Moderate</span>
        <span className="text-center">High</span>
        <span className="text-right">Extreme</span>
      </div>
    </div>
  );
}

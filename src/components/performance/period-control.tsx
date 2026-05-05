import { SegmentedControl } from '@/components/ui';
import {
  PERIOD_FULL_LABELS,
  PERIOD_SHORT_LABELS,
  type PeriodKey,
} from '@/lib/performance/period';

const ORDER: readonly PeriodKey[] = ['30d', '90d', '6mo', '12mo'];

const OPTIONS = ORDER.map((key) => ({
  value: key,
  label: PERIOD_SHORT_LABELS[key],
  ariaLabel: PERIOD_FULL_LABELS[key],
}));

interface PeriodControlProps {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  /** Render in a sticky wrapper on desktop. The page decides where to mount it. */
  sticky?: boolean;
}

export function PeriodControl({ value, onChange, sticky }: PeriodControlProps) {
  const control = (
    <div className="w-full max-w-sm">
      <SegmentedControl
        label="Comparison period"
        options={OPTIONS}
        value={value}
        onChange={onChange}
      />
    </div>
  );

  if (!sticky) {
    return <div className="flex justify-end">{control}</div>;
  }

  return (
    <div
      className={[
        'flex justify-end',
        'md:sticky md:top-3 md:z-10',
      ].join(' ')}
    >
      <div className="md:rounded-full md:border md:border-[color:var(--border-soft)] md:bg-white/85 md:px-1.5 md:py-1 md:backdrop-blur-sm md:shadow-[var(--shadow-soft)]">
        {control}
      </div>
    </div>
  );
}

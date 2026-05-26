const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PeriodKey = '30d' | '90d' | '6mo' | '12mo';

export const PERIOD_DAYS: Record<PeriodKey, number> = {
  '30d': 30,
  '90d': 90,
  '6mo': 180,
  '12mo': 365,
};

export const PERIOD_SHORT_LABELS: Record<PeriodKey, string> = {
  '30d': '30d',
  '90d': '90d',
  '6mo': '6 months',
  '12mo': '1 year',
};

export const PERIOD_FULL_LABELS: Record<PeriodKey, string> = {
  '30d': 'Last 30d',
  '90d': 'Last 90d',
  '6mo': 'Last 6 months',
  '12mo': 'Last 1 year',
};

export interface PeriodRange {
  fromIso: string;
  toIso: string;
  label: string;
}

export interface ComparisonPeriods {
  current: PeriodRange;
  comparison: PeriodRange;
}

export function resolvePeriodComparison(
  key: PeriodKey,
  now: Date = new Date()
): ComparisonPeriods {
  const days = PERIOD_DAYS[key];
  const t = now.getTime();
  const startCurrent = new Date(t - days * MS_PER_DAY);
  const startPrior = new Date(t - days * 2 * MS_PER_DAY);
  return {
    current: {
      fromIso: startCurrent.toISOString(),
      toIso: now.toISOString(),
      label: PERIOD_FULL_LABELS[key],
    },
    comparison: {
      fromIso: startPrior.toISOString(),
      toIso: startCurrent.toISOString(),
      label: `Prior ${PERIOD_SHORT_LABELS[key]}`,
    },
  };
}

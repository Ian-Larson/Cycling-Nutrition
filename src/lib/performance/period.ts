const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PeriodKey = '30d' | '90d' | '6mo' | 'ytd' | '12mo';
type TrailingPeriodKey = Exclude<PeriodKey, 'ytd'>;

export const PERIOD_DAYS: Record<TrailingPeriodKey, number> = {
  '30d': 30,
  '90d': 90,
  '6mo': 180,
  '12mo': 365,
};

export const PERIOD_SHORT_LABELS: Record<PeriodKey, string> = {
  '30d': '30d',
  '90d': '90d',
  '6mo': '6 months',
  ytd: 'YTD',
  '12mo': '1 year',
};

export const PERIOD_FULL_LABELS: Record<PeriodKey, string> = {
  '30d': 'Last 30d',
  '90d': 'Last 90d',
  '6mo': 'Last 6 months',
  ytd: 'Year to date',
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
  if (key === 'ytd') {
    const startCurrent = startOfUtcYear(now.getUTCFullYear());
    const startPrior = startOfUtcYear(now.getUTCFullYear() - 1);
    const elapsed = now.getTime() - startCurrent.getTime();
    return {
      current: {
        fromIso: startCurrent.toISOString(),
        toIso: now.toISOString(),
        label: PERIOD_FULL_LABELS[key],
      },
      comparison: {
        fromIso: startPrior.toISOString(),
        toIso: new Date(startPrior.getTime() + elapsed).toISOString(),
        label: 'Prior YTD',
      },
    };
  }

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

function startOfUtcYear(year: number): Date {
  return new Date(Date.UTC(year, 0, 1));
}

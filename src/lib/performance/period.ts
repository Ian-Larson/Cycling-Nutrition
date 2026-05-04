const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PeriodPreset =
  | 'this-year-vs-last-year'
  | 'last-90d-vs-previous-90d'
  | 'last-30d-vs-all-time-best';

export interface PeriodRange {
  fromIso: string;
  toIso: string;
  label: string;
}

export interface ComparisonPeriods {
  current: PeriodRange;
  comparison: PeriodRange;
}

export function resolveComparisonPeriods(
  preset: PeriodPreset,
  now: Date = new Date()
): ComparisonPeriods {
  switch (preset) {
    case 'this-year-vs-last-year': {
      const thisYear = now.getUTCFullYear();
      const startThis = new Date(Date.UTC(thisYear, 0, 1));
      const startLast = new Date(Date.UTC(thisYear - 1, 0, 1));
      const endLast = new Date(Date.UTC(thisYear - 1, 11, 31, 23, 59, 59, 999));
      return {
        current: {
          fromIso: startThis.toISOString(),
          toIso: now.toISOString(),
          label: `${thisYear}`,
        },
        comparison: {
          fromIso: startLast.toISOString(),
          toIso: endLast.toISOString(),
          label: `${thisYear - 1}`,
        },
      };
    }
    case 'last-90d-vs-previous-90d': {
      const start90 = new Date(now.getTime() - 90 * MS_PER_DAY);
      const start180 = new Date(now.getTime() - 180 * MS_PER_DAY);
      return {
        current: {
          fromIso: start90.toISOString(),
          toIso: now.toISOString(),
          label: 'Last 90d',
        },
        comparison: {
          fromIso: start180.toISOString(),
          toIso: start90.toISOString(),
          label: 'Previous 90d',
        },
      };
    }
    case 'last-30d-vs-all-time-best': {
      const start30 = new Date(now.getTime() - 30 * MS_PER_DAY);
      return {
        current: {
          fromIso: start30.toISOString(),
          toIso: now.toISOString(),
          label: 'Last 30d',
        },
        comparison: {
          fromIso: new Date(0).toISOString(),
          toIso: now.toISOString(),
          label: 'All-time',
        },
      };
    }
  }
}

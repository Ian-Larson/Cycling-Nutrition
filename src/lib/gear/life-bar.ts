export interface LifeBarInput {
  remainingMi: number | null;
  remainingDays: number | null;
  intervalMi: number | null;
  intervalDays: number | null;
  nextDueMileageMi?: number;
  lastServiceMileageMi?: number;
  nextDueDateIso?: string;
  lastServiceDateIso?: string;
}

export interface LifeBarResult {
  axis: 'mi' | 'days';
  pct: number;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function daysBetween(startIso: string, endIso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.parse(`${startIso}T00:00:00.000Z`);
  const end = Date.parse(`${endIso}T00:00:00.000Z`);
  return Math.round((end - start) / msPerDay);
}

export function computeLifeBar(input: LifeBarInput): LifeBarResult | null {
  const candidates: Array<{
    axis: 'mi' | 'days';
    remaining: number;
    interval: number | null;
  }> = [];

  if (input.remainingMi !== null) {
    let interval = input.intervalMi;
    if (
      interval === null &&
      input.nextDueMileageMi !== undefined &&
      input.lastServiceMileageMi !== undefined
    ) {
      interval = input.nextDueMileageMi - input.lastServiceMileageMi;
    }
    candidates.push({ axis: 'mi', remaining: input.remainingMi, interval });
  }

  if (input.remainingDays !== null) {
    let interval = input.intervalDays;
    if (
      interval === null &&
      input.nextDueDateIso !== undefined &&
      input.lastServiceDateIso !== undefined
    ) {
      interval = daysBetween(input.lastServiceDateIso, input.nextDueDateIso);
    }
    candidates.push({ axis: 'days', remaining: input.remainingDays, interval });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.remaining - b.remaining);
  const pick = candidates[0];
  if (pick.interval === null || pick.interval <= 0) return null;

  return { axis: pick.axis, pct: clamp01(1 - pick.remaining / pick.interval) };
}

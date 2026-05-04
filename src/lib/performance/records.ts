import type { WeightHistoryEntry } from '@/types/performance';
import { closestPriorEntry } from './history';

export interface ActivityForRecords {
  stravaId: string;
  startedAt: string;
  name: string;
  durationS: number;
  curve: number[] | null;
}

export interface DurationRecord {
  stravaId: string;
  name: string;
  startedAt: string;
  durationSeconds: number;
  watts: number;
  wkg?: number;
  weightKgAtTime?: number;
}

/**
 * Returns the best-mean-max-watts at duration `durationSeconds` across
 * `activities`, with the w/kg derived from the closest-prior weight to
 * that activity's `started_at`. Returns null when no activity is long
 * enough or has a curve.
 */
export function computeBestForDuration(
  activities: readonly ActivityForRecords[],
  weightHistory: readonly WeightHistoryEntry[],
  durationSeconds: number,
  fallbackWeightKg?: number
): DurationRecord | null {
  let best: { activity: ActivityForRecords; watts: number } | null = null;
  for (const a of activities) {
    if (!a.curve) continue;
    if (a.curve.length < durationSeconds) continue;
    const watts = a.curve[durationSeconds - 1];
    if (!Number.isFinite(watts) || watts <= 0) continue;
    if (!best || watts > best.watts) best = { activity: a, watts };
  }
  if (!best) return null;

  const weightEntry = closestPriorEntry(weightHistory, best.activity.startedAt);
  const weightKg = weightEntry?.weightKg ?? fallbackWeightKg;
  return {
    stravaId: best.activity.stravaId,
    name: best.activity.name,
    startedAt: best.activity.startedAt,
    durationSeconds,
    watts: best.watts,
    wkg: weightKg && weightKg > 0 ? best.watts / weightKg : undefined,
    weightKgAtTime: weightKg,
  };
}

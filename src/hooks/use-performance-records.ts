import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { listActivitiesWithCurvesInRange } from '@/lib/performance/curves';
import {
  resolveComparisonPeriods,
  type PeriodPreset,
  type PeriodRange,
} from '@/lib/performance/period';
import {
  computeBestForDuration,
  type DurationRecord,
} from '@/lib/performance/records';
import { useStore } from '@/store';

export const PR_TILE_DURATIONS: readonly number[] = [300, 1200, 3600];
export const RADAR_DURATIONS: readonly number[] = [5, 30, 60, 300, 1200, 3600];

export interface PrTile {
  durationSeconds: number;
  record: DurationRecord | null;
}

export interface RadarPoint {
  durationSeconds: number;
  wkg: number | null;
}

export interface RadarData {
  current: RadarPoint[];
  comparison: RadarPoint[];
  currentLabel: string;
  comparisonLabel: string;
}

export interface UsePerformanceRecordsResult {
  isLoading: boolean;
  error: string | null;
  tiles: PrTile[];
  radar: RadarData;
  currentPeriod: PeriodRange;
  comparisonPeriod: PeriodRange;
}

const EMPTY_RADAR: RadarPoint[] = RADAR_DURATIONS.map((d) => ({
  durationSeconds: d,
  wkg: null,
}));

export function usePerformanceRecords(
  preset: PeriodPreset
): UsePerformanceRecordsResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const weightHistory = useStore((s) => s.weightHistory);
  const profileWeightKg = useStore((s) => s.settings.athleteProfile.weightKg);
  const periods = useMemo(() => resolveComparisonPeriods(preset), [preset]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<PrTile[]>(
    PR_TILE_DURATIONS.map((d) => ({ durationSeconds: d, record: null }))
  );
  const [radar, setRadar] = useState<RadarData>({
    current: EMPTY_RADAR,
    comparison: EMPTY_RADAR,
    currentLabel: periods.current.label,
    comparisonLabel: periods.comparison.label,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      try {
        const [currentActs, comparisonActs] = await Promise.all([
          listActivitiesWithCurvesInRange(supabase, periods.current.fromIso, periods.current.toIso),
          listActivitiesWithCurvesInRange(supabase, periods.comparison.fromIso, periods.comparison.toIso),
        ]);
        if (cancelled) return;
        const nextTiles: PrTile[] = PR_TILE_DURATIONS.map((d) => ({
          durationSeconds: d,
          record: computeBestForDuration(currentActs, weightHistory, d, profileWeightKg),
        }));
        const radarFor = (acts: typeof currentActs): RadarPoint[] =>
          RADAR_DURATIONS.map((d) => {
            const r = computeBestForDuration(acts, weightHistory, d, profileWeightKg);
            return { durationSeconds: d, wkg: r?.wkg ?? null };
          });
        setTiles(nextTiles);
        setRadar({
          current: radarFor(currentActs),
          comparison: radarFor(comparisonActs),
          currentLabel: periods.current.label,
          comparisonLabel: periods.comparison.label,
        });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load records');
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [supabase, periods, weightHistory, profileWeightKg]);

  return {
    isLoading,
    error,
    tiles,
    radar,
    currentPeriod: periods.current,
    comparisonPeriod: periods.comparison,
  };
}

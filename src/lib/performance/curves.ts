import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityWithCurve } from '@/types/activity';
import { decodeByteaHex } from './bytea';
import { unpackCurveInt16 } from './mean-max-curve';

interface CurveRow {
  strava_id: string;
  started_at: string;
  duration_s: number;
  name: string;
  mean_max_curve: string | null;
}

export async function listActivitiesWithCurvesInRange(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string
): Promise<ActivityWithCurve[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('strava_id, started_at, duration_s, name, mean_max_curve')
    .gte('started_at', fromIso)
    .lte('started_at', toIso)
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as CurveRow[] | null) ?? []).map((row) => ({
    stravaId: row.strava_id,
    startedAt: row.started_at,
    durationS: row.duration_s,
    name: row.name,
    curve:
      row.mean_max_curve === null
        ? null
        : unpackCurveInt16(decodeByteaHex(row.mean_max_curve)),
  }));
}

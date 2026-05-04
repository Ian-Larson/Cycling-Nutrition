import type { SupabaseClient } from '@supabase/supabase-js';
import type { Activity, ActivitySyncMeta } from '@/types/activity';

interface ActivityRow {
  strava_id: string;
  started_at: string;
  duration_s: number;
  distance_m: number | null;
  avg_watts: number | null;
  np_watts: number | null;
  max_watts: number | null;
  kj: number | null;
  mean_max_curve: Uint8Array | null;
  bike_id: string | null;
  strava_gear_id: string | null;
  name: string;
  source: 'strava';
}

interface ActivitySyncMetaRow {
  last_synced_at: string | null;
  last_strava_after: string | null;
}

function mapRow(row: ActivityRow): Activity {
  return {
    stravaId: row.strava_id,
    startedAt: row.started_at,
    durationS: row.duration_s,
    distanceM: row.distance_m,
    avgWatts: row.avg_watts,
    npWatts: row.np_watts,
    maxWatts: row.max_watts,
    kj: row.kj,
    hasPower: row.mean_max_curve !== null,
    bikeId: row.bike_id,
    stravaGearId: row.strava_gear_id,
    name: row.name,
    source: row.source,
  };
}

export async function listRecentActivities(
  supabase: SupabaseClient,
  limit: number
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(
      'strava_id, started_at, duration_s, distance_m, avg_watts, np_watts, max_watts, kj, mean_max_curve, bike_id, strava_gear_id, name, source'
    )
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as ActivityRow[] | null) ?? []).map(mapRow);
}

export async function getActivitySyncMeta(
  supabase: SupabaseClient
): Promise<ActivitySyncMeta> {
  const { data, error } = await supabase
    .from('activity_sync_meta')
    .select('last_synced_at, last_strava_after')
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as ActivitySyncMetaRow | null;
  return {
    lastSyncedAt: row?.last_synced_at ?? null,
    lastStravaAfter: row?.last_strava_after ?? null,
  };
}

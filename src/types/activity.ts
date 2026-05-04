export interface Activity {
  stravaId: string;
  startedAt: string;
  durationS: number;
  distanceM: number | null;
  avgWatts: number | null;
  npWatts: number | null;
  maxWatts: number | null;
  kj: number | null;
  hasPower: boolean;
  bikeId: string | null;
  stravaGearId: string | null;
  name: string;
  source: 'strava';
}

export interface ActivitySyncMeta {
  lastSyncedAt: string | null;
  lastStravaAfter: string | null;
}

export interface ActivityWithCurve {
  stravaId: string;
  startedAt: string;
  durationS: number;
  name: string;
  curve: number[] | null;
}

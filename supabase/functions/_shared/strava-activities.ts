// supabase/functions/_shared/strava-activities.ts

export interface StravaActivitySummary {
  id: number | string;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string; // ISO
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_watts?: number;
  weighted_average_watts?: number;
  max_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  gear_id?: string | null;
}

export interface StravaWattsStream {
  type: string; // 'watts'
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string; // 'high' | 'medium' | 'low'
}

const STRAVA_BASE = 'https://www.strava.com/api/v3';

/**
 * Fetches one page of activities (cycling-relevant). Strava paginates with
 * page= 1-based; per_page max 200. Returns the raw activity summaries.
 *
 * `after`: epoch seconds (NOT ISO) — Strava's API quirk.
 */
export async function fetchActivityPage(
  accessToken: string,
  options: { afterEpoch: number; page: number; perPage?: number }
): Promise<StravaActivitySummary[]> {
  const params = new URLSearchParams({
    after: String(options.afterEpoch),
    page: String(options.page),
    per_page: String(options.perPage ?? 100),
  });
  const res = await fetch(`${STRAVA_BASE}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new StravaApiError(
      `Strava activities fetch failed (${res.status})`,
      res.status,
      body,
      res.headers
    );
  }
  return (await res.json()) as StravaActivitySummary[];
}

/**
 * Fetches the watts stream for a single activity. Returns the data array
 * (length = activity duration in seconds at 1Hz resolution) or null if the
 * activity has no power.
 */
export async function fetchWattsStream(
  accessToken: string,
  activityId: number | string
): Promise<number[] | null> {
  const params = new URLSearchParams({
    keys: 'watts',
    key_by_type: 'true',
    resolution: 'high',
  });
  const res = await fetch(
    `${STRAVA_BASE}/activities/${activityId}/streams?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new StravaApiError(
      `Strava streams fetch failed (${res.status})`,
      res.status,
      body,
      res.headers
    );
  }
  const json = (await res.json()) as { watts?: StravaWattsStream };
  if (!json.watts) return null;
  return json.watts.data;
}

export class StravaApiError extends Error {
  status: number;
  body: string;
  headers: Headers;
  constructor(message: string, status: number, body: string, headers: Headers) {
    super(message);
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
  /**
   * Strava signals rate-limit via HTTP 429. Returns true if this error
   * indicates a rate-limit hit.
   */
  isRateLimited(): boolean {
    return this.status === 429;
  }
  /** Returns the recommended retry timestamp as ISO. Defaults to +15min. */
  retryAfterIso(now: Date = new Date()): string {
    const retryAfter = this.headers.get('Retry-After');
    const seconds = retryAfter ? Number(retryAfter) : 900;
    return new Date(now.getTime() + seconds * 1000).toISOString();
  }
}

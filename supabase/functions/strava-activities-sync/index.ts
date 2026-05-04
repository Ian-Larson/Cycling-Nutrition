// supabase/functions/strava-activities-sync/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  fetchActivityPage,
  fetchWattsStream,
  StravaApiError,
  type StravaActivitySummary,
} from '../_shared/strava-activities.ts';
import { computeMeanMaxCurve } from '../_shared/mean-max-curve.ts';

interface SyncRequest {
  since?: string;
  max?: number;
}

interface SyncResponse {
  imported: number;
  total_estimated?: number;
  next_since?: string;
  rate_limited_until?: string;
  done: boolean;
}

const DEFAULT_MAX = 50;
const PER_PAGE = 100;
const INT16_MAX = 32767;
const INT16_MIN = -32768;

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function packCurveInt16(curve: readonly number[]): Uint8Array {
  const buf = new ArrayBuffer(curve.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < curve.length; i++) {
    const clamped = Math.max(INT16_MIN, Math.min(INT16_MAX, Math.round(curve[i])));
    view.setInt16(i * 2, clamped, true);
  }
  return new Uint8Array(buf);
}

// PostgREST does not auto-encode Uint8Array to bytea — pass hex `\xDEADBEEF` form.
function toByteaHex(bytes: Uint8Array): string {
  let s = '\\x';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number } | null> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

function isCyclingActivity(a: StravaActivitySummary): boolean {
  const t = a.sport_type ?? a.type;
  return /Ride|Cycling|VirtualRide|EBikeRide|GravelRide|MountainBikeRide/i.test(t);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as SyncRequest;
    const max = Math.max(1, Math.min(200, body.max ?? DEFAULT_MAX));
    const sinceIso = body.since ?? new Date(0).toISOString();
    const sinceEpoch = Math.floor(new Date(sinceIso).getTime() / 1000);

    const supabaseUrl = getEnv('SUPABASE_URL');
    const anonKey = getEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = getEnv('STRAVA_CLIENT_ID');
    const clientSecret = getEnv('STRAVA_CLIENT_SECRET');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenRow, error: tokenError } = await serviceClient
      .from('strava_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow) return jsonResponse({ error: 'Strava not connected' }, { status: 404 });

    let accessToken = tokenRow.access_token;
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAtSec = tokenRow.expires_at
      ? Math.floor(new Date(tokenRow.expires_at).getTime() / 1000)
      : 0;
    if (expiresAtSec <= nowSec + 60) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token, clientId, clientSecret);
      if (!refreshed) {
        return jsonResponse({ error: 'Token refresh failed' }, { status: 502 });
      }
      accessToken = refreshed.access_token;
      await serviceClient
        .from('strava_tokens')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    let imported = 0;
    let exhausted = false;
    let page = 1;
    let latestStartIso = sinceIso;

    pageLoop: while (imported < max) {
      let pageActivities: StravaActivitySummary[];
      try {
        pageActivities = await fetchActivityPage(accessToken, {
          afterEpoch: sinceEpoch,
          page,
          perPage: PER_PAGE,
        });
      } catch (e) {
        if (e instanceof StravaApiError && e.isRateLimited()) {
          const resp: SyncResponse = {
            imported,
            done: false,
            rate_limited_until: e.retryAfterIso(),
            next_since: latestStartIso,
          };
          await markSyncedAt(serviceClient, userId, latestStartIso);
          return jsonResponse(resp);
        }
        throw e;
      }
      if (pageActivities.length === 0) {
        exhausted = true;
        break;
      }

      for (const a of pageActivities) {
        if (imported >= max) break pageLoop;
        if (!isCyclingActivity(a)) continue;

        let curveBytes: Uint8Array | null = null;
        if (a.device_watts === true) {
          try {
            const stream = await fetchWattsStream(accessToken, a.id);
            if (stream && stream.length > 0) {
              const curve = computeMeanMaxCurve(stream);
              curveBytes = packCurveInt16(curve);
            }
          } catch (e) {
            if (e instanceof StravaApiError && e.isRateLimited()) {
              const resp: SyncResponse = {
                imported,
                done: false,
                rate_limited_until: e.retryAfterIso(),
                next_since: latestStartIso,
              };
              await markSyncedAt(serviceClient, userId, latestStartIso);
              return jsonResponse(resp);
            }
            throw e;
          }
        }

        const row = {
          user_id: userId,
          strava_id: String(a.id),
          started_at: a.start_date,
          duration_s: a.moving_time,
          distance_m: a.distance,
          avg_watts: a.average_watts ? Math.round(a.average_watts) : null,
          np_watts: a.weighted_average_watts ? Math.round(a.weighted_average_watts) : null,
          max_watts: a.max_watts ? Math.round(a.max_watts) : null,
          kj: a.kilojoules ? Math.round(a.kilojoules) : null,
          mean_max_curve: curveBytes ? toByteaHex(curveBytes) : null,
          strava_gear_id: a.gear_id ?? null,
          name: a.name,
          source: 'strava',
        };
        const { error: upsertError } = await serviceClient
          .from('activities')
          .upsert(row, { onConflict: 'user_id,strava_id' });
        if (upsertError) throw upsertError;

        imported += 1;
        if (a.start_date > latestStartIso) latestStartIso = a.start_date;
      }

      if (pageActivities.length < PER_PAGE) {
        exhausted = true;
        break;
      }
      page += 1;
    }

    await markSyncedAt(serviceClient, userId, latestStartIso);

    const resp: SyncResponse = {
      imported,
      done: exhausted || imported < max,
      next_since: latestStartIso,
    };
    return jsonResponse(resp);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, { status: 500 });
  }
});

async function markSyncedAt(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  latestStartIso: string
): Promise<void> {
  await serviceClient
    .from('activity_sync_meta')
    .upsert(
      {
        user_id: userId,
        last_synced_at: new Date().toISOString(),
        last_strava_after: latestStartIso,
      },
      { onConflict: 'user_id' }
    );
}

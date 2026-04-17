import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface StravaAthleteResponse {
  bikes?: Array<{
    id: string;
    name?: string;
    nickname?: string;
    distance?: number; // meters, lifetime
    primary?: boolean;
  }>;
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function refreshAccessToken(
  refreshToken: string, clientId: string, clientSecret: string,
): Promise<{ access_token: string; refresh_token: string; expires_at: number } | null> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId, client_secret: clientSecret,
      grant_type: 'refresh_token', refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, { status: 401 });

    const supabaseUrl = getEnv('SUPABASE_URL');
    const anonKey = getEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = getEnv('STRAVA_CLIENT_ID');
    const clientSecret = getEnv('STRAVA_CLIENT_SECRET');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: tokenRow, error: tokenError } = await serviceClient
      .from('strava_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow) return jsonResponse({ error: 'Strava not connected' }, { status: 404 });

    let accessToken = tokenRow.access_token;
    const nowSec = Math.floor(Date.now() / 1000);
    if (tokenRow.expires_at && tokenRow.expires_at <= nowSec + 60) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token, clientId, clientSecret);
      if (!refreshed) return jsonResponse({ error: 'Token refresh failed' }, { status: 502 });
      accessToken = refreshed.access_token;
      await serviceClient.from('strava_tokens').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userData.user.id);
    }

    const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!athleteRes.ok) {
      const details = await athleteRes.text();
      return jsonResponse({ error: 'Strava athlete fetch failed', details }, { status: 502 });
    }

    const athlete = (await athleteRes.json()) as StravaAthleteResponse;
    const bikes = (athlete.bikes ?? []).map((b) => ({
      stravaGearId: String(b.id),
      name: b.nickname || b.name || 'Bike',
      odometerMi: typeof b.distance === 'number' ? b.distance / 1609.344 : 0,
      isPrimary: Boolean(b.primary),
    }));

    return jsonResponse({ bikes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, { status: 500 });
  }
});

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id?: number | string;
    firstname?: string;
    lastname?: string;
    username?: string;
  };
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getAthleteName(athlete: StravaTokenResponse['athlete']): string | null {
  if (!athlete) return null;
  const fullName = [athlete.firstname, athlete.lastname]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || athlete.username || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, { status: 401 });
    }

    const { code, scope } = await req.json();
    if (typeof code !== 'string' || code.length === 0) {
      return jsonResponse({ error: 'Missing Strava authorization code' }, { status: 400 });
    }

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

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      return jsonResponse(
        { error: 'Strava token exchange failed', details },
        { status: 502 }
      );
    }

    const tokenData = (await tokenResponse.json()) as StravaTokenResponse;
    if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.athlete?.id) {
      return jsonResponse(
        { error: 'Strava token response was incomplete' },
        { status: 502 }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const userId = userData.user.id;
    const connectedAt = new Date().toISOString();
    const scopes =
      typeof scope === 'string' && scope.length > 0
        ? scope.split(',').map((item) => item.trim()).filter(Boolean)
        : ['read', 'profile:read_all'];

    const { error: connectionError } = await serviceClient
      .from('strava_connections')
      .upsert(
        {
          user_id: userId,
          athlete_id: String(tokenData.athlete.id),
          athlete_name: getAthleteName(tokenData.athlete),
          scopes,
          connected_at: connectedAt,
        },
        { onConflict: 'user_id' }
      );

    if (connectionError) throw connectionError;

    const { error: tokenError } = await serviceClient.from('strava_tokens').upsert(
      {
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (tokenError) throw tokenError;

    return jsonResponse({
      athleteId: String(tokenData.athlete.id),
      athleteName: getAthleteName(tokenData.athlete),
      scopes,
      connectedAt,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
});

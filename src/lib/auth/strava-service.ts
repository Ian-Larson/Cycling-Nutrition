import type { SupabaseClient } from '@supabase/supabase-js';
import { getRequestedStravaScopes } from './strava-provider';
import type { StravaConnection } from './types';

interface StravaConnectionRow {
  athlete_id: string | number;
  athlete_name?: string | null;
  scopes?: string[] | string | null;
  connected_at: string;
  updated_at?: string | null;
}

function normalizeScopes(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter((scope) => typeof scope === 'string');
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);
  }
  return getRequestedStravaScopes();
}

export async function fetchStravaConnection(
  supabase: SupabaseClient
): Promise<StravaConnection | null> {
  const { data, error } = await supabase
    .from('strava_connections')
    .select('athlete_id, athlete_name, scopes, connected_at, updated_at')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const row = data as StravaConnectionRow;
  return {
    athleteId: String(row.athlete_id),
    athleteName: row.athlete_name ?? undefined,
    scopes: normalizeScopes(row.scopes),
    connectedAt: row.connected_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function exchangeStravaCode(
  supabase: SupabaseClient,
  params: { code: string; scope?: string | null }
): Promise<StravaConnection> {
  const { data, error } = await supabase.functions.invoke('strava-token-exchange', {
    body: params,
  });

  if (error) {
    throw new Error(error.message);
  }

  const connection = data as Partial<StravaConnection> | null;
  if (!connection?.athleteId || !connection.connectedAt) {
    throw new Error('Strava connection response was incomplete.');
  }

  return {
    athleteId: connection.athleteId,
    athleteName: connection.athleteName,
    scopes: connection.scopes ?? getRequestedStravaScopes(),
    connectedAt: connection.connectedAt,
    updatedAt: connection.updatedAt,
  };
}

export async function disconnectStrava(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.functions.invoke('strava-disconnect', {
    body: {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

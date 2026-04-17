import type { SupabaseClient } from '@supabase/supabase-js';

export interface StravaBike {
  stravaGearId: string;
  name: string;
  odometerMi: number;
  isPrimary: boolean;
}

export async function fetchStravaBikes(supabase: SupabaseClient): Promise<StravaBike[]> {
  const { data, error } = await supabase.functions.invoke<{ bikes: StravaBike[] }>(
    'strava-gear-list',
    { body: {} },
  );
  if (error) throw error;
  return data?.bikes ?? [];
}

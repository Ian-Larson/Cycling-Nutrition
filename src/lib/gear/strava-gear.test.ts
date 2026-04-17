import { describe, it, expect, vi } from 'vitest';
import { fetchStravaBikes } from './strava-gear';
import type { SupabaseClient } from '@supabase/supabase-js';

function mockSupabase(response: unknown, error: Error | null = null): SupabaseClient {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: response, error }),
    },
  } as unknown as SupabaseClient;
}

describe('fetchStravaBikes', () => {
  it('returns normalized bike array from edge function', async () => {
    const supabase = mockSupabase({
      bikes: [
        { stravaGearId: 'b1', name: 'Force E1', odometerMi: 1120.5, isPrimary: true },
      ],
    });
    const bikes = await fetchStravaBikes(supabase);
    expect(bikes).toEqual([
      { stravaGearId: 'b1', name: 'Force E1', odometerMi: 1120.5, isPrimary: true },
    ]);
  });

  it('throws when the edge function returns an error', async () => {
    const supabase = mockSupabase(null, new Error('boom'));
    await expect(fetchStravaBikes(supabase)).rejects.toThrow('boom');
  });

  it('returns empty array when athlete has no bikes', async () => {
    const supabase = mockSupabase({ bikes: [] });
    expect(await fetchStravaBikes(supabase)).toEqual([]);
  });
});

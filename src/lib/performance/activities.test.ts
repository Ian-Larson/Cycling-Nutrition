import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listRecentActivities, getActivitySyncMeta } from './activities';

function makeMockSupabase(rows: unknown[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(builder),
    _builder: builder,
  } as unknown as SupabaseClient;
}

describe('listRecentActivities', () => {
  it('returns mapped activities with hasPower derived from mean_max_curve', async () => {
    const supabase = makeMockSupabase([
      {
        strava_id: '123',
        started_at: '2025-06-01T10:00:00Z',
        duration_s: 3600,
        distance_m: 30000,
        avg_watts: 200,
        np_watts: 220,
        max_watts: 800,
        kj: 720,
        mean_max_curve: '\\x0102',
        bike_id: null,
        strava_gear_id: 'b1',
        name: 'Morning Ride',
        source: 'strava',
      },
      {
        strava_id: '456',
        started_at: '2025-05-30T07:00:00Z',
        duration_s: 1800,
        distance_m: 15000,
        avg_watts: null,
        np_watts: null,
        max_watts: null,
        kj: null,
        mean_max_curve: null,
        bike_id: null,
        strava_gear_id: null,
        name: 'No-power Ride',
        source: 'strava',
      },
    ]);

    const result = await listRecentActivities(supabase, 10);
    expect(result).toHaveLength(2);
    expect(result[0].stravaId).toBe('123');
    expect(result[0].hasPower).toBe(true);
    expect(result[1].hasPower).toBe(false);
  });

  it('returns an empty array when supabase returns no rows', async () => {
    const supabase = makeMockSupabase([]);
    const result = await listRecentActivities(supabase, 10);
    expect(result).toEqual([]);
  });
});

describe('getActivitySyncMeta', () => {
  it('returns null fields when meta row missing', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as unknown as SupabaseClient;
    const meta = await getActivitySyncMeta(supabase);
    expect(meta.lastSyncedAt).toBeNull();
    expect(meta.lastStravaAfter).toBeNull();
  });

  it('maps the meta row when present', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            last_synced_at: '2026-05-04T12:00:00Z',
            last_strava_after: '2026-05-04T11:00:00Z',
          },
          error: null,
        }),
      }),
    } as unknown as SupabaseClient;
    const meta = await getActivitySyncMeta(supabase);
    expect(meta.lastSyncedAt).toBe('2026-05-04T12:00:00Z');
    expect(meta.lastStravaAfter).toBe('2026-05-04T11:00:00Z');
  });
});

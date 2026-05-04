import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listActivitiesWithCurvesInRange } from './curves';

function makeMockSupabase(rows: unknown[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(builder),
  } as unknown as SupabaseClient;
}

describe('listActivitiesWithCurvesInRange', () => {
  it('decodes mean_max_curve from bytea hex into number[]', async () => {
    // Curve = [100, 200] → packed as Int16 LE → bytes 64 00 c8 00 → hex 6400c800
    const supabase = makeMockSupabase([
      {
        strava_id: 'a',
        started_at: '2025-06-01T10:00:00Z',
        duration_s: 3600,
        name: 'r',
        mean_max_curve: '\\x6400c800',
      },
    ]);
    const result = await listActivitiesWithCurvesInRange(
      supabase,
      '2025-01-01T00:00:00.000Z',
      '2025-12-31T23:59:59.999Z'
    );
    expect(result).toHaveLength(1);
    expect(result[0].curve).toEqual([100, 200]);
  });

  it('returns null curve when mean_max_curve is null', async () => {
    const supabase = makeMockSupabase([
      {
        strava_id: 'a',
        started_at: '2025-06-01T10:00:00Z',
        duration_s: 3600,
        name: 'r',
        mean_max_curve: null,
      },
    ]);
    const result = await listActivitiesWithCurvesInRange(
      supabase,
      '2025-01-01T00:00:00.000Z',
      '2025-12-31T23:59:59.999Z'
    );
    expect(result[0].curve).toBeNull();
  });

  it('returns empty array on no rows', async () => {
    const supabase = makeMockSupabase([]);
    const result = await listActivitiesWithCurvesInRange(
      supabase,
      '2025-01-01T00:00:00.000Z',
      '2025-12-31T23:59:59.999Z'
    );
    expect(result).toEqual([]);
  });
});

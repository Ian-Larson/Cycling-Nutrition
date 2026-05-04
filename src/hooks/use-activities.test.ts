import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActivities } from './use-activities';
import * as activitiesLib from '@/lib/performance/activities';

vi.mock('@/lib/performance/activities');
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({}),
}));

describe('useActivities', () => {
  it('lists activities after mount', async () => {
    vi.mocked(activitiesLib.listRecentActivities).mockResolvedValue([
      {
        stravaId: '1',
        startedAt: '2025-06-01T10:00:00Z',
        durationS: 3600,
        distanceM: 30000,
        avgWatts: 200,
        npWatts: 220,
        maxWatts: 800,
        kj: 720,
        hasPower: true,
        bikeId: null,
        stravaGearId: null,
        name: 'Test',
        source: 'strava',
      },
    ]);

    const { result } = renderHook(() => useActivities());
    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
    });
    expect(result.current.activities[0].stravaId).toBe('1');
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors', async () => {
    vi.mocked(activitiesLib.listRecentActivities).mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useActivities());
    await waitFor(() => {
      expect(result.current.error).toBe('fail');
    });
  });
});

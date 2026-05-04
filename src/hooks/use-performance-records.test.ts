import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePerformanceRecords } from './use-performance-records';
import * as curvesLib from '@/lib/performance/curves';
import { useStore } from '@/store';

vi.mock('@/lib/performance/curves');
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({}),
}));

function curveWith(values: Record<number, number>, length = 4000): number[] {
  const arr = new Array(length).fill(0);
  for (const [i, v] of Object.entries(values)) arr[Number(i)] = v;
  return arr;
}

describe('usePerformanceRecords', () => {
  beforeEach(() => {
    useStore.setState({ weightHistory: [], ftpHistory: [] });
    vi.mocked(curvesLib.listActivitiesWithCurvesInRange).mockReset();
  });

  it('returns null while loading and populates after fetch', async () => {
    useStore.setState({
      weightHistory: [{ id: 'w1', recordedAt: '2025-01-01', weightKg: 75 }],
    });
    vi.mocked(curvesLib.listActivitiesWithCurvesInRange).mockResolvedValue([
      {
        stravaId: 'a',
        startedAt: '2025-06-01T10:00:00Z',
        durationS: 4000,
        name: 'r',
        curve: curveWith({ 1199: 280 }),
      },
    ]);

    const { result } = renderHook(() =>
      usePerformanceRecords('last-90d-vs-previous-90d')
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const twentyMin = result.current.tiles.find((t) => t.durationSeconds === 1200);
    expect(twentyMin?.record?.watts).toBe(280);
    expect(twentyMin?.record?.wkg).toBeCloseTo(280 / 75, 2);
  });

  it('produces a wkg radar value per axis for both periods', async () => {
    useStore.setState({
      weightHistory: [{ id: 'w1', recordedAt: '2025-01-01', weightKg: 70 }],
    });
    vi.mocked(curvesLib.listActivitiesWithCurvesInRange).mockResolvedValue([
      {
        stravaId: 'a',
        startedAt: '2025-06-01T10:00:00Z',
        durationS: 4000,
        name: 'r',
        curve: curveWith({ 4: 700, 29: 600, 59: 500, 299: 400, 1199: 300, 3599: 250 }),
      },
    ]);
    const { result } = renderHook(() =>
      usePerformanceRecords('last-90d-vs-previous-90d')
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.radar.current).toHaveLength(6);
    expect(result.current.radar.comparison).toHaveLength(6);
    const fiveS = result.current.radar.current.find((p) => p.durationSeconds === 5);
    expect(fiveS?.wkg).toBeCloseTo(700 / 70, 2);
  });
});

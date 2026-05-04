import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStravaActivitySync } from './use-strava-activity-sync';

const mockInvoke = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    functions: { invoke: mockInvoke },
  }),
}));
vi.mock('@/lib/performance/activities', () => ({
  getActivitySyncMeta: vi.fn().mockResolvedValue({
    lastSyncedAt: null,
    lastStravaAfter: null,
  }),
}));

describe('useStravaActivitySync', () => {
  it('starts idle', () => {
    mockInvoke.mockClear();
    const { result } = renderHook(() => useStravaActivitySync());
    expect(result.current.state).toBe('idle');
    expect(result.current.imported).toBe(0);
  });

  it('completes when the edge function returns done', async () => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValueOnce({
      data: { imported: 10, done: true, next_since: '2026-05-04T12:00:00Z' },
      error: null,
    });
    const { result } = renderHook(() => useStravaActivitySync());
    await act(async () => {
      await result.current.start({ since: '2025-01-01T00:00:00Z' });
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.imported).toBe(10);
  });

  it('enters rate_limited when the response includes rate_limited_until', async () => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValueOnce({
      data: {
        imported: 4,
        done: false,
        rate_limited_until: '2026-05-04T13:00:00Z',
        next_since: '2026-05-03T00:00:00Z',
      },
      error: null,
    });
    const { result } = renderHook(() => useStravaActivitySync());
    await act(async () => {
      await result.current.start({ since: '2025-01-01T00:00:00Z' });
    });
    expect(result.current.state).toBe('rate_limited');
    expect(result.current.rateLimitedUntil).toBe('2026-05-04T13:00:00Z');
    expect(result.current.imported).toBe(4);
  });

  it('enters error state on edge-function error', async () => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useStravaActivitySync());
    await act(async () => {
      await result.current.start({ since: '2025-01-01T00:00:00Z' });
    });
    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('boom');
  });
});

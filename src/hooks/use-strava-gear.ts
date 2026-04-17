import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { fetchStravaBikes, type StravaBike } from '@/lib/gear/strava-gear';

const CACHE_MS = 10 * 60 * 1000;

export interface UseStravaGearResult {
  bikes: StravaBike[] | null;
  isFetching: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  refresh: () => Promise<void>;
}

export function useStravaGear(options: { autoFetch?: boolean } = {}): UseStravaGearResult {
  const { autoFetch = true } = options;
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [bikes, setBikes] = useState<StravaBike[] | null>(null);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    setFetching(true);
    setError(null);
    const p = (async () => {
      try {
        const result = await fetchStravaBikes(supabase);
        setBikes(result);
        setLastSyncedAt(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Strava fetch failed');
      } finally {
        setFetching(false);
        inflight.current = null;
      }
    })();
    inflight.current = p;
    return p;
  }, [supabase]);

  useEffect(() => {
    if (!autoFetch) return;
    if (lastSyncedAt && Date.now() - lastSyncedAt < CACHE_MS) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  return { bikes, isFetching, error, lastSyncedAt, refresh };
}

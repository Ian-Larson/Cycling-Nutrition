import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getActivitySyncMeta } from '@/lib/performance/activities';

export type SyncState = 'idle' | 'syncing' | 'rate_limited' | 'error';

export interface SyncResponseShape {
  imported: number;
  done: boolean;
  next_since?: string;
  rate_limited_until?: string;
}

export interface StartOptions {
  since: string;
  max?: number;
}

export interface UseStravaActivitySyncResult {
  state: SyncState;
  imported: number;
  lastSyncedAt: string | null;
  rateLimitedUntil: string | null;
  error: string | null;
  start: (options: StartOptions) => Promise<void>;
}

const PAGE_BATCH = 50;

export function useStravaActivitySync(): UseStravaActivitySyncResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [state, setState] = useState<SyncState>('idle');
  const [imported, setImported] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    getActivitySyncMeta(supabase)
      .then((meta) => setLastSyncedAt(meta.lastSyncedAt))
      .catch(() => {
        // Silent — meta is optional; first sync will create it.
      });
  }, [supabase]);

  const start = useCallback(
    async ({ since, max = PAGE_BATCH }: StartOptions) => {
      if (!supabase) {
        setError('Supabase is not configured.');
        setState('error');
        return;
      }
      setState('syncing');
      setError(null);
      setImported(0);
      setRateLimitedUntil(null);

      let cursor = since;
      let totalImported = 0;
      while (true) {
        const { data, error: invokeError } = await supabase.functions.invoke(
          'strava-activities-sync',
          { body: { since: cursor, max } }
        );
        if (invokeError) {
          setError(invokeError.message);
          setState('error');
          return;
        }
        const resp = data as SyncResponseShape;
        totalImported += resp.imported;
        setImported(totalImported);
        if (resp.rate_limited_until) {
          setRateLimitedUntil(resp.rate_limited_until);
          setState('rate_limited');
          return;
        }
        if (resp.done || !resp.next_since || resp.imported === 0) {
          setLastSyncedAt(new Date().toISOString());
          setState('idle');
          return;
        }
        cursor = resp.next_since;
      }
    },
    [supabase]
  );

  return { state, imported, lastSyncedAt, rateLimitedUntil, error, start };
}

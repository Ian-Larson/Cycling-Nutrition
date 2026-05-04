import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { listRecentActivities } from '@/lib/performance/activities';
import type { Activity } from '@/types/activity';

const DEFAULT_LIMIT = 10;

export interface UseActivitiesResult {
  activities: Activity[];
  isFetching: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActivities(limit = DEFAULT_LIMIT): UseActivitiesResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    if (inflight.current) return inflight.current;
    setFetching(true);
    setError(null);
    const p = (async () => {
      try {
        const result = await listRecentActivities(supabase, limit);
        setActivities(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load activities');
      } finally {
        setFetching(false);
        inflight.current = null;
      }
    })();
    inflight.current = p;
    return p;
  }, [supabase, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, isFetching, error, refresh };
}

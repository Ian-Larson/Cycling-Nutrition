import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { SnapshotCard } from '@/components/performance/snapshot-card';
import { PeriodControl } from '@/components/performance/period-control';
import { TrendMultiples } from '@/components/performance/trend-multiples';
import { PrTiles } from '@/components/performance/pr-tiles';
import { PowerProfileHexagon } from '@/components/performance/power-profile-hexagon';
import { RecentRides } from '@/components/performance/recent-rides';
import { SetupCard } from '@/components/performance/setup-card';
import { ConnectStravaCard } from '@/components/performance/connect-strava-card';
import { DataStatusFooter } from '@/components/performance/data-status-footer';
import { computeCurrentWkg } from '@/lib/performance/wkg';
import { useStore } from '@/store';
import { useAuth } from '@/lib/auth/auth-context';
import { useActivities } from '@/hooks/use-activities';
import { useStravaActivitySync } from '@/hooks/use-strava-activity-sync';
import { resolveBikeLinks } from '@/lib/performance/auto-link-bike';
import { listRecentActivities } from '@/lib/performance/activities';
import { getSupabaseClient } from '@/lib/supabase/client';
import { usePerformanceRecords } from '@/hooks/use-performance-records';
import type { PeriodKey } from '@/lib/performance/period';

/** How many activities to fetch when resolving bike links after a sync. */
const AUTO_LINK_FETCH_LIMIT = 200;

export function PerformancePage() {
  const [period, setPeriod] = useState<PeriodKey>('90d');

  const ftpHistory = useStore((s) => s.ftpHistory);
  const weightHistory = useStore((s) => s.weightHistory);
  const profile = useStore((s) => s.settings.athleteProfile);
  const bikes = useStore((s) => s.bikes);

  const { stravaConnection, connectStrava } = useAuth();
  const { activities, refresh: refreshActivities } = useActivities();
  const sync = useStravaActivitySync();
  const records = usePerformanceRecords(period);

  const hasActivityScope =
    stravaConnection?.scopes?.includes('activity:read') ?? false;
  const isStravaConnected = Boolean(stravaConnection);
  const hasFitness =
    profile.ftpWatts !== undefined && profile.weightKg !== undefined;
  const hasAnyActivity = activities.length > 0;
  const showDataExperience = hasFitness || isStravaConnected;

  const applyBikeLinks = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const fresh = await listRecentActivities(supabase, AUTO_LINK_FETCH_LIMIT);
    const links = resolveBikeLinks(fresh, bikes);
    if (links.length === 0) return;
    await Promise.all(
      links.map(({ stravaId, bikeId }) =>
        supabase
          .from('activities')
          .update({ bike_id: bikeId })
          .eq('strava_id', stravaId)
      )
    );
  }, [bikes]);

  const handleSync = useCallback(async () => {
    const since =
      sync.lastSyncedAt ??
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await sync.start({ since });
    await refreshActivities();
    await applyBikeLinks();
    await refreshActivities();
  }, [sync, refreshActivities, applyBikeLinks]);

  const handleBackfill = useCallback(
    async ({ since }: { since: string }) => {
      await sync.start({ since });
      await refreshActivities();
      await applyBikeLinks();
      await refreshActivities();
    },
    [sync, refreshActivities, applyBikeLinks]
  );

  const autoFired = useRef(false);

  useEffect(() => {
    if (autoFired.current) return;
    if (!hasActivityScope) return;
    const oneDay = 24 * 60 * 60 * 1000;
    const last = sync.lastSyncedAt ? new Date(sync.lastSyncedAt).getTime() : 0;
    if (Date.now() - last < oneDay) return;
    autoFired.current = true;
    handleSync().catch(() => {
      // Surfaces in the sync state machine if it fails.
    });
  }, [hasActivityScope, sync.lastSyncedAt, handleSync]);

  const currentWkg = computeCurrentWkg(profile.ftpWatts, profile.weightKg);

  const showPrSections = hasFitness && isStravaConnected && hasAnyActivity;

  const footer = useMemo(() => {
    if (!isStravaConnected) return null;
    if (!hasActivityScope) {
      return <DataStatusFooter kind="reauth" onReconnect={connectStrava} />;
    }
    if (!hasAnyActivity && sync.state === 'idle') {
      return <DataStatusFooter kind="backfill" onStart={handleBackfill} />;
    }
    return (
      <DataStatusFooter
        kind="sync"
        state={sync.state}
        imported={sync.imported}
        lastSyncedAt={sync.lastSyncedAt}
        rateLimitedUntil={sync.rateLimitedUntil}
        error={sync.error}
        onSync={handleSync}
      />
    );
  }, [
    isStravaConnected,
    hasActivityScope,
    hasAnyActivity,
    sync.state,
    sync.imported,
    sync.lastSyncedAt,
    sync.rateLimitedUntil,
    sync.error,
    connectStrava,
    handleBackfill,
    handleSync,
  ]);

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        title="Are you getting stronger?"
        description="Your w/kg, power records, and profile compared across periods. Update FTP and weight from Account."
      />

      {!showDataExperience ? (
        <SetupCard
          hasFitness={hasFitness}
          isStravaConnected={isStravaConnected}
          onConnectStrava={connectStrava}
        />
      ) : (
        <>
          <SnapshotCard
            currentWkg={currentWkg}
            ftpWatts={profile.ftpWatts}
            weightKg={profile.weightKg}
            ftpHistory={ftpHistory}
            weightHistory={weightHistory}
            period={period}
          />

          <PeriodControl value={period} onChange={setPeriod} sticky />

          <TrendMultiples
            ftpHistory={ftpHistory}
            weightHistory={weightHistory}
            ftpWatts={profile.ftpWatts}
            weightKg={profile.weightKg}
            period={period}
          />

          {showPrSections && (
            <>
              <PrTiles tiles={records.tiles} />
              <PowerProfileHexagon
                current={records.radar.current}
                comparison={records.radar.comparison}
                currentLabel={records.radar.currentLabel}
                comparisonLabel={records.radar.comparisonLabel}
              />
              <RecentRides activities={activities} />
            </>
          )}

          {hasFitness && !isStravaConnected && (
            <ConnectStravaCard onConnect={connectStrava} />
          )}

          {!hasFitness && (
            <SetupCard
              hasFitness={hasFitness}
              isStravaConnected={isStravaConnected}
              onConnectStrava={connectStrava}
            />
          )}

          {footer}
        </>
      )}
    </div>
  );
}

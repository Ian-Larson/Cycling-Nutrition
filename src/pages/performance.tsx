import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { HeroStrip } from '@/components/performance/hero-strip';
import {
  RangeToggle,
  type RangeKey,
} from '@/components/performance/range-toggle';
import {
  TrendTrioChart,
  type TrendSeries,
} from '@/components/performance/trend-trio-chart';
import {
  computeCurrentWkg,
  computeWkgAtDate,
  computeWkgDeltaVsDaysAgo,
} from '@/lib/performance/wkg';
import { closestPriorEntry } from '@/lib/performance/history';
import { useStore } from '@/store';
import { useAuth } from '@/lib/auth/auth-context';
import { useActivities } from '@/hooks/use-activities';
import { useStravaActivitySync } from '@/hooks/use-strava-activity-sync';
import { BackfillPrompt } from '@/components/performance/backfill-prompt';
import { SyncButton } from '@/components/performance/sync-button';
import { RecentRides } from '@/components/performance/recent-rides';
import { StravaReauthBanner } from '@/components/performance/strava-reauth-banner';
import { resolveBikeLinks } from '@/lib/performance/auto-link-bike';
import { listRecentActivities } from '@/lib/performance/activities';
import { getSupabaseClient } from '@/lib/supabase/client';
import { usePerformanceRecords } from '@/hooks/use-performance-records';
import { PrTiles } from '@/components/performance/pr-tiles';
import { PowerProfileHexagon } from '@/components/performance/power-profile-hexagon';
import { PeriodPresetSelector } from '@/components/performance/period-preset-selector';
import type { PeriodPreset } from '@/lib/performance/period';

const RANGE_DAYS: Record<RangeKey, number | null> = {
  '3mo': 90,
  '6mo': 180,
  '12mo': 365,
  all: null,
};

const SAMPLE_POINTS = 48;

/** How many activities to fetch when resolving bike links after a sync. */
const AUTO_LINK_FETCH_LIMIT = 200;

export function PerformancePage() {
  const [range, setRange] = useState<RangeKey>('12mo');
  const ftpHistory = useStore((s) => s.ftpHistory);
  const weightHistory = useStore((s) => s.weightHistory);
  const profile = useStore((s) => s.settings.athleteProfile);
  const bikes = useStore((s) => s.bikes);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('last-90d-vs-previous-90d');
  const { stravaConnection, connectStrava } = useAuth();
  const { activities, refresh: refreshActivities } = useActivities();
  const sync = useStravaActivitySync();
  const records = usePerformanceRecords(periodPreset);
  const hasAnyActivity = activities.length > 0;

  const hasActivityScope =
    stravaConnection?.scopes?.includes('activity:read') ?? false;
  const isStravaConnected = Boolean(stravaConnection);

  const applyBikeLinks = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    // Re-fetch the latest 200 activities directly to avoid the stale-closure
    // trap on `activities` after a sync just appended new rows.
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

  const delta90d = useMemo(() => {
    if (currentWkg === undefined) return undefined;
    return computeWkgDeltaVsDaysAgo({
      ftpHistory,
      weightHistory,
      currentWkg,
      daysAgo: 90,
    });
  }, [currentWkg, ftpHistory, weightHistory]);

  const series = useMemo<TrendSeries>(() => {
    return buildSeries({
      ftpHistory,
      weightHistory,
      profile,
      range,
    });
  }, [ftpHistory, weightHistory, profile, range]);

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        title="Are you getting stronger?"
        description="Your w/kg trend, FTP, and weight in one glance. Manually log new values from Account."
      />

      <HeroStrip
        currentWkg={currentWkg}
        delta90d={delta90d}
        ftpWatts={profile.ftpWatts}
        weightKg={profile.weightKg}
      />

      <div className="flex justify-end">
        <RangeToggle value={range} onChange={setRange} />
      </div>

      <TrendTrioChart series={series} />

      {hasAnyActivity && (
        <>
          <PrTiles tiles={records.tiles} />

          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider text-ink-500">
              Power profile
            </h2>
            <PeriodPresetSelector value={periodPreset} onChange={setPeriodPreset} />
          </div>

          <PowerProfileHexagon
            current={records.radar.current}
            comparison={records.radar.comparison}
            currentLabel={records.radar.currentLabel}
            comparisonLabel={records.radar.comparisonLabel}
          />
        </>
      )}

      {isStravaConnected && !hasActivityScope && (
        <StravaReauthBanner onReconnect={connectStrava} />
      )}

      {isStravaConnected && hasActivityScope && activities.length === 0 && sync.state === 'idle' && (
        <BackfillPrompt
          onStart={async ({ since }) => {
            await sync.start({ since });
            await refreshActivities();
            await applyBikeLinks();
            await refreshActivities();
          }}
        />
      )}

      {isStravaConnected && hasActivityScope && (activities.length > 0 || sync.state !== 'idle') && (
        <SyncButton
          state={sync.state}
          imported={sync.imported}
          lastSyncedAt={sync.lastSyncedAt}
          rateLimitedUntil={sync.rateLimitedUntil}
          error={sync.error}
          onSync={handleSync}
        />
      )}

      {activities.length > 0 && <RecentRides activities={activities} />}
    </div>
  );
}

interface BuildSeriesArgs {
  ftpHistory: ReturnType<typeof useStore.getState>['ftpHistory'];
  weightHistory: ReturnType<typeof useStore.getState>['weightHistory'];
  profile: ReturnType<typeof useStore.getState>['settings']['athleteProfile'];
  range: RangeKey;
}

function buildSeries({
  ftpHistory,
  weightHistory,
  profile,
  range,
}: BuildSeriesArgs): TrendSeries {
  const days = RANGE_DAYS[range];
  const now = Date.now();
  const earliestEntry = Math.min(
    ...ftpHistory.map((e) => Date.parse(e.recordedAt)),
    ...weightHistory.map((e) => Date.parse(e.recordedAt)),
    now
  );
  const start =
    days === null ? earliestEntry : now - days * 24 * 60 * 60 * 1000;

  if (start >= now) {
    return { wkg: [], ftp: [], weight: [] };
  }

  const sampleStep = (now - start) / SAMPLE_POINTS;
  const samples: string[] = [];
  for (let i = 0; i <= SAMPLE_POINTS; i++) {
    const ts = start + i * sampleStep;
    samples.push(new Date(ts).toISOString().slice(0, 10));
  }

  const wkg = samples
    .map((iso) => {
      const value = computeWkgAtDate(ftpHistory, weightHistory, iso);
      return value === undefined ? null : { dateIso: iso, value };
    })
    .filter((p): p is { dateIso: string; value: number } => p !== null);

  const ftp = samples
    .map((iso) => {
      const entry = closestPriorEntry(ftpHistory, iso);
      return entry ? { dateIso: iso, value: entry.ftpWatts } : null;
    })
    .filter((p): p is { dateIso: string; value: number } => p !== null);

  const weight = samples
    .map((iso) => {
      const entry = closestPriorEntry(weightHistory, iso);
      return entry ? { dateIso: iso, value: entry.weightKg } : null;
    })
    .filter((p): p is { dateIso: string; value: number } => p !== null);

  // Append "today" with current profile values so the line ends at the most
  // current value even if no history entry was logged today.
  const todayIso = new Date(now).toISOString().slice(0, 10);
  if (profile.ftpWatts && profile.weightKg) {
    wkg.push({ dateIso: todayIso, value: profile.ftpWatts / profile.weightKg });
  }
  if (profile.ftpWatts) {
    ftp.push({ dateIso: todayIso, value: profile.ftpWatts });
  }
  if (profile.weightKg) {
    weight.push({ dateIso: todayIso, value: profile.weightKg });
  }

  return { wkg, ftp, weight };
}

import { useMemo, useState } from 'react';
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

const RANGE_DAYS: Record<RangeKey, number | null> = {
  '3mo': 90,
  '6mo': 180,
  '12mo': 365,
  all: null,
};

const SAMPLE_POINTS = 48;

export function PerformancePage() {
  const [range, setRange] = useState<RangeKey>('12mo');
  const ftpHistory = useStore((s) => s.ftpHistory);
  const weightHistory = useStore((s) => s.weightHistory);
  const profile = useStore((s) => s.settings.athleteProfile);

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

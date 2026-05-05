import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, SpecRow } from '@/components/ui';
import {
  PERIOD_DAYS,
  PERIOD_FULL_LABELS,
  PERIOD_SHORT_LABELS,
  type PeriodKey,
} from '@/lib/performance/period';
import { computeWkgAtDate } from '@/lib/performance/wkg';
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';

const SAMPLE_POINTS = 32;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface SnapshotCardProps {
  currentWkg: number | undefined;
  ftpWatts: number | undefined;
  weightKg: number | undefined;
  ftpHistory: readonly FtpHistoryEntry[];
  weightHistory: readonly WeightHistoryEntry[];
  period: PeriodKey;
}

export function SnapshotCard({
  currentWkg,
  ftpWatts,
  weightKg,
  ftpHistory,
  weightHistory,
  period,
}: SnapshotCardProps) {
  const sparkline = useMemo(
    () => buildSparkline({ ftpHistory, weightHistory, period }),
    [ftpHistory, weightHistory, period]
  );

  const delta = useMemo(() => {
    if (currentWkg === undefined) return undefined;
    return computeDelta({ ftpHistory, weightHistory, currentWkg, period });
  }, [currentWkg, ftpHistory, weightHistory, period]);

  if (currentWkg === undefined) {
    return (
      <Card>
        <CardContent className="md:px-5 md:py-4">
          <h2 className="section-title">Set up your fitness picture</h2>
          <p className="mt-1.5 text-sm leading-6 text-ink-600">
            Add your FTP and weight in Account to see w/kg, trends, and how you
            compare across periods.
          </p>
          <Link
            to="/account#athlete"
            className="mt-3 inline-flex items-center text-sm font-medium text-brand-700 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 rounded-md"
          >
            Add FTP and weight →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const verdict = renderVerdict(delta, period);

  return (
    <Card>
      <CardContent className="md:px-5 md:py-4">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="min-w-0">
            <h2 className="section-kicker uppercase tracking-wider text-ink-500">
              Snapshot
            </h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-sans text-[2rem] font-bold tabular-nums leading-none tracking-tight text-ink-900 md:text-[2.25rem]">
                {currentWkg.toFixed(2)}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                W/kg at FTP
              </span>
            </div>
            <p className="mt-2 text-sm leading-5 text-ink-600">
              {verdict}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end">
            {sparkline && (
              <Sparkline
                points={sparkline.points}
                trend={sparkline.trend}
                ariaLabel={`W/kg sparkline for ${PERIOD_FULL_LABELS[period].toLowerCase()}`}
              />
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 md:min-w-[16rem]">
              <SpecRow
                label="FTP"
                value={ftpWatts ? `${ftpWatts} W` : '—'}
                muted={!ftpWatts}
              />
              <SpecRow
                label="Weight"
                value={weightKg ? `${weightKg} kg` : '—'}
                muted={!weightKg}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function renderVerdict(
  delta: number | undefined,
  period: PeriodKey
): React.ReactNode {
  const periodLabel = `prior ${PERIOD_SHORT_LABELS[period]}`;
  if (delta === undefined) {
    return (
      <span>
        Not enough history yet. Log FTP and weight a few times to compare across periods.
      </span>
    );
  }
  if (delta >= 0.1) {
    return (
      <span>
        <span className="font-semibold text-ink-900">Stronger.</span> W/kg up{' '}
        <span className="tabular-nums">{delta.toFixed(2)}</span> vs {periodLabel}.
      </span>
    );
  }
  if (delta <= -0.1) {
    return (
      <span>
        <span className="font-semibold text-ink-900">Slipping.</span> W/kg down{' '}
        <span className="tabular-nums">{Math.abs(delta).toFixed(2)}</span> vs {periodLabel}.
      </span>
    );
  }
  return (
    <span>
      <span className="font-semibold text-ink-900">Holding steady.</span> W/kg{' '}
      <span className="tabular-nums">{delta >= 0 ? '+' : ''}{delta.toFixed(2)}</span> vs {periodLabel}.
    </span>
  );
}

function computeDelta({
  ftpHistory,
  weightHistory,
  currentWkg,
  period,
}: {
  ftpHistory: readonly FtpHistoryEntry[];
  weightHistory: readonly WeightHistoryEntry[];
  currentWkg: number;
  period: PeriodKey;
}): number | undefined {
  const days = PERIOD_DAYS[period];
  const target = new Date(Date.now() - days * MS_PER_DAY);
  const iso = target.toISOString().slice(0, 10);
  const past = computeWkgAtDate(ftpHistory, weightHistory, iso);
  if (past === undefined) return undefined;
  return currentWkg - past;
}

interface SparkData {
  points: { x: number; y: number }[];
  trend: 'up' | 'down' | 'flat';
}

function buildSparkline({
  ftpHistory,
  weightHistory,
  period,
}: Pick<SnapshotCardProps, 'ftpHistory' | 'weightHistory' | 'period'>):
  | SparkData
  | null {
  const days = PERIOD_DAYS[period];
  const now = Date.now();
  const start = now - days * MS_PER_DAY;

  const samples: number[] = [];
  for (let i = 0; i <= SAMPLE_POINTS; i++) {
    samples.push(start + ((now - start) * i) / SAMPLE_POINTS);
  }
  const values = samples
    .map((ts) => {
      const iso = new Date(ts).toISOString().slice(0, 10);
      return computeWkgAtDate(ftpHistory, weightHistory, iso);
    })
    .filter((v): v is number => v !== undefined);

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.05, max - min);
  const points = values.map((v, i) => ({
    x: i / (values.length - 1),
    y: 1 - (v - min) / span,
  }));

  const first = values[0];
  const last = values[values.length - 1];
  const trend: SparkData['trend'] =
    Math.abs(last - first) < 0.05 ? 'flat' : last > first ? 'up' : 'down';

  return { points, trend };
}

interface SparklineProps {
  points: { x: number; y: number }[];
  trend: 'up' | 'down' | 'flat';
  ariaLabel: string;
}

function Sparkline({ points, trend, ariaLabel }: SparklineProps) {
  const W = 160;
  const H = 40;
  const PAD = 2;
  const path = points
    .map((p, i) => {
      const x = PAD + p.x * (W - PAD * 2);
      const y = PAD + p.y * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const stroke =
    trend === 'down' ? 'var(--color-ink-500)' : 'var(--color-brand-500)';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      className="h-10 w-40 self-end"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

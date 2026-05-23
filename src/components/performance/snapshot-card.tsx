import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui';
import {
  PERIOD_DAYS,
  PERIOD_SHORT_LABELS,
  type PeriodKey,
} from '@/lib/performance/period';
import { computeWkgAtDate } from '@/lib/performance/wkg';
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';

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
  const briefTitle = renderBriefTitle(delta);
  const changeLabel = formatChange(delta);

  return (
    <Card>
      <CardContent className="space-y-4 md:px-5 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="min-w-0">
            <p className="section-kicker uppercase tracking-wider text-ink-500">
              Fitness brief
            </p>
            <h2 className="section-title mt-1.5">{briefTitle}</h2>
            <p className="mt-1.5 max-w-[62ch] text-sm leading-6 text-ink-600">
              {verdict}
            </p>
          </div>
          <Link
            to="/account#athlete"
            className="inline-flex min-h-10 items-center self-start rounded-xl px-3 text-sm font-medium text-ink-700 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
          >
            Update profile
          </Link>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:items-stretch">
          <div className="surface-note border-brand-200 bg-brand-50/45 px-4 py-3.5 md:px-5 md:py-4">
            <p className="page-stat-label text-brand-700">Current fitness</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-sans text-[2.1rem] font-bold tabular-nums leading-none tracking-tight text-ink-900 md:text-[2.35rem]">
                {currentWkg.toFixed(2)}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                W/kg
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-brand-900">
              Based on current FTP and weight.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BriefMetric
              label="FTP"
              value={ftpWatts ? `${Math.round(ftpWatts)} W` : '—'}
              muted={!ftpWatts}
            />
            <BriefMetric
              label="Weight"
              value={weightKg ? `${weightKg.toFixed(1)} kg` : '—'}
              muted={!weightKg}
            />
            <BriefMetric
              label={`Vs ${PERIOD_SHORT_LABELS[period]}`}
              value={changeLabel}
              muted={delta === undefined}
            />
            <BriefMetric label="Window" value={PERIOD_SHORT_LABELS[period]} />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

function BriefMetric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="surface-note px-3 py-3">
      <p className="page-stat-label">{label}</p>
      <p
        className={[
          'page-stat-value mt-1',
          muted ? 'text-ink-400' : 'text-ink-900',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  );
}

function renderBriefTitle(delta: number | undefined): string {
  if (delta === undefined) return 'Ready once history builds';
  if (delta >= 0.1) return 'Power is moving up';
  if (delta <= -0.1) return 'Fitness is sliding';
  return 'Fitness is steady';
}

function formatChange(delta: number | undefined): string {
  if (delta === undefined) return 'Need history';
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
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

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { closestPriorEntry } from '@/lib/performance/history';
import {
  PERIOD_DAYS,
  PERIOD_FULL_LABELS,
  type PeriodKey,
} from '@/lib/performance/period';
import { computeWkgAtDate } from '@/lib/performance/wkg';
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';

const SAMPLE_POINTS = 48;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ROW_W = 600;
const ROW_H = 72;
const ROW_PAD = { top: 10, right: 12, bottom: 18, left: 44 };
const PLOT_W = ROW_W - ROW_PAD.left - ROW_PAD.right;
const PLOT_H = ROW_H - ROW_PAD.top - ROW_PAD.bottom;

interface TrendPoint {
  iso: string;
  value: number;
}

interface SeriesSpec {
  key: 'wkg' | 'ftp' | 'weight';
  label: string;
  unit: string;
  format: (v: number) => string;
  stroke: string;
  domainPad: number;
}

const SERIES: SeriesSpec[] = [
  {
    key: 'wkg',
    label: 'W/kg',
    unit: 'w/kg',
    format: (v) => v.toFixed(2),
    stroke: 'var(--color-brand-500)',
    domainPad: 0.05,
  },
  {
    key: 'ftp',
    label: 'FTP',
    unit: 'W',
    format: (v) => Math.round(v).toString(),
    stroke: 'var(--color-ink-700)',
    domainPad: 2,
  },
  {
    key: 'weight',
    label: 'Weight',
    unit: 'kg',
    format: (v) => v.toFixed(1),
    stroke: 'var(--color-ink-700)',
    domainPad: 0.5,
  },
];

interface TrendMultiplesProps {
  ftpHistory: readonly FtpHistoryEntry[];
  weightHistory: readonly WeightHistoryEntry[];
  ftpWatts: number | undefined;
  weightKg: number | undefined;
  period: PeriodKey;
}

export function TrendMultiples({
  ftpHistory,
  weightHistory,
  ftpWatts,
  weightKg,
  period,
}: TrendMultiplesProps) {
  const series = useMemo(
    () => buildSeries({ ftpHistory, weightHistory, ftpWatts, weightKg, period }),
    [ftpHistory, weightHistory, ftpWatts, weightKg, period]
  );

  const allEmpty =
    series.wkg.length === 0 && series.ftp.length === 0 && series.weight.length === 0;

  return (
    <Card>
      <CardHeader className="flex items-baseline justify-between gap-3">
        <div className="section-kicker uppercase tracking-wider text-ink-500">
          Trend
        </div>
        <div className="text-xs text-ink-500">
          {PERIOD_FULL_LABELS[period]}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {allEmpty ? (
          <p className="py-6 text-center text-sm text-ink-600">
            Not enough history to draw a trend yet. Log FTP and weight a few times.
          </p>
        ) : (
          SERIES.map((spec) => (
            <SparkRow
              key={spec.key}
              spec={spec}
              points={series[spec.key]}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface SeriesData {
  wkg: TrendPoint[];
  ftp: TrendPoint[];
  weight: TrendPoint[];
}

function buildSeries({
  ftpHistory,
  weightHistory,
  ftpWatts,
  weightKg,
  period,
}: {
  ftpHistory: readonly FtpHistoryEntry[];
  weightHistory: readonly WeightHistoryEntry[];
  ftpWatts: number | undefined;
  weightKg: number | undefined;
  period: PeriodKey;
}): SeriesData {
  const days = PERIOD_DAYS[period];
  const now = Date.now();
  const start = now - days * MS_PER_DAY;

  const samples: string[] = [];
  for (let i = 0; i <= SAMPLE_POINTS; i++) {
    const ts = start + ((now - start) * i) / SAMPLE_POINTS;
    samples.push(new Date(ts).toISOString().slice(0, 10));
  }
  const todayIso = new Date(now).toISOString().slice(0, 10);

  const wkg: TrendPoint[] = samples
    .map((iso) => {
      const v = computeWkgAtDate(ftpHistory, weightHistory, iso);
      return v === undefined ? null : { iso, value: v };
    })
    .filter((p): p is TrendPoint => p !== null);

  const ftp: TrendPoint[] = samples
    .map((iso) => {
      const e = closestPriorEntry(ftpHistory, iso);
      return e ? { iso, value: e.ftpWatts } : null;
    })
    .filter((p): p is TrendPoint => p !== null);

  const weight: TrendPoint[] = samples
    .map((iso) => {
      const e = closestPriorEntry(weightHistory, iso);
      return e ? { iso, value: e.weightKg } : null;
    })
    .filter((p): p is TrendPoint => p !== null);

  if (ftpWatts && weightKg) {
    wkg.push({ iso: todayIso, value: ftpWatts / weightKg });
  }
  if (ftpWatts) ftp.push({ iso: todayIso, value: ftpWatts });
  if (weightKg) weight.push({ iso: todayIso, value: weightKg });

  return { wkg, ftp, weight };
}

interface SparkRowProps {
  spec: SeriesSpec;
  points: TrendPoint[];
}

function SparkRow({ spec, points }: SparkRowProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 py-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          {spec.label}
        </div>
        <div className="h-[72px] rounded-md bg-shell-200/60" aria-hidden />
        <div className="text-sm tabular-nums text-ink-400">—</div>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const isFlat = max - min < spec.domainPad / 2;
  const span = isFlat ? spec.domainPad : (max - min) * 1.2;
  const yMin = (min + max) / 2 - span / 2;
  const yMax = (min + max) / 2 + span / 2;

  const xMin = Date.parse(points[0].iso);
  const xMax = Date.parse(points[points.length - 1].iso);
  const xSpan = Math.max(1, xMax - xMin);

  const xy = points.map((p) => ({
    x: ROW_PAD.left + ((Date.parse(p.iso) - xMin) / xSpan) * PLOT_W,
    y: ROW_PAD.top + (1 - (p.value - yMin) / (yMax - yMin)) * PLOT_H,
  }));

  const path = xy
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  const last = points[points.length - 1];

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * ROW_W;
    let nearest = 0;
    let bestDx = Infinity;
    for (let i = 0; i < xy.length; i++) {
      const dx = Math.abs(xy[i].x - px);
      if (dx < bestDx) {
        bestDx = dx;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  };

  const handleLeave = () => setHoverIndex(null);

  const active = hoverIndex !== null ? xy[hoverIndex] : null;
  const activeValue =
    hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 py-1.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {spec.label}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${ROW_W} ${ROW_H}`}
          role="img"
          aria-label={`${spec.label} trend over the selected period`}
          className="block h-[72px] w-full touch-none"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <line
            x1={ROW_PAD.left}
            x2={ROW_W - ROW_PAD.right}
            y1={ROW_H - ROW_PAD.bottom}
            y2={ROW_H - ROW_PAD.bottom}
            stroke="var(--color-ink-100)"
            strokeWidth={1}
          />
          {isFlat ? (
            <text
              x={ROW_PAD.left - 6}
              y={ROW_PAD.top + PLOT_H / 2}
              fontSize="10"
              fill="var(--color-ink-500)"
              textAnchor="end"
              dominantBaseline="middle"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {spec.format((min + max) / 2)}
            </text>
          ) : (
            <>
              <text
                x={ROW_PAD.left - 6}
                y={ROW_PAD.top + 4}
                fontSize="10"
                fill="var(--color-ink-500)"
                textAnchor="end"
                dominantBaseline="hanging"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {spec.format(yMax)}
              </text>
              <text
                x={ROW_PAD.left - 6}
                y={ROW_H - ROW_PAD.bottom}
                fontSize="10"
                fill="var(--color-ink-500)"
                textAnchor="end"
                dominantBaseline="middle"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {spec.format(yMin)}
              </text>
            </>
          )}
          <path
            d={path}
            fill="none"
            stroke={spec.stroke}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {active && (
            <>
              <line
                x1={active.x}
                x2={active.x}
                y1={ROW_PAD.top}
                y2={ROW_H - ROW_PAD.bottom}
                stroke="var(--color-ink-300)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <circle
                cx={active.x}
                cy={active.y}
                r={3}
                fill={spec.stroke}
                stroke="white"
                strokeWidth={1.5}
              />
            </>
          )}
        </svg>
        {activeValue ? (
          <div
            className="pointer-events-none absolute -top-1 right-1 rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-0.5 text-[11px] tabular-nums shadow-[var(--shadow-soft)]"
            aria-hidden
          >
            <span className="font-semibold text-ink-900">
              {spec.format(activeValue.value)}
            </span>
            <span className="ml-1 text-ink-500">{spec.unit}</span>
            <span className="ml-2 text-ink-500">
              {new Date(activeValue.iso).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        ) : null}
      </div>
      <div className="min-w-[5rem] text-right text-sm tabular-nums">
        <div className="font-semibold text-ink-900">{spec.format(last.value)}</div>
        <div className="text-[11px] uppercase tracking-wider text-ink-500">
          {spec.unit}
        </div>
      </div>
    </div>
  );
}

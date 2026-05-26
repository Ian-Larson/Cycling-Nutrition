import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui';
import {
  PERIOD_DAYS,
  PERIOD_FULL_LABELS,
  type PeriodKey,
} from '@/lib/performance/period';
import type { FtpHistoryEntry } from '@/types/performance';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const CHART_W = 760;
const CHART_H = 260;
const CHART_PAD = { top: 18, right: 18, bottom: 32, left: 48 };
const PLOT_LEFT = CHART_PAD.left;
const PLOT_RIGHT = CHART_W - CHART_PAD.right;
const PLOT_TOP = CHART_PAD.top;
const PLOT_BOTTOM = CHART_H - CHART_PAD.bottom;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;

interface FtpPoint {
  iso: string;
  value: number;
}

interface FtpSeries {
  points: FtpPoint[];
  startIso: string;
  endIso: string;
}

interface ActivePoint {
  x: number;
  y: number;
  ratio: number;
  iso: string;
  value: number;
}

interface TrendMultiplesProps {
  ftpHistory: readonly FtpHistoryEntry[];
  ftpWatts: number | undefined;
  period: PeriodKey;
}

export function TrendMultiples({
  ftpHistory,
  ftpWatts,
  period,
}: TrendMultiplesProps) {
  const currentFtpWatts = getCurrentFtpWatts(ftpHistory, ftpWatts);
  const series = useMemo(
    () => buildFtpSeries({ ftpHistory, ftpWatts: currentFtpWatts, period }),
    [ftpHistory, currentFtpWatts, period]
  );
  const latest = series.points[series.points.length - 1];
  const first = series.points[0];
  const delta =
    latest && first && series.points.length > 1 ? latest.value - first.value : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="section-kicker uppercase tracking-wider text-ink-500">
            FTP over time
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Logged threshold changes over {PERIOD_FULL_LABELS[period].toLowerCase()}.
          </p>
        </div>
        <div className="text-left md:text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Current
          </div>
          <div className="mt-0.5 text-lg font-bold text-ink-900 [font-variant-numeric:tabular-nums]">
            {currentFtpWatts ? `${Math.round(currentFtpWatts)} W` : '—'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 md:px-5 md:py-5">
        {series.points.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-[color:var(--border-soft)] bg-shell-50 px-4 text-center text-sm text-ink-600">
            Add your latest FTP to start tracking the line.
          </div>
        ) : (
          <FtpChart points={series.points} startIso={series.startIso} endIso={series.endIso} />
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          <TrendStat
            label="Change"
            value={delta === undefined ? 'Need history' : `${delta >= 0 ? '+' : ''}${delta} W`}
            muted={delta === undefined}
          />
          <TrendStat label="Entries" value={String(ftpHistory.length)} />
          <TrendStat
            label="Window"
            value={PERIOD_FULL_LABELS[period]}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FtpChart({
  points,
  startIso,
  endIso,
}: {
  points: readonly FtpPoint[];
  startIso: string;
  endIso: string;
}) {
  const [active, setActive] = useState<ActivePoint | null>(null);

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(10, (max - min) * 1.3);
  const yMin = Math.max(0, (min + max) / 2 - span / 2);
  const yMax = (min + max) / 2 + span / 2;

  const startTs = Date.parse(startIso);
  const endTs = Date.parse(endIso);
  const xSpan = Math.max(1, endTs - startTs);

  const yFor = (value: number) =>
    PLOT_TOP + (1 - (value - yMin) / (yMax - yMin)) * PLOT_H;
  const xForIso = (iso: string) =>
    PLOT_LEFT + ((Date.parse(iso) - startTs) / xSpan) * PLOT_W;

  const coords = points.map((point) => ({
    ...point,
    x: xForIso(point.iso),
    y: yFor(point.value),
  }));

  const path = coords
    .map((point, index) => {
      if (index === 0) return `M${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      return `H${point.x.toFixed(2)} V${point.y.toFixed(2)}`;
    })
    .join(' ');

  const firstX = coords[0]?.x ?? PLOT_LEFT;
  const lastX = coords[coords.length - 1]?.x ?? PLOT_RIGHT;

  const activeFromSvgX = (svgX: number): ActivePoint => {
    const x = clamp(svgX, firstX, lastX);
    const ratio = (x - PLOT_LEFT) / PLOT_W;
    const ts = startTs + ratio * xSpan;
    const iso = new Date(ts).toISOString().slice(0, 10);
    const value = valueAtIso(points, iso);
    return {
      x,
      y: yFor(value),
      ratio: x / CHART_W,
      iso,
      value,
    };
  };

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    setActive(activeFromSvgX(clientXToSvgX(event.clientX, event.currentTarget)));
  };

  const handleTouch = (event: React.TouchEvent<SVGSVGElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    setActive(activeFromSvgX(clientXToSvgX(touch.clientX, event.currentTarget)));
  };

  const handleKey = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (coords.length === 0) return;
    const activeIndex = active
      ? nearestCoordIndex(coords, active.x)
      : coords.length - 1;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = coords[Math.min(activeIndex + 1, coords.length - 1)];
      setActive(activeFromSvgX(next.x));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = coords[Math.max(activeIndex - 1, 0)];
      setActive(activeFromSvgX(next.x));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(activeFromSvgX(coords[0].x));
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(activeFromSvgX(coords[coords.length - 1].x));
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  };

  return (
    <div className="relative min-h-[16rem] overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-shell-50">
      <div className="pointer-events-none absolute left-3 top-3 z-[1] text-[11px] text-ink-500 [font-variant-numeric:tabular-nums]">
        {Math.round(yMax)} W
      </div>
      <div className="pointer-events-none absolute bottom-9 left-3 z-[1] text-[11px] text-ink-500 [font-variant-numeric:tabular-nums]">
        {Math.round(yMin)} W
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="FTP history chart. Use arrow keys to inspect logged FTP values."
        tabIndex={0}
        className="block h-[16rem] w-full outline-none touch-pan-y focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
        onMouseMove={handleMove}
        onMouseLeave={() => setActive(null)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={() => setActive(null)}
        onKeyDown={handleKey}
        onBlur={() => setActive(null)}
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = PLOT_TOP + ratio * PLOT_H;
          return (
            <line
              key={ratio}
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={y}
              y2={y}
              stroke="var(--color-ink-100)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <path
          d={path}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((point) => (
          <circle
            key={`${point.iso}-${point.value}`}
            cx={point.x}
            cy={point.y}
            r={3.5}
            fill="var(--surface-panel)"
            stroke="var(--color-brand-500)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke="var(--color-ink-400)"
              strokeWidth={1}
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={4.5}
              fill="var(--color-brand-500)"
              stroke="var(--surface-panel)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-[3.6rem] right-4 flex justify-between text-[11px] text-ink-500">
        <span>{formatShortDate(startIso)}</span>
        <span>{formatShortDate(endIso)}</span>
      </div>
      {active && (
        <div
          className="pointer-events-none absolute top-3 z-[2] min-w-[7.25rem] -translate-x-1/2 rounded-lg border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2.5 py-1.5 text-xs shadow-[var(--shadow-soft)]"
          style={{
            left: `${active.ratio * 100}%`,
          }}
          aria-hidden
        >
          <div className="font-semibold text-ink-900 [font-variant-numeric:tabular-nums]">
            {Math.round(active.value)} W
          </div>
          <div className="mt-0.5 text-[11px] text-ink-500">
            {formatShortDate(active.iso)}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendStat({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="surface-note px-3 py-2.5">
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

function buildFtpSeries({
  ftpHistory,
  ftpWatts,
  period,
}: {
  ftpHistory: readonly FtpHistoryEntry[];
  ftpWatts: number | undefined;
  period: PeriodKey;
}): FtpSeries {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - PERIOD_DAYS[period] * MS_PER_DAY);
  const startIso = start.toISOString().slice(0, 10);
  const entries = normalizeFtpEntries(ftpHistory, ftpWatts, todayIso);
  const prior = closestPriorPoint(entries, startIso);
  const visible = entries.filter(
    (entry) => entry.iso >= startIso && entry.iso <= todayIso
  );

  const points: FtpPoint[] = [];
  if (prior) points.push({ iso: startIso, value: prior.value });
  for (const entry of visible) {
    if (points.some((point) => point.iso === entry.iso)) continue;
    points.push(entry);
  }

  if (points.length === 0) {
    return { points, startIso, endIso: todayIso };
  }

  const last = points[points.length - 1];
  if (last.iso < todayIso) {
    points.push({ iso: todayIso, value: last.value });
  }

  return { points, startIso, endIso: todayIso };
}

function normalizeFtpEntries(
  ftpHistory: readonly FtpHistoryEntry[],
  ftpWatts: number | undefined,
  todayIso: string
): FtpPoint[] {
  const byDate = new Map<string, number>();
  for (const entry of ftpHistory) {
    if (!entry.recordedAt || !Number.isFinite(entry.ftpWatts) || entry.ftpWatts <= 0) {
      continue;
    }
    byDate.set(entry.recordedAt.slice(0, 10), Math.round(entry.ftpWatts));
  }

  if (
    byDate.size === 0 &&
    typeof ftpWatts === 'number' &&
    Number.isFinite(ftpWatts) &&
    ftpWatts > 0
  ) {
    byDate.set(todayIso, Math.round(ftpWatts));
  }
  return [...byDate.entries()]
    .map(([iso, value]) => ({ iso, value }))
    .sort((a, b) => (a.iso < b.iso ? -1 : 1));
}

function closestPriorPoint(
  points: readonly FtpPoint[],
  iso: string
): FtpPoint | undefined {
  let winner: FtpPoint | undefined;
  for (const point of points) {
    if (point.iso > iso) continue;
    if (!winner || point.iso >= winner.iso) winner = point;
  }
  return winner;
}

function getCurrentFtpWatts(
  ftpHistory: readonly FtpHistoryEntry[],
  fallbackFtpWatts: number | undefined
): number | undefined {
  const latest = latestFtpEntry(ftpHistory);
  return latest?.ftpWatts ?? fallbackFtpWatts;
}

function latestFtpEntry(
  entries: readonly FtpHistoryEntry[]
): FtpHistoryEntry | undefined {
  let latest: FtpHistoryEntry | undefined;
  for (const entry of entries) {
    if (!entry.recordedAt || !Number.isFinite(entry.ftpWatts) || entry.ftpWatts <= 0) {
      continue;
    }
    if (!latest || entry.recordedAt >= latest.recordedAt) {
      latest = entry;
    }
  }
  return latest;
}

function valueAtIso(points: readonly FtpPoint[], iso: string): number {
  const prior = closestPriorPoint(points, iso);
  return prior?.value ?? points[0].value;
}

function clientXToSvgX(clientX: number, svg: SVGSVGElement): number {
  try {
    const point = svg.createSVGPoint();
    const matrix = svg.getScreenCTM();
    if (matrix) {
      point.x = clientX;
      point.y = 0;
      return point.matrixTransform(matrix.inverse()).x;
    }
  } catch {
    // jsdom does not implement SVG coordinate transforms; browser use takes the path above.
  }

  const rect = svg.getBoundingClientRect();
  return ((clientX - rect.left) / Math.max(1, rect.width)) * CHART_W;
}

function nearestCoordIndex(coords: readonly { x: number }[], x: number): number {
  let nearest = 0;
  let best = Infinity;
  for (let index = 0; index < coords.length; index++) {
    const dx = Math.abs(coords[index].x - x);
    if (dx < best) {
      best = dx;
      nearest = index;
    }
  }
  return nearest;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

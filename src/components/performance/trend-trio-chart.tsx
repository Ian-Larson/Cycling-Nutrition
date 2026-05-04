import { useMemo } from 'react';

const WIDTH = 800;
const HEIGHT = 280;
const PLOT = { left: 40, right: 16, top: 16, bottom: 32 };

const PLOT_W = WIDTH - PLOT.left - PLOT.right;
const PLOT_H = HEIGHT - PLOT.top - PLOT.bottom;

export interface TrendPoint {
  dateIso: string;
  value: number;
}

export interface TrendSeries {
  wkg: TrendPoint[];
  ftp: TrendPoint[];
  weight: TrendPoint[];
}

interface TrendTrioChartProps {
  series: TrendSeries;
}

const COLORS = {
  wkg: 'var(--color-brand-500)',
  ftp: '#2563eb',
  weight: '#059669',
};

const LABELS = {
  wkg: 'W/kg',
  ftp: 'FTP (W)',
  weight: 'Weight (kg)',
};

type Key = keyof TrendSeries;

export function TrendTrioChart({ series }: TrendTrioChartProps) {
  const allEmpty = useMemo(
    () =>
      series.wkg.length === 0 &&
      series.ftp.length === 0 &&
      series.weight.length === 0,
    [series]
  );

  const xExtent = useMemo(() => extentDates(series), [series]);

  if (allEmpty || !xExtent) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed border-ink-300 bg-shell-50 text-sm text-ink-600">
        Log your FTP and weight to see your w/kg trend.
      </div>
    );
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="W/kg, FTP, and weight trend over time (normalized)"
        className="w-full h-auto"
      >
        {(['wkg', 'ftp', 'weight'] as Key[]).map((key) => {
          const points = normalize(series[key]);
          if (points.length === 0) return null;
          const d = pathFromPoints(points, xExtent);
          return (
            <path
              key={key}
              data-series={key}
              d={d}
              fill="none"
              stroke={COLORS[key]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <ul className="flex gap-4 px-2 pt-2 text-xs text-ink-700">
        {(['wkg', 'ftp', 'weight'] as Key[]).map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[key] }}
            />
            {LABELS[key]}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface NormalizedPoint {
  dateIso: string;
  pct: number; // % change from first value in series
}

function normalize(points: TrendPoint[]): NormalizedPoint[] {
  if (points.length === 0) return [];
  const base = points[0].value;
  if (base === 0) return [];
  return points.map((p) => ({
    dateIso: p.dateIso,
    pct: (p.value - base) / base,
  }));
}

function extentDates(series: TrendSeries): [number, number] | null {
  const all: number[] = [];
  for (const key of ['wkg', 'ftp', 'weight'] as Key[]) {
    for (const p of series[key]) {
      all.push(Date.parse(p.dateIso));
    }
  }
  if (all.length === 0) return null;
  return [Math.min(...all), Math.max(...all)];
}

function pathFromPoints(
  points: NormalizedPoint[],
  xExtent: [number, number]
): string {
  const [xMin, xMax] = xExtent;
  const xSpan = xMax - xMin || 1;

  // Y-axis: ±15% as ±half-plot. Clamp.
  const yScale = (pct: number) => {
    const clamped = Math.max(-0.15, Math.min(0.15, pct));
    return PLOT.top + PLOT_H / 2 - (clamped / 0.15) * (PLOT_H / 2);
  };

  return points
    .map((p, i) => {
      const x = PLOT.left + ((Date.parse(p.dateIso) - xMin) / xSpan) * PLOT_W;
      const y = yScale(p.pct);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

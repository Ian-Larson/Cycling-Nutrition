import { useMemo } from 'react';
import { buildMeanMaxPower, formatDuration } from '@/lib/power-meter-analyzer/analysis';
import type { ChartSeries, MeanMaxPoint } from '@/lib/power-meter-analyzer/types';

const WIDTH = 900;
const HEIGHT = 300;
const PLOT = {
  left: 54,
  right: 20,
  top: 20,
  bottom: 42,
};

interface MeanMaxChartProps {
  series: ChartSeries[];
}

function buildPath(
  points: MeanMaxPoint[],
  xScale: (value: number) => number,
  yScale: (value: number) => number
): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${xScale(point.durationSeconds).toFixed(2)},${yScale(point.value).toFixed(2)}`;
    })
    .join('');
}

export function MeanMaxChart({ series }: MeanMaxChartProps) {
  const meanMaxSeries = useMemo(
    () =>
      series.map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        points: buildMeanMaxPower(item.points),
      })),
    [series]
  );
  const populated = meanMaxSeries.filter((item) => item.points.length > 0);
  const allPoints = populated.flatMap((item) => item.points);

  if (allPoints.length === 0) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center text-sm text-ink-600">
        Mean-max power needs at least one file with enough samples.
      </div>
    );
  }

  const minDuration = Math.min(...allPoints.map((point) => point.durationSeconds));
  const maxDuration = Math.max(...allPoints.map((point) => point.durationSeconds));
  const maxPower = Math.max(...allPoints.map((point) => point.value));
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const logMin = Math.log10(minDuration);
  const logMax = Math.log10(Math.max(maxDuration, minDuration + 1));
  const xScale = (duration: number) =>
    PLOT.left + ((Math.log10(duration) - logMin) / (logMax - logMin)) * plotWidth;
  const yScale = (value: number) =>
    PLOT.top + (1 - value / Math.max(1, maxPower * 1.08)) * plotHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    return Math.round(((maxPower * 1.08) / 4) * index / 25) * 25;
  });
  const xTicks = [1, 5, 30, 60, 300, 1200, 3600].filter(
    (duration) => duration >= minDuration && duration <= maxDuration
  );

  return (
    <div>
      <div className="border-b border-[color:var(--border-soft)] px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">Mean-max power</p>
        <p className="text-xs leading-5 text-ink-600">
          Best rolling power by duration. X-axis uses a log scale.
        </p>
      </div>
      <svg
        role="img"
        aria-label="Mean max power comparison"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-[17rem] w-full bg-white"
      >
        {yTicks.map((tick) => (
          <g key={`mean-y-${tick}`}>
            <line
              x1={PLOT.left}
              x2={WIDTH - PLOT.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#e7edf2"
            />
            <text
              x={PLOT.left - 10}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="fill-ink-500 text-[0.72rem]"
            >
              {tick}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={`mean-x-${tick}`}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={PLOT.top}
              y2={HEIGHT - PLOT.bottom}
              stroke="#f1f1f1"
            />
            <text
              x={xScale(tick)}
              y={HEIGHT - 14}
              textAnchor="middle"
              className="fill-ink-500 text-[0.72rem]"
            >
              {formatDuration(tick)}
            </text>
          </g>
        ))}

        <line
          x1={PLOT.left}
          x2={PLOT.left}
          y1={PLOT.top}
          y2={HEIGHT - PLOT.bottom}
          stroke="#bcc4cc"
        />
        <line
          x1={PLOT.left}
          x2={WIDTH - PLOT.right}
          y1={HEIGHT - PLOT.bottom}
          y2={HEIGHT - PLOT.bottom}
          stroke="#bcc4cc"
        />

        {populated.map((item) => (
          <path
            key={item.id}
            d={buildPath(item.points, xScale, yScale)}
            fill="none"
            stroke={item.color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}

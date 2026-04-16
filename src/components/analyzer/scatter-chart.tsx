import { useMemo } from 'react';
import type { ReferenceComparison } from '@/lib/power-meter-analyzer/types';

const WIDTH = 520;
const HEIGHT = 360;
const PLOT = {
  left: 52,
  right: 22,
  top: 22,
  bottom: 44,
};

interface ScatterChartProps {
  comparisons: ReferenceComparison[];
  referenceName: string;
}

function samplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;

  const stride = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % stride === 0);
}

export function ScatterChart({ comparisons, referenceName }: ScatterChartProps) {
  const sampledComparisons = useMemo(
    () =>
      comparisons.map((comparison) => ({
        ...comparison,
        points: samplePoints(comparison.points, 700),
      })),
    [comparisons]
  );
  const allPoints = sampledComparisons.flatMap((comparison) => comparison.points);

  if (allPoints.length === 0) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center text-sm text-ink-600">
        Choose a reference and at least one matching file.
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...allPoints.flatMap((point) => [point.referenceValue, point.comparisonValue])
  );
  const axisMax = Math.ceil((maxValue * 1.08) / 50) * 50;
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const scale = (value: number) => PLOT.left + (value / axisMax) * plotWidth;
  const yScale = (value: number) =>
    PLOT.top + (1 - value / axisMax) * plotHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => {
    return Math.round((axisMax / 4) * index);
  });

  return (
    <div>
      <div className="border-b border-[color:var(--border-soft)] px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">Reference scatter</p>
        <p className="text-xs leading-5 text-ink-600">
          Matched samples against {referenceName}. The diagonal is perfect agreement.
        </p>
      </div>
      <svg
        role="img"
        aria-label="Reference power scatter comparison"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-[20rem] w-full bg-white"
      >
        {ticks.map((tick) => (
          <g key={`scatter-${tick}`}>
            <line
              x1={PLOT.left}
              x2={WIDTH - PLOT.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#e7edf2"
            />
            <line
              x1={scale(tick)}
              x2={scale(tick)}
              y1={PLOT.top}
              y2={HEIGHT - PLOT.bottom}
              stroke="#f1f1f1"
            />
            <text
              x={PLOT.left - 10}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="fill-ink-500 text-[0.72rem]"
            >
              {tick}
            </text>
            <text
              x={scale(tick)}
              y={HEIGHT - 14}
              textAnchor="middle"
              className="fill-ink-500 text-[0.72rem]"
            >
              {tick}
            </text>
          </g>
        ))}

        <line
          x1={PLOT.left}
          x2={WIDTH - PLOT.right}
          y1={HEIGHT - PLOT.bottom}
          y2={PLOT.top}
          stroke="#313b45"
          strokeDasharray="5 5"
          strokeWidth="1.2"
        />

        {sampledComparisons.map((comparison) => (
          <g key={comparison.fileId}>
            {comparison.points.map((point, index) => (
              <circle
                key={`${comparison.fileId}-${index}`}
                cx={scale(point.referenceValue)}
                cy={yScale(point.comparisonValue)}
                r="2"
                fill={comparison.color}
                opacity="0.36"
              />
            ))}
          </g>
        ))}

        <text
          x={WIDTH / 2}
          y={HEIGHT - 2}
          textAnchor="middle"
          className="fill-ink-600 text-[0.72rem] font-semibold"
        >
          {referenceName} watts
        </text>
        <text
          x="16"
          y={HEIGHT / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${HEIGHT / 2})`}
          className="fill-ink-600 text-[0.72rem] font-semibold"
        >
          comparison watts
        </text>
      </svg>
    </div>
  );
}

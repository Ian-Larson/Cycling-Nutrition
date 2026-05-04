import type { RadarPoint } from '@/hooks/use-performance-records';

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 32;
const MAX_WKG = 8;
const RING_COUNT = 4;

const AXIS_LABELS: Record<number, string> = {
  5: '5s',
  30: '30s',
  60: '1m',
  300: '5m',
  1200: '20m',
  3600: '1h',
};

interface PowerProfileHexagonProps {
  current: RadarPoint[];
  comparison: RadarPoint[];
  currentLabel: string;
  comparisonLabel: string;
}

function axisAngle(index: number, total: number): number {
  return (-Math.PI / 2) + (index * 2 * Math.PI) / total;
}

function pointAt(angle: number, radius: number): [number, number] {
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
}

function polygonFor(points: readonly RadarPoint[]): string {
  return points
    .map((p, i) => {
      const angle = axisAngle(i, points.length);
      const wkg = p.wkg ?? 0;
      const r = Math.min(MAX_WKG, Math.max(0, wkg)) / MAX_WKG * RADIUS;
      const [x, y] = pointAt(angle, r);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function PowerProfileHexagon({
  current,
  comparison,
  currentLabel,
  comparisonLabel,
}: PowerProfileHexagonProps) {
  const allEmpty =
    current.every((p) => p.wkg === null) &&
    comparison.every((p) => p.wkg === null);

  if (allEmpty) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-md border border-dashed border-ink-300 bg-shell-50 text-sm text-ink-600">
        Not enough data in either period yet.
      </div>
    );
  }

  const axisCount = current.length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Power profile hexagon: w/kg by duration, current vs comparison"
        className="w-full h-auto max-w-md mx-auto"
      >
        {Array.from({ length: RING_COUNT }, (_, i) => i + 1).map((ring) => {
          const ringPoints = current
            .map((_, j) => {
              const angle = axisAngle(j, axisCount);
              const r = (ring / RING_COUNT) * RADIUS;
              const [x, y] = pointAt(angle, r);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={ring}
              points={ringPoints}
              fill="none"
              stroke="var(--color-ink-200)"
              strokeWidth={1}
            />
          );
        })}

        {current.map((p, i) => {
          const angle = axisAngle(i, axisCount);
          const [x, y] = pointAt(angle, RADIUS);
          const [lx, ly] = pointAt(angle, RADIUS + 18);
          return (
            <g key={p.durationSeconds}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="var(--color-ink-200)"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--color-ink-600)"
              >
                {AXIS_LABELS[p.durationSeconds] ?? `${p.durationSeconds}s`}
              </text>
            </g>
          );
        })}

        <polygon
          data-period="comparison"
          points={polygonFor(comparison)}
          fill="var(--color-ink-300)"
          fillOpacity={0.25}
          stroke="var(--color-ink-500)"
          strokeWidth={1.5}
        />

        <polygon
          data-period="current"
          points={polygonFor(current)}
          fill="var(--color-brand-500)"
          fillOpacity={0.3}
          stroke="var(--color-brand-600)"
          strokeWidth={2}
        />
      </svg>
      <ul className="flex justify-center gap-4 pt-2 text-xs text-ink-700">
        <li className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-brand-500)' }}
          />
          {currentLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-ink-400)' }}
          />
          {comparisonLabel}
        </li>
      </ul>
    </div>
  );
}

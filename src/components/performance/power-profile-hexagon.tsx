import { useState } from 'react';
import { Alert, Card, CardContent, CardHeader } from '@/components/ui';
import type { RadarPoint } from '@/hooks/use-performance-records';

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 36;
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
  isLoading?: boolean;
  error?: string | null;
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
      const r = (Math.min(MAX_WKG, Math.max(0, wkg)) / MAX_WKG) * RADIUS;
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
  isLoading = false,
  error = null,
}: PowerProfileHexagonProps) {
  const [activeAxis, setActiveAxis] = useState<number | null>(null);

  const currentEmpty = current.every((p) => p.wkg === null);
  const comparisonEmpty = comparison.every((p) => p.wkg === null);
  const allEmpty = currentEmpty && comparisonEmpty;

  return (
    <Card>
      <CardHeader className="flex items-baseline justify-between gap-3">
        <h2 className="section-kicker uppercase tracking-wider text-ink-500">
          Power profile
        </h2>
        <div className="text-xs text-ink-500">w/kg by duration</div>
      </CardHeader>
      <CardContent className="md:px-5 md:py-5">
        {error ? (
          <Alert variant="error" title="Power profile unavailable">
            {error}
          </Alert>
        ) : isLoading ? (
          <div className="py-8 text-center" aria-label="Loading power profile">
            <div
              className="mx-auto h-56 w-56 animate-pulse rounded-full border border-[color:var(--border-soft)] bg-shell-200/70"
              aria-hidden
            />
            <p className="mt-4 text-sm text-ink-600">Loading power profile</p>
          </div>
        ) : allEmpty ? (
          <p className="py-10 text-center text-sm text-ink-600">
            Not enough data in either period yet.
          </p>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label="Power profile hexagon: w/kg by duration, current vs comparison"
              className="mx-auto block h-auto w-full max-w-md"
            >
              {Array.from({ length: RING_COUNT }, (_, i) => i + 1).map((ring) => {
                const ringPoints = current
                  .map((_, j) => {
                    const angle = axisAngle(j, current.length);
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
                    stroke="var(--color-ink-100)"
                    strokeWidth={1}
                  />
                );
              })}

              {current.map((p, i) => {
                const angle = axisAngle(i, current.length);
                const [x, y] = pointAt(angle, RADIUS);
                const [lx, ly] = pointAt(angle, RADIUS + 20);
                const isActive = activeAxis === p.durationSeconds;
                const label = AXIS_LABELS[p.durationSeconds] ?? `${p.durationSeconds}s`;
                const toggle = () =>
                  setActiveAxis((cur) =>
                    cur === p.durationSeconds ? null : p.durationSeconds
                  );
                return (
                  <g key={p.durationSeconds}>
                    <line
                      x1={CENTER}
                      y1={CENTER}
                      x2={x}
                      y2={y}
                      stroke="var(--color-ink-100)"
                      strokeWidth={1}
                    />
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={`Show ${label} value`}
                      aria-pressed={isActive}
                      onMouseEnter={() => setActiveAxis(p.durationSeconds)}
                      onMouseLeave={() => setActiveAxis(null)}
                      onFocus={() => setActiveAxis(p.durationSeconds)}
                      onBlur={() => setActiveAxis(null)}
                      onClick={toggle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle();
                        }
                      }}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      <circle
                        cx={lx}
                        cy={ly}
                        r={12}
                        fill={
                          isActive
                            ? 'var(--color-brand-100)'
                            : 'transparent'
                        }
                        stroke={
                          isActive
                            ? 'var(--color-brand-300)'
                            : 'transparent'
                        }
                        strokeWidth={1.25}
                      />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="11"
                        fontWeight={600}
                        fill={
                          isActive
                            ? 'var(--color-brand-800)'
                            : 'var(--color-ink-600)'
                        }
                      >
                        {label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {!comparisonEmpty && (
                <polygon
                  data-period="comparison"
                  points={polygonFor(comparison)}
                  fill="var(--color-ink-300)"
                  fillOpacity={0.22}
                  stroke="var(--color-ink-400)"
                  strokeWidth={1.5}
                />
              )}

              <polygon
                data-period="current"
                points={polygonFor(current)}
                fill="var(--color-brand-500)"
                fillOpacity={0.28}
                stroke="var(--color-brand-600)"
                strokeWidth={2}
              />

              {activeAxis !== null && (
                <ActiveAxisCallouts
                  axis={activeAxis}
                  current={current}
                  comparison={comparison}
                />
              )}
            </svg>

            <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-ink-700">
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-brand-500)' }}
                />
                <span className="font-medium">{currentLabel}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-ink-400)' }}
                />
                <span>
                  {comparisonLabel}
                  {comparisonEmpty ? (
                    <span className="ml-1 text-ink-500">
                      (no rides)
                    </span>
                  ) : null}
                </span>
              </li>
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveAxisCallouts({
  axis,
  current,
  comparison,
}: {
  axis: number;
  current: readonly RadarPoint[];
  comparison: readonly RadarPoint[];
}) {
  const idx = current.findIndex((p) => p.durationSeconds === axis);
  if (idx < 0) return null;
  const cur = current[idx]?.wkg;
  const cmp = comparison[idx]?.wkg;
  return (
    <g pointerEvents="none">
      <rect
        x={CENTER - 64}
        y={CENTER - 24}
        width={128}
        height={48}
        rx={8}
        fill="var(--surface-panel)"
        stroke="var(--color-ink-100)"
      />
      <text
        x={CENTER}
        y={CENTER - 6}
        textAnchor="middle"
        fontSize="11"
        fill="var(--color-ink-500)"
      >
        {AXIS_LABELS[axis] ?? `${axis}s`}
      </text>
      <text
        x={CENTER}
        y={CENTER + 12}
        textAnchor="middle"
        fontSize="13"
        fontWeight={700}
        fill="var(--color-brand-700)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {cur !== null && cur !== undefined ? cur.toFixed(2) : '—'}
        {cmp !== null && cmp !== undefined ? (
          <>
            {' '}
            <tspan fill="var(--color-ink-500)" fontWeight={500}>
              · {cmp.toFixed(2)}
            </tspan>
          </>
        ) : null}
      </text>
    </g>
  );
}

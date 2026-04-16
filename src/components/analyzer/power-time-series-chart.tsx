import { useMemo, useState, type PointerEvent } from 'react';
import {
  formatDuration,
  getDomainForSeries,
  normalizeZoomRange,
} from '@/lib/power-meter-analyzer/analysis';
import type { ChartSeries, SeriesPoint } from '@/lib/power-meter-analyzer/types';

const WIDTH = 1000;
const HEIGHT = 360;
const PLOT = {
  left: 58,
  right: 22,
  top: 22,
  bottom: 42,
};

interface HoverValue {
  id: string;
  name: string;
  color: string;
  value?: number;
  distanceSeconds?: number;
}

interface PowerTimeSeriesChartProps {
  series: ChartSeries[];
  zoomRange?: [number, number];
  onZoomChange: (range: [number, number] | undefined) => void;
}

function formatWatts(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '--';
  return `${Math.round(value)} W`;
}

function nearestPoint(points: SeriesPoint[], elapsedSeconds: number): SeriesPoint | undefined {
  if (points.length === 0) return undefined;

  let low = 0;
  let high = points.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].elapsedSeconds < elapsedSeconds) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const before = points[Math.max(0, low - 1)];
  const after = points[low];

  if (!before) return after;
  if (!after) return before;

  return Math.abs(before.elapsedSeconds - elapsedSeconds) <
    Math.abs(after.elapsedSeconds - elapsedSeconds)
    ? before
    : after;
}

function buildPath(
  points: SeriesPoint[],
  xScale: (value: number) => number,
  yScale: (value: number) => number
): string {
  let path = '';
  let previous: SeriesPoint | undefined;

  for (const point of points) {
    const x = xScale(point.elapsedSeconds);
    const y = yScale(point.value);
    const command =
      previous && point.elapsedSeconds - previous.elapsedSeconds <= 8 ? 'L' : 'M';
    path += `${command}${x.toFixed(2)},${y.toFixed(2)}`;
    previous = point;
  }

  return path;
}

export function PowerTimeSeriesChart({
  series,
  zoomRange,
  onZoomChange,
}: PowerTimeSeriesChartProps) {
  const [hoverElapsed, setHoverElapsed] = useState<number | undefined>();
  const [selectionStart, setSelectionStart] = useState<number | undefined>();
  const [selectionEnd, setSelectionEnd] = useState<number | undefined>();

  const domain = useMemo(() => getDomainForSeries(series), [series]);
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const elapsedSpan = domain.maxElapsed - domain.minElapsed;
  const valueSpan = domain.maxValue - domain.minValue;
  const xScale = (value: number) =>
    PLOT.left + ((value - domain.minElapsed) / elapsedSpan) * plotWidth;
  const yScale = (value: number) =>
    PLOT.top + (1 - (value - domain.minValue) / valueSpan) * plotHeight;
  const xToElapsed = (viewBoxX: number) =>
    domain.minElapsed + ((viewBoxX - PLOT.left) / plotWidth) * elapsedSpan;
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = domain.minValue + (valueSpan / 4) * index;
    return Math.round(value / 25) * 25;
  });
  const xTicks = Array.from({ length: 6 }, (_, index) => {
    return domain.minElapsed + (elapsedSpan / 5) * index;
  });
  const paths = series.map((item) => ({
    id: item.id,
    color: item.color,
    name: item.name,
    path: buildPath(item.points, xScale, yScale),
  }));
  const hoverValues: HoverValue[] =
    hoverElapsed === undefined
      ? []
      : series.map((item) => {
          const point = nearestPoint(item.points, hoverElapsed);
          const distanceSeconds =
            point === undefined
              ? undefined
              : Math.abs(point.elapsedSeconds - hoverElapsed);

          return {
            id: item.id,
            name: item.name,
            color: item.color,
            value:
              point && distanceSeconds !== undefined && distanceSeconds <= 2.5
                ? point.value
                : undefined,
            distanceSeconds,
          };
        });
  const selection =
    selectionStart !== undefined && selectionEnd !== undefined
      ? {
          x: xScale(Math.min(selectionStart, selectionEnd)),
          width: Math.abs(xScale(selectionEnd) - xScale(selectionStart)),
        }
      : undefined;

  const getElapsedFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewBoxX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    return Math.min(
      domain.maxElapsed,
      Math.max(domain.minElapsed, xToElapsed(viewBoxX))
    );
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const elapsed = getElapsedFromPointer(event);
    setHoverElapsed(elapsed);
    if (selectionStart !== undefined) {
      setSelectionEnd(elapsed);
    }
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const elapsed = getElapsedFromPointer(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectionStart(elapsed);
    setSelectionEnd(elapsed);
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (selectionStart !== undefined && selectionEnd !== undefined) {
      const nextRange = normalizeZoomRange(
        selectionStart,
        selectionEnd,
        domain.maxElapsed
      );
      if (nextRange) onZoomChange(nextRange);
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setSelectionStart(undefined);
    setSelectionEnd(undefined);
  };

  if (series.length === 0) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center border-y border-[color:var(--border-soft)] bg-white text-sm text-ink-600">
        Add at least one file with power samples.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border-soft)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Power trace</p>
          <p className="text-xs leading-5 text-ink-600">
            Drag to zoom. Double click the chart to reset.
          </p>
        </div>
        {zoomRange && (
          <button
            type="button"
            onClick={() => onZoomChange(undefined)}
            className="rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-shell-50"
          >
            Reset zoom
          </button>
        )}
      </div>

      <svg
        role="img"
        aria-label="Power comparison over time"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-[20rem] w-full touch-none bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          setHoverElapsed(undefined);
          setSelectionStart(undefined);
          setSelectionEnd(undefined);
        }}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => onZoomChange(undefined)}
      >
        <rect
          x={PLOT.left}
          y={PLOT.top}
          width={plotWidth}
          height={plotHeight}
          fill="#ffffff"
        />

        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={PLOT.left}
              x2={WIDTH - PLOT.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#e7edf2"
              strokeWidth="1"
            />
            <text
              x={PLOT.left - 12}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="fill-ink-500 text-[0.72rem]"
            >
              {tick}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={`x-${tick.toFixed(0)}`}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={PLOT.top}
              y2={HEIGHT - PLOT.bottom}
              stroke="#f1f1f1"
              strokeWidth="1"
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

        {paths.map((item) => (
          <path
            key={item.id}
            d={item.path}
            fill="none"
            stroke={item.color}
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {hoverElapsed !== undefined && (
          <line
            x1={xScale(hoverElapsed)}
            x2={xScale(hoverElapsed)}
            y1={PLOT.top}
            y2={HEIGHT - PLOT.bottom}
            stroke="#313b45"
            strokeDasharray="5 5"
            strokeWidth="1.2"
          />
        )}

        {selection && selection.width > 0 && (
          <rect
            x={selection.x}
            y={PLOT.top}
            width={selection.width}
            height={plotHeight}
            fill="rgba(248,98,46,0.14)"
            stroke="#f8622e"
          />
        )}
      </svg>

      {hoverElapsed !== undefined && hoverValues.length > 0 && (
        <div className="pointer-events-none absolute right-3 top-[4.2rem] w-56 rounded-lg border border-[color:var(--border-soft)] bg-white/95 p-3 shadow-[var(--shadow-soft)] backdrop-blur">
          <p className="mb-2 text-xs font-semibold text-ink-600">
            {formatDuration(hoverElapsed)}
          </p>
          <div className="space-y-1.5">
            {hoverValues.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-ink-700">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-semibold text-ink-900">
                  {formatWatts(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

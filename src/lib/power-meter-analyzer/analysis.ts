import type {
  AnalyzerFileState,
  AnalyzerPoint,
  ChartSeries,
  ComparisonPoint,
  FileSummary,
  MeanMaxPoint,
  MeterMode,
  PowerViewMode,
  ReferenceComparison,
  SeriesPoint,
} from './types';

const MEAN_MAX_DURATIONS = [
  1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600,
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTimestampToSecond(timestamp: number): number {
  return Math.round(timestamp / 1000);
}

function getLeftPower(point: AnalyzerPoint, meterMode: MeterMode): number | undefined {
  if (typeof point.power !== 'number') return undefined;

  if (typeof point.leftRightBalance === 'number') {
    return point.power * (point.leftRightBalance / 100);
  }

  if (meterMode === 'leftOnlyDoubled') {
    return point.power / 2;
  }

  if (meterMode === 'rightOnlyDoubled') {
    return undefined;
  }

  return undefined;
}

function getRightPower(point: AnalyzerPoint, meterMode: MeterMode): number | undefined {
  if (typeof point.power !== 'number') return undefined;

  if (typeof point.leftRightBalance === 'number') {
    return point.power * ((100 - point.leftRightBalance) / 100);
  }

  if (meterMode === 'rightOnlyDoubled') {
    return point.power / 2;
  }

  if (meterMode === 'leftOnlyDoubled') {
    return undefined;
  }

  return undefined;
}

export function getPowerForView(
  point: AnalyzerPoint,
  meterMode: MeterMode,
  viewMode: PowerViewMode
): number | undefined {
  if (viewMode === 'total') return point.power;
  if (viewMode === 'left') return getLeftPower(point, meterMode);
  return getRightPower(point, meterMode);
}

function smoothSeriesPoints(points: SeriesPoint[], smoothingSeconds: number): SeriesPoint[] {
  if (smoothingSeconds <= 1 || points.length <= 2) return points;

  const halfWindowMs = (smoothingSeconds * 1000) / 2;
  let left = 0;
  let right = 0;
  let sum = 0;

  return points.map((point) => {
    const minTimestamp = point.timestamp - halfWindowMs;
    const maxTimestamp = point.timestamp + halfWindowMs;

    while (right < points.length && points[right].timestamp <= maxTimestamp) {
      sum += points[right].value;
      right += 1;
    }

    while (left < points.length && points[left].timestamp < minTimestamp) {
      sum -= points[left].value;
      left += 1;
    }

    const count = Math.max(1, right - left);

    return {
      ...point,
      value: sum / count,
    };
  });
}

export function getVisibleTimeBounds(files: AnalyzerFileState[]): {
  startTimestamp?: number;
  endTimestamp?: number;
} {
  const timestamps = files
    .filter((file) => file.visible)
    .flatMap((file) => {
      const offsetMs = file.offsetSeconds * 1000;
      const startedAt = file.parsed.startedAt;
      const endedAt = file.parsed.endedAt;

      if (startedAt === undefined || endedAt === undefined) return [];
      return [startedAt + offsetMs, endedAt + offsetMs];
    });

  if (timestamps.length === 0) {
    return {};
  }

  return {
    startTimestamp: Math.min(...timestamps),
    endTimestamp: Math.max(...timestamps),
  };
}

export function buildChartSeries(
  files: AnalyzerFileState[],
  viewMode: PowerViewMode,
  smoothingSeconds: number,
  zoomRange?: [number, number]
): ChartSeries[] {
  const { startTimestamp } = getVisibleTimeBounds(files);
  if (startTimestamp === undefined) return [];

  const minElapsed = zoomRange?.[0] ?? Number.NEGATIVE_INFINITY;
  const maxElapsed = zoomRange?.[1] ?? Number.POSITIVE_INFINITY;

  return files
    .filter((file) => file.visible)
    .map((file) => {
      const offsetMs = file.offsetSeconds * 1000;
      const points = file.parsed.points
        .flatMap((point): SeriesPoint[] => {
          const value = getPowerForView(point, file.meterMode, viewMode);
          if (typeof value !== 'number' || !Number.isFinite(value)) return [];

          const timestamp = point.timestamp + offsetMs;
          const elapsedSeconds = (timestamp - startTimestamp) / 1000;
          if (elapsedSeconds < minElapsed || elapsedSeconds > maxElapsed) {
            return [];
          }

          return [
            {
              timestamp,
              elapsedSeconds,
              value,
              rawPower: point.power,
              leftRightBalance: point.leftRightBalance,
            },
          ];
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      return {
        id: file.id,
        name: file.displayName,
        color: file.color,
        points: smoothSeriesPoints(points, smoothingSeconds),
      };
    })
    .filter((series) => series.points.length > 0);
}

function summarizeSeries(series: ChartSeries): Omit<FileSummary, 'id' | 'name' | 'color'> {
  if (series.points.length === 0) {
    return {
      durationSeconds: 0,
      samples: 0,
    };
  }

  const values = series.points.map((point) => point.value);
  const sum = values.reduce((total, value) => total + value, 0);
  const zeros = values.filter((value) => value === 0).length;
  const first = series.points[0];
  const last = series.points[series.points.length - 1];

  return {
    durationSeconds: Math.max(0, last.elapsedSeconds - first.elapsedSeconds),
    samples: series.points.length,
    averagePower: sum / values.length,
    maxPower: Math.max(...values),
    zeroPercent: (zeros / values.length) * 100,
  };
}

function getSecondValueMap(series: ChartSeries): Map<number, ComparisonPoint> {
  const map = new Map<number, ComparisonPoint>();

  for (const point of series.points) {
    map.set(roundTimestampToSecond(point.timestamp), {
      elapsedSeconds: point.elapsedSeconds,
      referenceValue: point.value,
      comparisonValue: point.value,
    });
  }

  return map;
}

function comparePointPairs(points: ComparisonPoint[]): Omit<
  ReferenceComparison,
  'fileId' | 'fileName' | 'color' | 'points'
> {
  if (points.length === 0) {
    return {};
  }

  let deltaSum = 0;
  let absoluteDeltaSum = 0;
  let squaredDeltaSum = 0;
  let referenceSum = 0;
  let comparisonSum = 0;
  let referenceSquareSum = 0;
  let comparisonSquareSum = 0;
  let crossSum = 0;
  let withinThreePercent = 0;

  for (const point of points) {
    const delta = point.comparisonValue - point.referenceValue;
    deltaSum += delta;
    absoluteDeltaSum += Math.abs(delta);
    squaredDeltaSum += delta * delta;
    referenceSum += point.referenceValue;
    comparisonSum += point.comparisonValue;
    referenceSquareSum += point.referenceValue * point.referenceValue;
    comparisonSquareSum += point.comparisonValue * point.comparisonValue;
    crossSum += point.referenceValue * point.comparisonValue;

    const tolerance = Math.max(3, Math.abs(point.referenceValue) * 0.03);
    if (Math.abs(delta) <= tolerance) {
      withinThreePercent += 1;
    }
  }

  const count = points.length;
  const referenceAverage = referenceSum / count;
  const comparisonAverage = comparisonSum / count;
  const numerator = count * crossSum - referenceSum * comparisonSum;
  const referenceVariance = count * referenceSquareSum - referenceSum * referenceSum;
  const comparisonVariance =
    count * comparisonSquareSum - comparisonSum * comparisonSum;
  const denominator = Math.sqrt(referenceVariance * comparisonVariance);

  return {
    averageDeltaWatts: deltaSum / count,
    biasPercent:
      referenceAverage === 0
        ? undefined
        : ((comparisonAverage - referenceAverage) / referenceAverage) * 100,
    meanAbsoluteError: absoluteDeltaSum / count,
    rootMeanSquareError: Math.sqrt(squaredDeltaSum / count),
    correlation: denominator === 0 ? undefined : numerator / denominator,
    withinThreePercent: (withinThreePercent / count) * 100,
  };
}

export function buildReferenceComparisons(
  series: ChartSeries[],
  referenceId: string
): ReferenceComparison[] {
  const reference = series.find((item) => item.id === referenceId);
  if (!reference) return [];

  const referenceBySecond = getSecondValueMap(reference);

  return series
    .filter((item) => item.id !== referenceId)
    .map((item) => {
      const points: ComparisonPoint[] = [];

      for (const point of item.points) {
        const referencePoint = referenceBySecond.get(roundTimestampToSecond(point.timestamp));
        if (!referencePoint) continue;
        points.push({
          elapsedSeconds: point.elapsedSeconds,
          referenceValue: referencePoint.referenceValue,
          comparisonValue: point.value,
        });
      }

      return {
        fileId: item.id,
        fileName: item.name,
        color: item.color,
        points,
        ...comparePointPairs(points),
      };
    });
}

export function buildFileSummaries(
  series: ChartSeries[],
  referenceId: string
): FileSummary[] {
  const comparisons = buildReferenceComparisons(series, referenceId);
  const comparisonsById = new Map(
    comparisons.map((comparison) => [comparison.fileId, comparison])
  );

  return series.map((item) => {
    const comparison = comparisonsById.get(item.id);
    return {
      id: item.id,
      name: item.name,
      color: item.color,
      ...summarizeSeries(item),
      comparedSamples: comparison?.points.length,
      averageDeltaWatts: comparison?.averageDeltaWatts,
      biasPercent: comparison?.biasPercent,
      meanAbsoluteError: comparison?.meanAbsoluteError,
      rootMeanSquareError: comparison?.rootMeanSquareError,
      correlation: comparison?.correlation,
      withinThreePercent: comparison?.withinThreePercent,
    };
  });
}

export function buildMeanMaxPower(points: SeriesPoint[]): MeanMaxPoint[] {
  if (points.length === 0) return [];

  const sorted = [...points].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
  const maxDuration = Math.max(
    1,
    sorted[sorted.length - 1].elapsedSeconds - sorted[0].elapsedSeconds
  );
  const durations = MEAN_MAX_DURATIONS.filter((duration) => duration <= maxDuration);

  return durations
    .map((durationSeconds) => {
      let left = 0;
      let sum = 0;
      let best: number | undefined;
      const requiredSpan = Math.max(0, durationSeconds - 1);

      for (let right = 0; right < sorted.length; right += 1) {
        sum += sorted[right].value;

        while (
          left < right &&
          sorted[right].elapsedSeconds - sorted[left].elapsedSeconds > durationSeconds
        ) {
          sum -= sorted[left].value;
          left += 1;
        }

        const count = right - left + 1;
        const span = sorted[right].elapsedSeconds - sorted[left].elapsedSeconds;
        if (durationSeconds === 1 || span >= requiredSpan * 0.85) {
          best = Math.max(best ?? 0, sum / count);
        }
      }

      if (best === undefined) return undefined;
      return {
        durationSeconds,
        value: best,
      };
    })
    .filter((point): point is MeanMaxPoint => point !== undefined);
}

export function getDomainForSeries(series: ChartSeries[]): {
  minElapsed: number;
  maxElapsed: number;
  minValue: number;
  maxValue: number;
} {
  const allPoints = series.flatMap((item) => item.points);
  if (allPoints.length === 0) {
    return {
      minElapsed: 0,
      maxElapsed: 1,
      minValue: 0,
      maxValue: 1,
    };
  }

  const elapsedValues = allPoints.map((point) => point.elapsedSeconds);
  const powerValues = allPoints.map((point) => point.value);
  const minElapsed = Math.min(...elapsedValues);
  const maxElapsed = Math.max(...elapsedValues);
  const minValue = Math.min(0, Math.min(...powerValues));
  const maxValue = Math.max(1, Math.max(...powerValues));
  const padding = Math.max(10, (maxValue - minValue) * 0.08);

  return {
    minElapsed,
    maxElapsed: maxElapsed === minElapsed ? minElapsed + 1 : maxElapsed,
    minValue,
    maxValue: maxValue + padding,
  };
}

export function normalizeZoomRange(
  start: number,
  end: number,
  maxElapsed: number
): [number, number] | undefined {
  const min = clamp(Math.min(start, end), 0, maxElapsed);
  const max = clamp(Math.max(start, end), 0, maxElapsed);

  if (max - min < 5) {
    return undefined;
  }

  return [min, max];
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '--';

  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

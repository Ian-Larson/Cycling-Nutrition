import { describe, expect, it } from 'vitest';
import {
  buildChartSeries,
  buildFileSummaries,
  buildReferenceComparisons,
} from './analysis';
import type { AnalyzerFileState } from './types';

const startTimestamp = Date.UTC(2026, 0, 1, 12, 0, 0);

function makeFile(
  id: string,
  powers: number[],
  options: { offsetSeconds?: number; startOffsetSeconds?: number } = {}
): AnalyzerFileState {
  const startOffsetSeconds = options.startOffsetSeconds ?? 0;
  const points = powers.map((power, index) => ({
    timestamp: startTimestamp + (startOffsetSeconds + index) * 1000,
    power,
  }));

  return {
    id,
    parsed: {
      fileName: `${id}.csv`,
      sourceType: 'csv',
      points,
      warnings: [],
      startedAt: points[0]?.timestamp,
      endedAt: points[points.length - 1]?.timestamp,
      durationSeconds: Math.max(0, points.length - 1),
      powerPointCount: points.length,
    },
    displayName: id,
    color: '#f8622e',
    visible: true,
    offsetSeconds: options.offsetSeconds ?? 0,
    meterMode: 'total',
  };
}

describe('power meter analyzer calculations', () => {
  it('matches files on timestamp after offset correction', () => {
    const files = [
      makeFile('reference', [200, 220, 240]),
      makeFile('late-head-unit', [201, 221, 241], {
        startOffsetSeconds: 2,
        offsetSeconds: -2,
      }),
    ];

    const series = buildChartSeries(files, 'total', 1);
    const comparisons = buildReferenceComparisons(series, 'reference');

    expect(comparisons[0].points).toHaveLength(3);
    expect(comparisons[0].averageDeltaWatts).toBeCloseTo(1);
    expect(comparisons[0].meanAbsoluteError).toBeCloseTo(1);
  });

  it('summarizes reference bias and within-tolerance samples', () => {
    const files = [
      makeFile('reference', [100, 200, 300, 400]),
      makeFile('comparison', [103, 207, 291, 412]),
    ];

    const series = buildChartSeries(files, 'total', 1);
    const summaries = buildFileSummaries(series, 'reference');
    const comparison = summaries.find((summary) => summary.id === 'comparison');

    expect(comparison?.comparedSamples).toBe(4);
    expect(comparison?.biasPercent).toBeCloseTo(1.3);
    expect(comparison?.withinThreePercent).toBe(75);
  });
});

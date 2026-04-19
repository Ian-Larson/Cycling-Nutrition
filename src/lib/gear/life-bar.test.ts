import { describe, expect, it } from 'vitest';
import { computeLifeBar } from './life-bar';

describe('computeLifeBar', () => {
  it('returns null when neither axis has a remaining value', () => {
    expect(
      computeLifeBar({
        remainingMi: null,
        remainingDays: null,
        intervalMi: null,
        intervalDays: null,
      })
    ).toBeNull();
  });

  it('picks mi axis when both present and mi is nearer zero', () => {
    const result = computeLifeBar({
      remainingMi: 20,
      remainingDays: 60,
      intervalMi: 200,
      intervalDays: 30,
    });
    expect(result).toEqual({ axis: 'mi', pct: 1 - 20 / 200 });
  });

  it('picks days axis when days is nearer zero', () => {
    const result = computeLifeBar({
      remainingMi: 120,
      remainingDays: 3,
      intervalMi: 200,
      intervalDays: 30,
    });
    expect(result).toEqual({ axis: 'days', pct: 1 - 3 / 30 });
  });

  it('caps pct at 1 when overdue on the nearest axis', () => {
    const result = computeLifeBar({
      remainingMi: -50,
      remainingDays: 30,
      intervalMi: 200,
      intervalDays: 30,
    });
    expect(result).toEqual({ axis: 'mi', pct: 1 });
  });

  it('derives mi interval from next-due minus last-service if intervalMi missing', () => {
    const result = computeLifeBar({
      remainingMi: 50,
      remainingDays: null,
      intervalMi: null,
      intervalDays: null,
      nextDueMileageMi: 1100,
      lastServiceMileageMi: 900,
    });
    expect(result).toEqual({ axis: 'mi', pct: 1 - 50 / 200 });
  });

  it('returns null when chosen-axis interval cannot be derived', () => {
    expect(
      computeLifeBar({
        remainingMi: 50,
        remainingDays: null,
        intervalMi: null,
        intervalDays: null,
      })
    ).toBeNull();
  });

  it('returns null when chosen-axis interval is zero or negative', () => {
    expect(
      computeLifeBar({
        remainingMi: 50,
        remainingDays: null,
        intervalMi: 0,
        intervalDays: null,
      })
    ).toBeNull();
  });

  it('clamps pct to [0,1] when remaining exceeds interval', () => {
    const result = computeLifeBar({
      remainingMi: 300,
      remainingDays: null,
      intervalMi: 200,
      intervalDays: null,
    });
    expect(result).toEqual({ axis: 'mi', pct: 0 });
  });
});

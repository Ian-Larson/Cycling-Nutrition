import { describe, expect, it } from 'vitest';
import {
  computeMeanMaxCurve,
  packCurveInt16,
  unpackCurveInt16,
} from './mean-max-curve';

describe('computeMeanMaxCurve', () => {
  it('returns an empty array for an empty stream', () => {
    expect(computeMeanMaxCurve([])).toEqual([]);
  });

  it('returns a single value for a 1-second stream', () => {
    expect(computeMeanMaxCurve([200])).toEqual([200]);
  });

  it('treats every duration as the best window of that length', () => {
    // Stream: 100, 200, 300
    // 1s best = 300
    // 2s best = mean(200, 300) = 250
    // 3s best = mean(100, 200, 300) = 200
    expect(computeMeanMaxCurve([100, 200, 300])).toEqual([300, 250, 200]);
  });

  it('finds the best window even when the peak is in the middle', () => {
    // Stream: 100, 400, 100
    // 1s best = 400
    // 2s best = max(mean(100,400)=250, mean(400,100)=250) = 250
    // 3s best = mean(100,400,100) = 200
    expect(computeMeanMaxCurve([100, 400, 100])).toEqual([400, 250, 200]);
  });

  it('rounds to integer watts', () => {
    const curve = computeMeanMaxCurve([1, 2, 3]);
    expect(curve.every((v) => Number.isInteger(v))).toBe(true);
  });

  it('clamps negative or NaN samples to 0 before computing', () => {
    // Clamped stream: [100, 0, 200]
    // 1s best = max(100, 0, 200) = 200
    // 2s best = max(mean(100,0)=50, mean(0,200)=100) = 100
    // 3s best = mean(100,0,200) = 100
    expect(computeMeanMaxCurve([100, -50, 200])).toEqual([200, 100, 100]);
  });
});

describe('packCurveInt16 / unpackCurveInt16', () => {
  it('round-trips a curve through Int16 packing', () => {
    const curve = [100, 200, 300, 0, 1500];
    const packed = packCurveInt16(curve);
    expect(packed).toBeInstanceOf(Uint8Array);
    expect(packed.byteLength).toBe(curve.length * 2);
    expect(unpackCurveInt16(packed)).toEqual(curve);
  });

  it('clamps values outside Int16 range', () => {
    // Int16 max is 32767. Values above clamp.
    const packed = packCurveInt16([40000]);
    expect(unpackCurveInt16(packed)).toEqual([32767]);
  });
});

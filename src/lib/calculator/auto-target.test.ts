import { describe, expect, it } from 'vitest';
import {
  calculateAutoCarbTargetGramsPerHour,
  calculateAutoTarget,
  calculateHydrationMlPerHour,
  calculateSodiumMgPerHour,
  mapIfToIntensity,
  resolveRideMetrics,
} from './auto-target';

describe('resolveRideMetrics', () => {
  it('derives TSS from duration + IF', () => {
    const result = resolveRideMetrics({
      inputPair: 'duration_if',
      durationMinutes: 120,
      intensityFactor: 0.8,
    });

    expect(result.tss).toBeCloseTo(128, 1);
    expect(result.durationMinutes).toBe(120);
  });

  it('derives IF from duration + TSS', () => {
    const result = resolveRideMetrics({
      inputPair: 'duration_tss',
      durationMinutes: 120,
      tss: 128,
    });

    expect(result.intensityFactor).toBeCloseTo(0.8, 3);
  });

  it('derives duration from IF + TSS', () => {
    const result = resolveRideMetrics({
      inputPair: 'if_tss',
      intensityFactor: 0.8,
      tss: 128,
    });

    expect(result.durationMinutes).toBeCloseTo(120, 1);
  });
});

describe('mapIfToIntensity', () => {
  it('maps IF values to app intensity levels', () => {
    expect(mapIfToIntensity(0.59)).toBe('recovery');
    expect(mapIfToIntensity(0.6)).toBe('endurance');
    expect(mapIfToIntensity(0.75)).toBe('tempo');
    expect(mapIfToIntensity(0.85)).toBe('threshold');
    expect(mapIfToIntensity(0.95)).toBe('race');
  });
});

describe('calculateAutoCarbTargetGramsPerHour', () => {
  it('returns 0 g/h for short low-intensity rides', () => {
    const target = calculateAutoCarbTargetGramsPerHour({
      intensityFactor: 0.65,
      durationHours: 0.75,
      kilojoulesPerHour: 500,
      intensity: 'endurance',
      gutTrained: false,
    });

    expect(target).toBe(0);
  });

  it('applies 30 g/h floor for non-trivial rides', () => {
    const target = calculateAutoCarbTargetGramsPerHour({
      intensityFactor: 0.71,
      durationHours: 1.5,
      kilojoulesPerHour: 200,
      intensity: 'endurance',
      gutTrained: false,
    });

    expect(target).toBe(30);
  });

  it('applies 60 g/h floor for long hard rides', () => {
    const target = calculateAutoCarbTargetGramsPerHour({
      intensityFactor: 0.9,
      durationHours: 2,
      kilojoulesPerHour: 280,
      intensity: 'threshold',
      gutTrained: false,
    });

    expect(target).toBe(60);
  });

  it('caps at 90 g/h by default and 120 g/h when race + gut-trained', () => {
    const defaultCap = calculateAutoCarbTargetGramsPerHour({
      intensityFactor: 1,
      durationHours: 3,
      kilojoulesPerHour: 1800,
      intensity: 'race',
      gutTrained: false,
    });

    const raceCap = calculateAutoCarbTargetGramsPerHour({
      intensityFactor: 1,
      durationHours: 3,
      kilojoulesPerHour: 1800,
      intensity: 'race',
      gutTrained: true,
    });

    expect(defaultCap).toBe(90);
    expect(raceCap).toBe(120);
  });
});

describe('hydration and sodium rules', () => {
  it('uses sweat-rate hydration override when provided', () => {
    expect(
      calculateHydrationMlPerHour({ sweatRateLph: 0.9, heatFactor: 'hot' })
    ).toBe(900);
  });

  it('uses heat-based hydration fallback when sweat rate is absent', () => {
    expect(calculateHydrationMlPerHour({ heatFactor: 'cool' })).toBe(500);
    expect(calculateHydrationMlPerHour({ heatFactor: 'moderate' })).toBe(750);
    expect(calculateHydrationMlPerHour({ heatFactor: 'warm' })).toBe(1000);
    expect(calculateHydrationMlPerHour({ heatFactor: 'hot' })).toBe(1000);
  });

  it('computes sodium based on heat, duration, intensity, and heavy sweater', () => {
    expect(
      calculateSodiumMgPerHour({
        heatFactor: 'moderate',
        durationHours: 1,
        intensityFactor: 0.7,
        heavySweater: false,
      })
    ).toBe(500);

    expect(
      calculateSodiumMgPerHour({
        heatFactor: 'moderate',
        durationHours: 2,
        intensityFactor: 0.7,
        heavySweater: false,
      })
    ).toBe(1000);

    expect(
      calculateSodiumMgPerHour({
        heatFactor: 'moderate',
        durationHours: 2,
        intensityFactor: 0.7,
        heavySweater: true,
      })
    ).toBe(1500);
  });
});

describe('calculateAutoTarget integration', () => {
  it('matches example A behavior', () => {
    const result = calculateAutoTarget({
      inputPair: 'duration_if',
      durationMinutes: 120,
      intensityFactor: 0.8,
      ftpWatts: 250,
      heatFactor: 'moderate',
      heavySweater: false,
      gutTrained: false,
    });

    expect(result.durationMinutes).toBe(120);
    expect(result.autoMetrics.intensityFactor).toBeCloseTo(0.8, 3);
    expect(result.autoMetrics.autoCarbTargetGramsPerHour).toBe(80);
    expect(result.carbTargetGramsPerHour).toBe(80);
    expect(result.autoMetrics.hydrationMlPerHour).toBe(750);
    expect(result.autoMetrics.sodiumMgPerHour).toBe(1000);
  });

  it('matches example B behavior', () => {
    const result = calculateAutoTarget({
      inputPair: 'duration_tss',
      durationMinutes: 180,
      tss: 150,
      ftpWatts: 280,
      heatFactor: 'moderate',
      heavySweater: false,
      gutTrained: false,
    });

    expect(result.durationMinutes).toBe(180);
    expect(result.autoMetrics.intensityFactor).toBeCloseTo(0.707, 3);
    expect(result.autoMetrics.autoCarbTargetGramsPerHour).toBe(80);
    expect(result.autoMetrics.hydrationMlPerHour).toBe(750);
    expect(result.autoMetrics.sodiumMgPerHour).toBe(1000);
  });

  it('throws on invalid formula outputs and override ranges', () => {
    expect(() =>
      calculateAutoTarget({
        inputPair: 'if_tss',
        intensityFactor: 0.5,
        tss: 250,
        ftpWatts: 250,
        heatFactor: 'moderate',
        heavySweater: false,
        gutTrained: false,
      })
    ).toThrow(/supported range/i);

    expect(() =>
      calculateAutoTarget({
        inputPair: 'duration_if',
        durationMinutes: 120,
        intensityFactor: 0.8,
        ftpWatts: 250,
        heatFactor: 'moderate',
        heavySweater: false,
        gutTrained: false,
        carbTargetOverrideGramsPerHour: 125,
      })
    ).toThrow(/override/i);
  });
});

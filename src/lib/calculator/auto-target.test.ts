import { describe, expect, it } from 'vitest';
import {
  calculateAutoCarbTargetGramsPerHour,
  calculateAutoTarget,
  calculateAutoTargetFromTripleInput,
  calculateHydrationMlPerHour,
  calculateNeedsScore,
  calculateSodiumMgPerHour,
  mapIfToIntensity,
  resolveRideMetrics,
  resolveTripleInputMetrics,
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

describe('resolveTripleInputMetrics', () => {
  it('auto-corrects TSS from duration + IF when values differ', () => {
    const result = resolveTripleInputMetrics({
      durationMinutes: 120,
      intensityFactor: 0.8,
      tss: 120,
    });

    expect(result.correctedTss).toBe(128);
    expect(result.tssCorrectionApplied).toBe(true);
    expect(result.tssCorrectionDelta).toBe(8);
  });

  it('does not flag correction when TSS is already consistent', () => {
    const result = resolveTripleInputMetrics({
      durationMinutes: 120,
      intensityFactor: 0.8,
      tss: 128,
    });

    expect(result.correctedTss).toBe(128);
    expect(result.tssCorrectionApplied).toBe(false);
    expect(result.tssCorrectionDelta).toBe(0);
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

  it('applies floors and caps', () => {
    expect(
      calculateAutoCarbTargetGramsPerHour({
        intensityFactor: 0.71,
        durationHours: 1.5,
        kilojoulesPerHour: 200,
        intensity: 'endurance',
        gutTrained: false,
      })
    ).toBe(30);

    expect(
      calculateAutoCarbTargetGramsPerHour({
        intensityFactor: 0.9,
        durationHours: 2,
        kilojoulesPerHour: 280,
        intensity: 'threshold',
        gutTrained: false,
      })
    ).toBe(60);

    expect(
      calculateAutoCarbTargetGramsPerHour({
        intensityFactor: 1,
        durationHours: 3,
        kilojoulesPerHour: 1800,
        intensity: 'race',
        gutTrained: false,
      })
    ).toBe(90);

    expect(
      calculateAutoCarbTargetGramsPerHour({
        intensityFactor: 1,
        durationHours: 3,
        kilojoulesPerHour: 1800,
        intensity: 'race',
        gutTrained: true,
      })
    ).toBe(120);
  });
});

describe('hydration, sodium, and needs score', () => {
  it('applies hydration and sodium branches', () => {
    expect(
      calculateHydrationMlPerHour({ sweatRateLph: 0.9, heatFactor: 'hot' })
    ).toBe(900);
    expect(calculateHydrationMlPerHour({ heatFactor: 'cool' })).toBe(500);
    expect(calculateHydrationMlPerHour({ heatFactor: 'moderate' })).toBe(750);

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
        heavySweater: true,
      })
    ).toBe(1500);
  });

  it('maps needs score to expected levels', () => {
    const low = calculateNeedsScore({
      hydrationMlPerHour: 500,
      sodiumMgPerHour: 500,
      intensityFactor: 0.5,
      tssPerHour: 40,
    });
    const high = calculateNeedsScore({
      hydrationMlPerHour: 900,
      sodiumMgPerHour: 1000,
      intensityFactor: 0.85,
      tssPerHour: 80,
    });
    const extreme = calculateNeedsScore({
      hydrationMlPerHour: 1100,
      sodiumMgPerHour: 1500,
      intensityFactor: 1.0,
      tssPerHour: 110,
    });

    expect(low.needsLevel).toBe('low');
    expect(high.needsLevel).toBe('high');
    expect(extreme.needsLevel).toBe('extreme');
  });
});

describe('calculateAutoTarget integration', () => {
  it('supports triple-input mode and stores correction metadata', () => {
    const result = calculateAutoTargetFromTripleInput({
      durationMinutes: 120,
      intensityFactor: 0.8,
      tss: 120,
      ftpWatts: 250,
      heatFactor: 'moderate',
      heavySweater: false,
      gutTrained: false,
    });

    expect(result.durationMinutes).toBe(120);
    expect(result.autoMetrics.inputMode).toBe('triple');
    expect(result.autoMetrics.correctedTss).toBe(128);
    expect(result.autoMetrics.tss).toBe(128);
    expect(result.autoMetrics.tssCorrectionApplied).toBe(true);
    expect(result.autoMetrics.tssCorrectionDelta).toBe(8);
    expect(result.autoMetrics.needsScore).toBeDefined();
    expect(result.autoMetrics.needsLevel).toBeDefined();
  });

  it('maintains pair-mode compatibility', () => {
    const result = calculateAutoTarget({
      inputPair: 'duration_if',
      durationMinutes: 120,
      intensityFactor: 0.8,
      ftpWatts: 250,
      heatFactor: 'moderate',
      heavySweater: false,
      gutTrained: false,
    });

    expect(result.autoMetrics.inputMode).toBe('pair');
    expect(result.autoMetrics.tss).toBeCloseTo(128, 1);
  });

  it('throws on invalid ranges', () => {
    expect(() =>
      calculateAutoTargetFromTripleInput({
        durationMinutes: 120,
        intensityFactor: 0.8,
        tss: 120,
        ftpWatts: 250,
        heatFactor: 'moderate',
        heavySweater: false,
        gutTrained: false,
        carbTargetOverrideGramsPerHour: 125,
      })
    ).toThrow(/override/i);

    expect(() =>
      calculateAutoTargetFromTripleInput({
        durationMinutes: 500,
        intensityFactor: 0.8,
        tss: 120,
        ftpWatts: 250,
        heatFactor: 'moderate',
        heavySweater: false,
        gutTrained: false,
      })
    ).toThrow(/supported range/i);
  });
});

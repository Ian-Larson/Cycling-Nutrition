import { describe, it, expect } from 'vitest';
import { preRideTarget } from '../pre-ride-target';
import { buildContext } from '../../context';
import type { RiderProfile, SessionPlan } from '../../types';

const baseRider: RiderProfile = {
  sex: 'male', massKg: 70, trainingLoad: 'high',
  doesConcurrentStrength: false, heavySweater: false,
  currentGutCeilingGph: 90, caffeineSensitive: false,
  dietaryFlags: [], anthropometricsUnit: 'metric', ftpWatts: 250,
};

describe('preRideTarget', () => {
  it('story 4: 4h race → pre-ride CHO + caffeine + carb-load', () => {
    const session: SessionPlan = {
      id: 'race', startAtIso: '2026-04-18T08:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = preRideTarget(ctx);
    expect(result.prescription).toBeDefined();
    expect(result.prescription!.carbsGrams).toBeGreaterThan(100);
    expect(result.prescription!.caffeineMg).toBeGreaterThan(0);
    expect(result.carbLoad).toBeDefined();
    expect(result.carbLoad!.days).toBe(2);
  });

  it('story 5: adaptation ride → no pre-ride prescription', () => {
    const session: SessionPlan = {
      id: 'adapt', inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.62 },
      purposeOverride: 'adaptation',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = preRideTarget(ctx);
    expect(result.prescription).toBeUndefined();
  });

  it('no startAtIso → emits no-pre-ride-time warning', () => {
    const session: SessionPlan = {
      id: 'no-time', inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.92 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = preRideTarget(ctx);
    expect(result.warnings.some(w => w.code === 'no-pre-ride-time')).toBe(true);
  });

  it('caffeine-sensitive rider gets half dose', () => {
    const rider = { ...baseRider, caffeineSensitive: true };
    const session: SessionPlan = {
      id: 'sens', startAtIso: '2026-04-18T08:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
    };
    const ctx = buildContext({ rider, session });
    const result = preRideTarget(ctx);
    const fullDose = 3 * 70; // 210
    expect(result.prescription!.caffeineMg).toBeCloseTo(fullDose / 2, 0);
  });

  it('short endurance ride (45 min) → no pre-ride', () => {
    const session: SessionPlan = {
      id: 'short', inputMode: { kind: 'duration_if', durationMinutes: 45, intensityFactor: 0.75 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = preRideTarget(ctx);
    expect(result.prescription).toBeUndefined();
  });

  it('2h threshold workout → pre-ride with protein, no carb-load', () => {
    const session: SessionPlan = {
      id: 'thresh', startAtIso: '2026-04-18T18:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.92 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = preRideTarget(ctx);
    expect(result.prescription).toBeDefined();
    expect(result.prescription!.proteinGrams).toBeGreaterThan(0);
    expect(result.carbLoad).toBeUndefined();
  });
});

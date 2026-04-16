import { describe, it, expect } from 'vitest';
import { carbTarget } from '../carb-target';
import { buildContext } from '../../context';
import type { RiderProfile, SessionPlan } from '../../types';

const baseRider: RiderProfile = {
  sex: 'male',
  massKg: 70,
  trainingLoad: 'high',
  doesConcurrentStrength: false,
  heavySweater: false,
  currentGutCeilingGph: 90,
  caffeineSensitive: false,
  dietaryFlags: [],
  anthropometricsUnit: 'metric',
  ftpWatts: 250,
};

function makeContext(
  durationMinutes: number,
  intensityFactor: number,
  opts?: { purposeOverride?: 'recovery' | 'adaptation' | 'race'; gutCeiling?: number },
) {
  const rider = { ...baseRider, currentGutCeilingGph: opts?.gutCeiling ?? 90 };
  const session: SessionPlan = {
    id: 'test',
    inputMode: { kind: 'duration_if', durationMinutes, intensityFactor },
    purposeOverride: opts?.purposeOverride,
  };
  return buildContext({ rider, session });
}

describe('carbTarget', () => {
  it('story 1: 45 min recovery -> 0 g/h', () => {
    const ctx = makeContext(45, 0.50, { purposeOverride: 'recovery' });
    const result = carbTarget(ctx);
    expect(result.carbsGPerHour).toBe(0);
    expect(result.totalCarbsGrams).toBe(0);
  });

  it('story 2: 90 min threshold -> 30 g/h (75-120 bracket, single source)', () => {
    const ctx = makeContext(90, 0.92);
    const result = carbTarget(ctx);
    expect(result.carbsGPerHour).toBe(30);
    expect(result.usesMultiTransportableCarbs).toBe(false);
  });

  it('story 3: 150 min tempo -> 60 g/h (120-180 bracket)', () => {
    const ctx = makeContext(150, 0.85);
    const result = carbTarget(ctx);
    expect(result.carbsGPerHour).toBe(60);
    expect(result.totalCarbsGrams).toBeCloseTo(150, 0);
  });

  it('story 4: 4h race -> 90 g/h, multi-transport required', () => {
    const ctx = makeContext(240, 0.82, { purposeOverride: 'race' });
    const result = carbTarget(ctx);
    expect(result.carbsGPerHour).toBe(90);
    expect(result.usesMultiTransportableCarbs).toBe(true);
    expect(result.totalCarbsGrams).toBeCloseTo(360, 0);
  });

  it('story 5: 2h adaptation -> 0 g/h', () => {
    const ctx = makeContext(120, 0.62, { purposeOverride: 'adaptation' });
    const result = carbTarget(ctx);
    expect(result.carbsGPerHour).toBe(0);
  });

  it('story 6: century ride, 50 g/h gut ceiling caps target', () => {
    const ctx = makeContext(300, 0.75, { gutCeiling: 50 });
    const result = carbTarget(ctx);
    expect(result.carbsGPerHour).toBeLessThanOrEqual(50);
    expect(result.warnings.some(w => w.code === 'gut-cap-applied')).toBe(true);
  });

  it('low-intensity endurance ride reduces ceiling by 20%', () => {
    const ctx = makeContext(150, 0.70);
    const result = carbTarget(ctx);
    // 120-180 bracket = 60 g/h, low IF reduces by 20% -> 48, round to 50
    expect(result.carbsGPerHour).toBe(50);
  });
});

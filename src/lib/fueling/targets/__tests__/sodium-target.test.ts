import { describe, it, expect } from 'vitest';
import { sodiumTarget } from '../sodium-target';
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

describe('sodiumTarget', () => {
  it('default rider moderate heat -> ~400 mg/h range', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.75 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = sodiumTarget(ctx, 700);
    expect(result.sodiumMgPerHour).toBeGreaterThanOrEqual(300);
    expect(result.sodiumMgPerHour).toBeLessThanOrEqual(500);
  });

  it('story 10: heavy sweater 1200 mg/L -> high sodium, ceiling warning', () => {
    const rider = {
      ...baseRider,
      heavySweater: true,
      sweatRateLph: 1.5,
      sweatSodiumMgPerL: 1200,
    };
    const session: SessionPlan = {
      id: 'test',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.85 },
    };
    const ctx = buildContext({
      rider,
      session,
      environment: { dryBulbCelsius: 30, relativeHumidityPercent: 70 },
    });
    const result = sodiumTarget(ctx, 1200);
    expect(result.sodiumMgPerHour).toBeGreaterThanOrEqual(800);
  });

  it('bottle sodium concentration is within range', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.75 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = sodiumTarget(ctx, 700);
    expect(result.sodiumMgPerLiterTargetInBottles).toBeGreaterThanOrEqual(300);
    expect(result.sodiumMgPerLiterTargetInBottles).toBeLessThanOrEqual(1000);
  });
});

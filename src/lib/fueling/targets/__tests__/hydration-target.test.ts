import { describe, it, expect } from 'vitest';
import { hydrationTarget } from '../hydration-target';
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

describe('hydrationTarget', () => {
  it('story 3: moderate day, default sweat -> ~700 ml/h', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: { kind: 'duration_if', durationMinutes: 150, intensityFactor: 0.85 },
    };
    const ctx = buildContext({
      rider: baseRider,
      session,
      environment: { dryBulbCelsius: 22, relativeHumidityPercent: 50 },
    });
    const result = hydrationTarget(ctx);
    expect(result.hydrationMlPerHour).toBeGreaterThanOrEqual(600);
    expect(result.hydrationMlPerHour).toBeLessThanOrEqual(1000);
  });

  it('story 4: hot day -> higher hydration', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
    };
    const ctx = buildContext({
      rider: baseRider,
      session,
      environment: { dryBulbCelsius: 30, relativeHumidityPercent: 70 },
    });
    const result = hydrationTarget(ctx);
    expect(result.hydrationMlPerHour).toBeGreaterThanOrEqual(1000);
  });

  it('story 10: heavy sweater, 1.5 L/h', () => {
    const rider = { ...baseRider, heavySweater: true, sweatRateLph: 1.5 };
    const session: SessionPlan = {
      id: 'test',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.85 },
    };
    const ctx = buildContext({
      rider,
      session,
      environment: { dryBulbCelsius: 30, relativeHumidityPercent: 70 },
    });
    const result = hydrationTarget(ctx);
    expect(result.hydrationMlPerHour).toBeGreaterThanOrEqual(1100);
    expect(result.hydrationMlPerHour).toBeLessThanOrEqual(1200); // capped
  });

  it('caps at 1200 ml/h', () => {
    const rider = { ...baseRider, sweatRateLph: 2.5 };
    const session: SessionPlan = {
      id: 'test',
      inputMode: { kind: 'duration_if', durationMinutes: 60, intensityFactor: 0.95 },
    };
    const ctx = buildContext({ rider, session });
    const result = hydrationTarget(ctx);
    expect(result.hydrationMlPerHour).toBeLessThanOrEqual(1200);
  });

  it('total = hourly x hours', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.75 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = hydrationTarget(ctx);
    expect(result.totalHydrationMl).toBeCloseTo(result.hydrationMlPerHour * 2, -1);
  });
});

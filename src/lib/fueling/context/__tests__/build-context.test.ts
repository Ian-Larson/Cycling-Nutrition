import { describe, it, expect } from 'vitest';
import { buildContext } from '../build-context';
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

describe('buildContext', () => {
  it('story 4: 4h race hot day resolves correctly', () => {
    const session: SessionPlan = {
      id: 'race-4h',
      startAtIso: '2026-04-18T08:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
      terrain: 'hilly',
      elevationGainMeters: 2500,
      refuelStopOffsets: [120],
    };
    const ctx = buildContext({
      rider: baseRider,
      session,
      environment: { dryBulbCelsius: 30, relativeHumidityPercent: 70 },
    });
    expect(ctx.session.durationMinutes).toBe(240);
    expect(ctx.environment.effectiveHeat).toBe('hot');
    expect(ctx.purpose).toBe('race');
    expect(ctx.rider.sweatRateLph).toBe(1.4);
    expect(ctx.session.refuelStopOffsets).toEqual([120]);
  });

  it('story 5: 2h adaptation ride → purpose adaptation', () => {
    const session: SessionPlan = {
      id: 'adapt-2h',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.62 },
      purposeOverride: 'adaptation',
    };
    const ctx = buildContext({ rider: baseRider, session });
    expect(ctx.purpose).toBe('adaptation');
    expect(ctx.environment.effectiveHeat).toBe('moderate');
  });

  it('confidence score decreases with missing fields', () => {
    const rider = { ...baseRider, ftpWatts: undefined };
    const session: SessionPlan = {
      id: 'no-ftp',
      inputMode: { kind: 'duration_rpe', durationMinutes: 60, rpe: 5 },
    };
    const ctx = buildContext({ rider, session });
    expect(ctx.confidence.score).toBeLessThan(1.0);
    expect(ctx.confidence.missing.length).toBeGreaterThan(0);
  });

  it('no env → defaults to moderate', () => {
    const session: SessionPlan = {
      id: 'no-env',
      inputMode: { kind: 'duration_if', durationMinutes: 60, intensityFactor: 0.75 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    expect(ctx.environment.effectiveHeat).toBe('moderate');
  });
});

import { describe, it, expect } from 'vitest';
import { postRideTarget } from '../post-ride-target';
import { buildContext } from '../../context';
import type { RiderProfile, SessionPlan } from '../../types';

const baseRider: RiderProfile = {
  sex: 'male', massKg: 70, trainingLoad: 'high',
  doesConcurrentStrength: false, heavySweater: false,
  currentGutCeilingGph: 90, caffeineSensitive: false,
  dietaryFlags: [], anthropometricsUnit: 'metric', ftpWatts: 250,
};

describe('postRideTarget', () => {
  it('story 7: 8h gap → rapid recovery with 2 windows', () => {
    const session: SessionPlan = {
      id: 'rapid', startAtIso: '2026-04-18T06:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 180, intensityFactor: 0.75 },
      nextSessionAtIso: '2026-04-18T14:00:00Z',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = postRideTarget(ctx);
    expect(result.prescription).toBeDefined();
    expect(result.prescription!.mode).toBe('rapid');
    expect(result.prescription!.window2).toBeDefined();
    expect(result.prescription!.recommendRecoveryDrink).toBe(true);
  });

  it('no next session → normal mode', () => {
    const session: SessionPlan = {
      id: 'normal', inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.85 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = postRideTarget(ctx);
    expect(result.prescription!.mode).toBe('normal');
    expect(result.prescription!.window2).toBeUndefined();
  });

  it('next session 36h away → relaxed mode', () => {
    const session: SessionPlan = {
      id: 'relaxed', startAtIso: '2026-04-18T08:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 90, intensityFactor: 0.75 },
      nextSessionAtIso: '2026-04-19T20:00:00Z',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = postRideTarget(ctx);
    expect(result.prescription!.mode).toBe('relaxed');
    expect(result.prescription!.recommendRecoveryDrink).toBe(false);
  });

  it('rapid recovery has higher CHO than normal', () => {
    const rapidSession: SessionPlan = {
      id: 'rapid', startAtIso: '2026-04-18T06:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.85 },
      nextSessionAtIso: '2026-04-18T14:00:00Z',
    };
    const normalSession: SessionPlan = {
      id: 'normal', inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.85 },
    };
    const rapidCtx = buildContext({ rider: baseRider, session: rapidSession });
    const normalCtx = buildContext({ rider: baseRider, session: normalSession });
    const rapid = postRideTarget(rapidCtx);
    const normal = postRideTarget(normalCtx);
    expect(rapid.prescription!.window1.carbsGrams).toBeGreaterThan(normal.prescription!.window1.carbsGrams);
  });
});

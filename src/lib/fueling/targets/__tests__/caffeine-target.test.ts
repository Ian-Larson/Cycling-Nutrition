import { describe, it, expect } from 'vitest';
import { caffeineTarget } from '../caffeine-target';
import { buildContext } from '../../context';
import type { RiderProfile, SessionPlan } from '../../types';

const baseRider: RiderProfile = {
  sex: 'male', massKg: 70, trainingLoad: 'high',
  doesConcurrentStrength: false, heavySweater: false,
  currentGutCeilingGph: 90, caffeineSensitive: false,
  dietaryFlags: [], anthropometricsUnit: 'metric', ftpWatts: 250,
};

describe('caffeineTarget', () => {
  it('race: 70 kg → 210 mg pre-ride', () => {
    const session: SessionPlan = {
      id: 'race', inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = caffeineTarget(ctx);
    expect(result.preRideCaffeineMg).toBe(210);
  });

  it('adaptation: 200 mg flat dose', () => {
    const session: SessionPlan = {
      id: 'adapt', inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.62 },
      purposeOverride: 'adaptation',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = caffeineTarget(ctx);
    expect(result.preRideCaffeineMg).toBe(200);
  });

  it('endurance: no caffeine', () => {
    const session: SessionPlan = {
      id: 'end', inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.75 },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = caffeineTarget(ctx);
    expect(result.preRideCaffeineMg).toBe(0);
  });

  it('sensitive rider gets half dose', () => {
    const rider = { ...baseRider, caffeineSensitive: true };
    const session: SessionPlan = {
      id: 'race', inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
    };
    const ctx = buildContext({ rider, session });
    const result = caffeineTarget(ctx);
    expect(result.preRideCaffeineMg).toBe(105);
  });

  it('excess warning when total > 400 mg', () => {
    const session: SessionPlan = {
      id: 'race', inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = caffeineTarget(ctx, 250); // 210 pre + 250 solids = 460
    expect(result.warnings.some(w => w.code === 'caffeine-excess')).toBe(true);
  });

  it('no excess when under ceiling', () => {
    const session: SessionPlan = {
      id: 'race', inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const result = caffeineTarget(ctx, 150); // 210 + 150 = 360
    expect(result.warnings.some(w => w.code === 'caffeine-excess')).toBe(false);
  });
});

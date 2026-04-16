import { describe, it, expect } from 'vitest';
import { resolveRider } from '../resolve-rider';
import type { RiderProfile } from '../../types';

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
};

describe('resolveRider', () => {
  it('infers sweat rate from heat when not provided', () => {
    const { resolved, missing } = resolveRider(baseRider, 'hot');
    expect(resolved.sweatRateLph).toBe(1.4);
    expect(missing).toContain('sweatRate');
  });

  it('preserves explicit sweat rate', () => {
    const rider = { ...baseRider, sweatRateLph: 1.8 };
    const { resolved, missing } = resolveRider(rider, 'moderate');
    expect(resolved.sweatRateLph).toBe(1.8);
    expect(missing).not.toContain('sweatRate');
  });

  it('infers sodium from heavySweater flag', () => {
    const rider = { ...baseRider, heavySweater: true };
    const { resolved } = resolveRider(rider, 'moderate');
    expect(resolved.sweatSodiumMgPerL).toBe(1400);
  });

  it('uses default sodium when not heavy sweater and no explicit value', () => {
    const { resolved } = resolveRider(baseRider, 'moderate');
    expect(resolved.sweatSodiumMgPerL).toBe(900);
  });

  it('preserves explicit sodium value', () => {
    const rider = { ...baseRider, sweatSodiumMgPerL: 1200 };
    const { resolved } = resolveRider(rider, 'moderate');
    expect(resolved.sweatSodiumMgPerL).toBe(1200);
  });

  it('clamps gut ceiling to [30, 120]', () => {
    const rider = { ...baseRider, currentGutCeilingGph: 150 };
    const { resolved } = resolveRider(rider, 'moderate');
    expect(resolved.currentGutCeilingGph).toBe(120);
  });

  it('detects masters athlete at age 40', () => {
    const rider = { ...baseRider, age: 40 };
    const { resolved } = resolveRider(rider, 'moderate');
    expect(resolved.isMasters).toBe(true);
  });

  it('not masters at age 39', () => {
    const rider = { ...baseRider, age: 39 };
    const { resolved } = resolveRider(rider, 'moderate');
    expect(resolved.isMasters).toBe(false);
  });

  it('not masters when age undefined', () => {
    const { resolved } = resolveRider(baseRider, 'moderate');
    expect(resolved.isMasters).toBe(false);
  });
});

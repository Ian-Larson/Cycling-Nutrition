import { describe, it, expect } from 'vitest';
import { buildPrescription } from '../index';
import type { RiderProfile, SessionPlan } from '../types';
import type { Product } from '@/types';
import type { BottleSlot } from '@/lib/calculator/bottles';

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

const bottles: BottleSlot[] = [
  { capacityMl: 550 },
  { capacityMl: 750 },
];

const products: Product[] = [
  {
    id: 'mix1',
    name: 'PF 30',
    type: 'drink_mix',
    isAvailable: true,
    nutrition: { carbsGrams: 30, calories: 120, sodiumMg: 300 },
    serving: { servingSizeGrams: 40, scoopSizeGrams: 40 },
    concentration: { minGPerMl: 0.04, maxGPerMl: 0.10 },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'gel1',
    name: 'GU Gel',
    type: 'gel',
    isAvailable: true,
    nutrition: { carbsGrams: 22, calories: 100, caffeineMg: 20 },
    serving: { servingSizeGrams: 32 },
    createdAt: 0,
    updatedAt: 0,
  },
];

describe('buildPrescription (end-to-end)', () => {
  it('story 1: 45 min recovery -> no during-ride carbs, minimal output', () => {
    const session: SessionPlan = {
      id: 's1',
      inputMode: { kind: 'duration_if', durationMinutes: 45, intensityFactor: 0.50 },
      purposeOverride: 'recovery',
    };
    const rx = buildPrescription({ rider: baseRider, session, bottles, products });
    expect(rx.engineVersion).toBe('v3');
    expect(rx.during.carbsGPerHour).toBe(0);
    expect(rx.pre).toBeUndefined();
    expect(rx.contextSummary.purpose).toBe('recovery');
  });

  it('story 2: 90 min threshold -> 30 g/h bracket, no multi-transport', () => {
    const session: SessionPlan = {
      id: 's2',
      inputMode: { kind: 'duration_if', durationMinutes: 90, intensityFactor: 0.92 },
    };
    const rx = buildPrescription({ rider: baseRider, session, bottles, products });
    // 90 min falls in <=120 bracket (ceiling 30 g/h), IF 0.92 >= 0.82 so no reduction
    expect(rx.during.carbsGPerHour).toBe(30);
    expect(rx.during.usesMultiTransportableCarbs).toBe(false);
    expect(rx.timeline).toBeDefined();
    expect(rx.timeline!.length).toBeGreaterThan(0);
  });

  it('story 3: 3h endurance -> 60 g/h bracket', () => {
    const session: SessionPlan = {
      id: 's3',
      inputMode: { kind: 'duration_if', durationMinutes: 180, intensityFactor: 0.75 },
    };
    const rx = buildPrescription({ rider: baseRider, session, bottles, products });
    // 180 min falls in <=180 bracket (ceiling 60 g/h)
    // IF 0.75 < 0.82 tempo threshold -> reduced by 0.8 factor -> 60*0.8 = 48 -> rounds to 50
    expect(rx.during.carbsGPerHour).toBe(50);
    expect(rx.during.usesMultiTransportableCarbs).toBe(false);
  });

  it('story 4: 4h race -> 90 g/h, multi-transport, pre-ride, carb-load', () => {
    const session: SessionPlan = {
      id: 's4',
      startAtIso: '2026-04-18T08:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
      terrain: 'hilly',
    };
    const rx = buildPrescription({
      rider: baseRider,
      session,
      bottles,
      products,
      environment: { dryBulbCelsius: 30, relativeHumidityPercent: 70 },
    });
    expect(rx.during.carbsGPerHour).toBe(90);
    expect(rx.during.usesMultiTransportableCarbs).toBe(true);
    expect(rx.pre).toBeDefined();
    expect(rx.carbLoad).toBeDefined();
    expect(rx.post).toBeDefined();
    expect(rx.daily).toBeDefined();
    // Multi-transport warning should be present at minimum
    expect(rx.warnings.length).toBeGreaterThan(0);
  });

  it('story 5: 2h adaptation -> 0 carbs, no pre-ride', () => {
    const session: SessionPlan = {
      id: 's5',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.62 },
      purposeOverride: 'adaptation',
    };
    const rx = buildPrescription({ rider: baseRider, session, bottles, products });
    expect(rx.during.carbsGPerHour).toBe(0);
    expect(rx.pre).toBeUndefined();
  });

  it('story 6: century, 50 g/h gut ceiling -> capped with warning', () => {
    const rider = { ...baseRider, currentGutCeilingGph: 50 };
    const session: SessionPlan = {
      id: 's6',
      inputMode: { kind: 'duration_if', durationMinutes: 300, intensityFactor: 0.75 },
    };
    const rx = buildPrescription({ rider, session, bottles, products });
    expect(rx.during.carbsGPerHour).toBeLessThanOrEqual(50);
    expect(rx.warnings.some((w) => w.code === 'gut-cap-applied')).toBe(true);
  });

  it('story 7: rapid recovery (8h gap)', () => {
    const session: SessionPlan = {
      id: 's7',
      startAtIso: '2026-04-18T06:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 180, intensityFactor: 0.75 },
      nextSessionAtIso: '2026-04-18T14:00:00Z',
    };
    const rx = buildPrescription({
      rider: { ...baseRider, sex: 'female', massKg: 62 },
      session,
      bottles,
      products,
    });
    expect(rx.post).toBeDefined();
    // 3h ride ends at 09:00, next at 14:00 -> 5h gap -> rapid (<= 8h)
    expect(rx.post!.mode).toBe('rapid');
    expect(rx.post!.window2).toBeDefined();
  });

  it('story 8: short high-intensity session gets pre-ride at threshold+', () => {
    const session: SessionPlan = {
      id: 's8',
      startAtIso: '2026-04-18T07:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 75, intensityFactor: 0.95 },
    };
    const rx = buildPrescription({ rider: baseRider, session, bottles, products });
    // 75 min > 60 min and purpose should be threshold/vo2 -> pre-ride should be defined
    expect(rx.pre).toBeDefined();
  });

  it('story 9: 48yo masters -> higher protein daily', () => {
    const rider = { ...baseRider, age: 48 };
    const session: SessionPlan = {
      id: 's9',
      inputMode: { kind: 'duration_if', durationMinutes: 120, intensityFactor: 0.92 },
    };
    const rx = buildPrescription({ rider, session, bottles, products });
    // Masters age >= 40 -> protein at mastersCeiling = 2.0
    expect(rx.daily!.proteinGPerKg).toBeCloseTo(2.0, 1);
  });

  it('confidence score reflects data completeness', () => {
    const rider = { ...baseRider, ftpWatts: undefined };
    const session: SessionPlan = {
      id: 'conf',
      inputMode: { kind: 'duration_rpe', durationMinutes: 60, rpe: 5 as const },
    };
    const rx = buildPrescription({ rider, session, bottles, products });
    expect(rx.confidence.score).toBeLessThan(1.0);
    expect(rx.confidence.missing.length).toBeGreaterThan(0);
  });

  it('all prescriptions have engineVersion v3', () => {
    const session: SessionPlan = {
      id: 'ver',
      inputMode: { kind: 'duration_if', durationMinutes: 60, intensityFactor: 0.75 },
    };
    const rx = buildPrescription({ rider: baseRider, session, bottles, products });
    expect(rx.engineVersion).toBe('v3');
  });
});

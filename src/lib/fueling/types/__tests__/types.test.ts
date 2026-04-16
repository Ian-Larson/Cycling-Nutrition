import { describe, it, expect } from 'vitest';
import type {
  RiderProfile,
  SessionPlan,
  Environment,
  FuelingPrescription,
  Warning,
} from '../index';
import { SESSION_PURPOSE_ORDER } from '../index';

// Helper: minimal valid rider
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

describe('v3 domain types', () => {
  it('SESSION_PURPOSE_ORDER is a runtime value with 8 entries', () => {
    expect(SESSION_PURPOSE_ORDER).toHaveLength(8);
    expect(SESSION_PURPOSE_ORDER[0]).toBe('recovery');
    expect(SESSION_PURPOSE_ORDER.at(-1)).toBe('stage_race_day');
  });

  it('RiderProfile accepts story 1 (70 kg recovery spin)', () => {
    const rider: RiderProfile = { ...baseRider };
    expect(rider.massKg).toBe(70);
  });

  it('RiderProfile accepts story 6 (85 kg new rider, 50 g/h gut ceiling)', () => {
    const rider: RiderProfile = {
      ...baseRider,
      massKg: 85,
      currentGutCeilingGph: 50,
      trainingLoad: 'moderate',
    };
    expect(rider.currentGutCeilingGph).toBe(50);
  });

  it('RiderProfile accepts story 7 (62 kg female)', () => {
    const rider: RiderProfile = {
      ...baseRider,
      sex: 'female',
      massKg: 62,
    };
    expect(rider.sex).toBe('female');
  });

  it('RiderProfile accepts story 9 (48 yo masters)', () => {
    const rider: RiderProfile = {
      ...baseRider,
      age: 48,
      avoidsCaffeineAfterHour: 14,
    };
    expect(rider.age).toBe(48);
  });

  it('RiderProfile accepts story 10 (heavy sweater with measured sodium)', () => {
    const rider: RiderProfile = {
      ...baseRider,
      heavySweater: true,
      sweatRateLph: 1.5,
      sweatSodiumMgPerL: 1200,
    };
    expect(rider.sweatSodiumMgPerL).toBe(1200);
  });

  it('SessionPlan accepts duration_if input mode', () => {
    const session: SessionPlan = {
      id: 'test-1',
      inputMode: { kind: 'duration_if', durationMinutes: 90, intensityFactor: 0.88 },
    };
    expect(session.inputMode.kind).toBe('duration_if');
  });

  it('SessionPlan accepts duration_rpe input mode', () => {
    const session: SessionPlan = {
      id: 'test-rpe',
      inputMode: { kind: 'duration_rpe', durationMinutes: 120, rpe: 7 },
    };
    expect(session.inputMode.kind).toBe('duration_rpe');
  });

  it('SessionPlan accepts full race scenario (story 4)', () => {
    const session: SessionPlan = {
      id: 'race-4h',
      startAtIso: '2026-04-18T08:00:00Z',
      inputMode: { kind: 'duration_if', durationMinutes: 240, intensityFactor: 0.82 },
      purposeOverride: 'race',
      terrain: 'hilly',
      elevationGainMeters: 2500,
      refuelStopOffsets: [120],
      nextSessionAtIso: undefined,
    };
    expect(session.purposeOverride).toBe('race');
  });

  it('Environment accepts hot/humid scenario', () => {
    const env: Environment = {
      dryBulbCelsius: 30,
      relativeHumidityPercent: 70,
      heatAcclimatized: false,
    };
    expect(env.dryBulbCelsius).toBe(30);
  });

  it('Warning type accepts all warning codes', () => {
    const w: Warning = {
      code: 'gut-cap-applied',
      severity: 'info',
      message: 'Gut ceiling reduced target from 90 to 50 g/h',
      details: { prescribed: 90, cap: 50 },
    };
    expect(w.code).toBe('gut-cap-applied');
  });

  it('FuelingPrescription minimally valid (during-only)', () => {
    const rx: FuelingPrescription = {
      contextSummary: {
        rider: { massKg: 70, sex: 'male', age: 30, trainingLoad: 'high', currentGutCeilingGph: 90 },
        durationMinutes: 120,
        intensityFactor: 0.75,
        tss: 112,
        effectiveHeat: 'moderate',
        purpose: 'endurance',
      },
      during: {
        carbsGPerHour: 30,
        totalCarbsGrams: 60,
        hydrationMlPerHour: 700,
        totalHydrationMl: 1400,
        sodiumMgPerHour: 400,
        sodiumMgPerLiterTargetInBottles: 571,
        bottleConcentrationGPerMl: 0.043,
        usesMultiTransportableCarbs: false,
        strategy: 'steady',
      },
      warnings: [],
      confidence: { score: 0.7, missing: ['sweatRate', 'humidity'] },
      engineVersion: 'v3',
    };
    expect(rx.engineVersion).toBe('v3');
  });
});

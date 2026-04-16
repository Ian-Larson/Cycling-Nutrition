import { describe, it, expect } from 'vitest';
import { validatePrescription } from '../validate';
import { computeConfidence } from '../confidence';
import { buildContext } from '../../context';
import type {
  RiderProfile,
  SessionPlan,
  DuringRidePrescription,
} from '../../types';

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

const baseDuring: DuringRidePrescription = {
  carbsGPerHour: 60,
  totalCarbsGrams: 120,
  hydrationMlPerHour: 700,
  totalHydrationMl: 1400,
  sodiumMgPerHour: 400,
  sodiumMgPerLiterTargetInBottles: 571,
  bottleConcentrationGPerMl: 0.086,
  usesMultiTransportableCarbs: false,
  strategy: 'steady',
};

describe('validatePrescription', () => {
  it('warns when multi-transport required but not flagged in products', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: {
        kind: 'duration_if',
        durationMinutes: 240,
        intensityFactor: 0.82,
      },
      purposeOverride: 'race',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const during = { ...baseDuring, usesMultiTransportableCarbs: true };
    const warnings = validatePrescription(ctx, during);
    expect(warnings.some((w) => w.code === 'no-multi-transport-product')).toBe(
      true,
    );
  });

  it('warns about train-low at high intensity', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: {
        kind: 'duration_if',
        durationMinutes: 90,
        intensityFactor: 0.9,
      },
      purposeOverride: 'adaptation',
    };
    const ctx = buildContext({ rider: baseRider, session });
    const warnings = validatePrescription(ctx, baseDuring);
    expect(
      warnings.some(
        (w) => w.code === 'train-low-not-recommended-for-quality',
      ),
    ).toBe(true);
  });

  it('deduplicates warnings', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: {
        kind: 'duration_if',
        durationMinutes: 90,
        intensityFactor: 0.75,
      },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const existing = [
      {
        code: 'gut-cap-applied' as const,
        severity: 'info' as const,
        message: 'test',
      },
    ];
    const warnings = validatePrescription(ctx, baseDuring, undefined, existing);
    const gutWarnings = warnings.filter((w) => w.code === 'gut-cap-applied');
    expect(gutWarnings).toHaveLength(1);
  });
});

describe('computeConfidence', () => {
  it('returns context confidence as-is', () => {
    const session: SessionPlan = {
      id: 'test',
      inputMode: {
        kind: 'duration_if',
        durationMinutes: 120,
        intensityFactor: 0.75,
      },
    };
    const ctx = buildContext({ rider: baseRider, session });
    const confidence = computeConfidence(ctx);
    expect(confidence.score).toBeGreaterThan(0);
    expect(confidence.score).toBeLessThanOrEqual(1);
    expect(Array.isArray(confidence.missing)).toBe(true);
  });
});

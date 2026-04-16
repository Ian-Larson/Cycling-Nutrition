import { describe, it, expect } from 'vitest';
import { dailyTargets } from '../daily-target';

describe('dailyTargets', () => {
  it('70 kg, 90 min threshold today → moderate tier → rider says high → CHO ~560g', () => {
    const result = dailyTargets({ massKg: 70, trainingLoad: 'high', doesConcurrentStrength: false }, 90);
    // high tier (rider says 'high', 90 min maps to 'moderate', take higher = 'high')
    // high tier midpoint: (6+10)/2 = 8 g/kg → 560g
    expect(result.carbsGPerKg).toBe(8);
    expect(result.carbsGramsTotal).toBe(560);
    expect(result.proteinGPerKg).toBeCloseTo(1.83, 1);
    expect(result.proteinGramsTotal).toBe(Math.round(1.83 * 70));
  });

  it('70 kg, 4h race day → veryHigh tier', () => {
    const result = dailyTargets({ massKg: 70, trainingLoad: 'high', doesConcurrentStrength: false }, 240);
    // veryHigh: midpoint (8+12)/2 = 10 g/kg → 700g
    expect(result.carbsGPerKg).toBe(10);
    expect(result.carbsGramsTotal).toBe(700);
  });

  it('48 yo masters → higher protein (2.0 g/kg)', () => {
    const result = dailyTargets({ massKg: 70, age: 48, trainingLoad: 'high', doesConcurrentStrength: false }, 120);
    expect(result.proteinGPerKg).toBeCloseTo(2.0, 1);
    expect(result.proteinGramsTotal).toBe(140);
  });

  it('concurrent strength → +0.2 g/kg protein', () => {
    const result = dailyTargets({ massKg: 70, trainingLoad: 'moderate', doesConcurrentStrength: true }, 60);
    expect(result.proteinGPerKg).toBeCloseTo(2.03, 1);
  });

  it('masters + concurrent strength stacks', () => {
    const result = dailyTargets({ massKg: 70, age: 50, trainingLoad: 'moderate', doesConcurrentStrength: true }, 60);
    expect(result.proteinGPerKg).toBeCloseTo(2.2, 1);
  });

  it('caffeine ceiling is always 400', () => {
    const result = dailyTargets({ massKg: 70, trainingLoad: 'moderate', doesConcurrentStrength: false }, 60);
    expect(result.caffeineMgCeiling).toBe(400);
  });

  it('light training day with light rider self-report', () => {
    const result = dailyTargets({ massKg: 60, trainingLoad: 'light', doesConcurrentStrength: false }, 30);
    // light tier: midpoint (3+5)/2 = 4 g/kg → 240g
    expect(result.carbsGPerKg).toBe(4);
    expect(result.carbsGramsTotal).toBe(240);
  });
});

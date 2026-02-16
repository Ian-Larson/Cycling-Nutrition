import { describe, expect, it } from 'vitest';
import {
  centimetersToFeetInches,
  feetInchesToCentimeters,
  formatNumberInputValue,
  kilogramsToPounds,
  normalizeAnthropometricsUnit,
  poundsToKilograms,
} from './anthropometrics';

describe('normalizeAnthropometricsUnit', () => {
  it('defaults invalid values to metric', () => {
    expect(normalizeAnthropometricsUnit(undefined)).toBe('metric');
    expect(normalizeAnthropometricsUnit('celsius')).toBe('metric');
  });

  it('accepts imperial values', () => {
    expect(normalizeAnthropometricsUnit('imperial')).toBe('imperial');
  });
});

describe('weight conversions', () => {
  it('converts pounds to kilograms and back', () => {
    const kilograms = poundsToKilograms(160);
    const pounds = kilogramsToPounds(kilograms);

    expect(kilograms).toBeCloseTo(72.5748, 4);
    expect(pounds).toBeCloseTo(160, 4);
  });
});

describe('height conversions', () => {
  it('converts feet/inches to centimeters', () => {
    expect(feetInchesToCentimeters(5, 11)).toBeCloseTo(180.34, 2);
  });

  it('converts centimeters to feet/inches', () => {
    const result = centimetersToFeetInches(180.34);

    expect(result.feet).toBe(5);
    expect(result.inches).toBeCloseTo(11, 1);
  });

  it('carries 12 inches into the next foot after rounding', () => {
    const result = centimetersToFeetInches(182.88);
    expect(result).toEqual({ feet: 6, inches: 0 });
  });
});

describe('formatNumberInputValue', () => {
  it('formats optional numeric values for text inputs', () => {
    expect(formatNumberInputValue(undefined)).toBe('');
    expect(formatNumberInputValue(72.555, 1)).toBe('72.6');
    expect(formatNumberInputValue(178.2, 0)).toBe('178');
  });
});

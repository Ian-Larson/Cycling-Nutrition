import { describe, it, expect } from 'vitest';
import { classifyPurpose } from '../resolve-purpose';

describe('classifyPurpose', () => {
  it('override always wins', () => {
    expect(classifyPurpose(0.95, 120, 'adaptation')).toBe('adaptation');
  });

  it('IF 0.45 → recovery', () => {
    expect(classifyPurpose(0.45, 60)).toBe('recovery');
  });

  it('IF 0.60 → adaptation', () => {
    expect(classifyPurpose(0.60, 90)).toBe('adaptation');
  });

  it('IF 0.75 → endurance', () => {
    expect(classifyPurpose(0.75, 120)).toBe('endurance');
  });

  it('IF 0.85 → tempo', () => {
    expect(classifyPurpose(0.85, 90)).toBe('tempo');
  });

  it('IF 0.92 → threshold', () => {
    expect(classifyPurpose(0.92, 60)).toBe('threshold');
  });

  it('IF 1.00 → vo2', () => {
    expect(classifyPurpose(1.00, 30)).toBe('vo2');
  });

  it('IF 1.10 + duration > 30 → race', () => {
    expect(classifyPurpose(1.10, 60)).toBe('race');
  });

  it('long hard ride (>180 min, IF ≥ 0.82) → race', () => {
    expect(classifyPurpose(0.85, 240)).toBe('race');
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatCarbsGrams,
  formatCarbsPerHour,
  formatFluidMl,
  formatFluidPerHour,
  formatSodiumMg,
  formatSodiumPerHour,
  formatPercent,
  formatGPerKg,
  formatMgPerL,
} from '../format';

describe('fueling format helpers', () => {
  it('formats carb totals as rounded grams with a unit suffix', () => {
    expect(formatCarbsGrams(82)).toBe('82 g');
    expect(formatCarbsGrams(0)).toBe('0 g');
  });

  it('formats per-hour carbs with a slash unit', () => {
    expect(formatCarbsPerHour(85)).toBe('85 g/h');
  });

  it('formats fluid totals with thousands separators', () => {
    expect(formatFluidMl(1500)).toBe('1,500 ml');
  });

  it('formats per-hour fluid', () => {
    expect(formatFluidPerHour(700)).toBe('700 ml/h');
  });

  it('formats sodium and sodium/h', () => {
    expect(formatSodiumMg(450)).toBe('450 mg');
    expect(formatSodiumPerHour(600)).toBe('600 mg/h');
  });

  it('formats percentages from a 0–1 score', () => {
    expect(formatPercent(0.78)).toBe('78%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('formats g/kg values to one decimal', () => {
    expect(formatGPerKg(1.2)).toBe('1.2 g/kg');
    expect(formatGPerKg(0.95)).toBe('1.0 g/kg');
  });

  it('formats mg/L', () => {
    expect(formatMgPerL(700)).toBe('700 mg/L');
  });
});

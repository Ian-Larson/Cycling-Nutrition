import { describe, it, expect } from 'vitest';
import { resolveEnvironment } from '../resolve-environment';

describe('resolveEnvironment', () => {
  it('30°C + 70% RH → hot', () => {
    const r = resolveEnvironment({ dryBulbCelsius: 30, relativeHumidityPercent: 70 });
    expect(r.effectiveHeat).toBe('hot');
    expect(r.wetBulbCelsius).toBeDefined();
  });

  it('10°C + 40% RH → cold', () => {
    const r = resolveEnvironment({ dryBulbCelsius: 10, relativeHumidityPercent: 40 });
    expect(r.effectiveHeat).toBe('cold');
  });

  it('20°C + 50% RH → moderate', () => {
    const r = resolveEnvironment({ dryBulbCelsius: 20, relativeHumidityPercent: 50 });
    expect(r.effectiveHeat).toBe('moderate');
  });

  it('defaults to moderate when no env provided', () => {
    const r = resolveEnvironment(undefined);
    expect(r.effectiveHeat).toBe('moderate');
  });

  it('dry-bulb only → assumes 50% RH', () => {
    const r = resolveEnvironment({ dryBulbCelsius: 25 });
    expect(r.relativeHumidityPercent).toBe(50);
    expect(r.effectiveHeat).toBeDefined();
  });

  it('acclimatized shifts one band cooler', () => {
    // 30°C + 70% → hot; acclimatized → warm
    const r = resolveEnvironment({ dryBulbCelsius: 30, relativeHumidityPercent: 70, heatAcclimatized: true });
    expect(r.effectiveHeat).toBe('warm');
  });

  it('acclimatized cold stays cold (floor)', () => {
    const r = resolveEnvironment({ dryBulbCelsius: 5, relativeHumidityPercent: 30, heatAcclimatized: true });
    expect(r.effectiveHeat).toBe('cold');
  });
});

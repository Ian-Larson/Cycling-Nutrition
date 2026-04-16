import { describe, it, expect } from 'vitest';
import { bottleConstraints } from '../bottle-constraints';

describe('bottleConstraints', () => {
  it('90 g/h with 700 ml/h -> drink-only (0.129 g/ml)', () => {
    const r = bottleConstraints(90, 700);
    expect(r.strategy).toBe('drink-only');
    expect(r.bottleConcentrationGPerMl).toBeCloseTo(0.129, 2);
  });

  it('90 g/h with 500 ml/h -> split (0.18 g/ml > 0.16)', () => {
    const r = bottleConstraints(90, 500);
    expect(r.strategy).toBe('split-drink-solids');
    expect(r.extraFluidMlHint).toBeDefined();
  });

  it('120 g/h with 400 ml/h -> solids-heavy (0.30 g/ml >> 0.24 threshold)', () => {
    const r = bottleConstraints(120, 400);
    expect(r.strategy).toBe('solids-heavy');
  });

  it('30 g/h with 1000 ml/h -> drink-only (dilute)', () => {
    const r = bottleConstraints(30, 1000);
    expect(r.strategy).toBe('drink-only');
    expect(r.bottleConcentrationGPerMl).toBeCloseTo(0.030, 2);
  });

  it('0 g/h -> drink-only with 0 concentration', () => {
    const r = bottleConstraints(0, 700);
    expect(r.strategy).toBe('drink-only');
    expect(r.bottleConcentrationGPerMl).toBe(0);
  });
});

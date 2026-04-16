import { describe, it, expect } from 'vitest';
import { carbLoadProtocol } from '../carb-load';

describe('carbLoadProtocol', () => {
  it('event >= 90 min → returns protocol', () => {
    const result = carbLoadProtocol(70, 240);
    expect(result).toBeDefined();
    expect(result!.days).toBe(2);
    expect(result!.targetGPerKgPerDay).toBe(11); // midpoint of 10-12
    expect(result!.hourlyCeilingGPerKg).toBe(1.2);
  });

  it('event < 90 min → undefined', () => {
    const result = carbLoadProtocol(70, 60);
    expect(result).toBeUndefined();
  });

  it('exactly 90 min → returns protocol', () => {
    const result = carbLoadProtocol(70, 90);
    expect(result).toBeDefined();
  });
});

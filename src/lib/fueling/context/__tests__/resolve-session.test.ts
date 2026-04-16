import { describe, it, expect } from 'vitest';
import { resolveSession } from '../resolve-session';

describe('resolveSession', () => {
  it('resolves duration_if: 90 min at IF 0.88 → TSS ≈ 116', () => {
    const r = resolveSession({ kind: 'duration_if', durationMinutes: 90, intensityFactor: 0.88 });
    expect(r.durationMinutes).toBe(90);
    expect(r.intensityFactor).toBe(0.88);
    expect(r.tss).toBeCloseTo(116.16, 0);
  });

  it('resolves duration_tss: 240 min TSS 280 → IF ≈ 0.836', () => {
    const r = resolveSession({ kind: 'duration_tss', durationMinutes: 240, tss: 280 });
    expect(r.intensityFactor).toBeCloseTo(0.836, 2);
  });

  it('resolves if_tss: IF 0.75, TSS 140 → duration ≈ 149 min', () => {
    const r = resolveSession({ kind: 'if_tss', intensityFactor: 0.75, tss: 140 });
    expect(r.durationMinutes).toBeCloseTo(149.3, 0);
  });

  it('resolves duration_rpe: 120 min RPE 7 → IF 0.80 → TSS ≈ 128', () => {
    const r = resolveSession({ kind: 'duration_rpe', durationMinutes: 120, rpe: 7 });
    expect(r.intensityFactor).toBe(0.80);
    expect(r.tss).toBeCloseTo(128, 0);
  });

  it('computes NP and kJ/h when FTP provided', () => {
    const r = resolveSession({ kind: 'duration_if', durationMinutes: 60, intensityFactor: 0.85 }, 250);
    expect(r.normalizedPowerWatts).toBeCloseTo(212.5, 0);
    expect(r.kjPerHour).toBeCloseTo(765, 0);
  });

  it('clamps extreme IF to [0.3, 1.3]', () => {
    const r = resolveSession({ kind: 'duration_if', durationMinutes: 60, intensityFactor: 2.0 });
    expect(r.intensityFactor).toBe(1.3);
  });

  it('omits NP and kJ/h when FTP absent', () => {
    const r = resolveSession({ kind: 'duration_if', durationMinutes: 60, intensityFactor: 0.85 });
    expect(r.normalizedPowerWatts).toBeUndefined();
    expect(r.kjPerHour).toBeUndefined();
  });
});

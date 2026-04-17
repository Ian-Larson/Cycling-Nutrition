import { describe, it, expect } from 'vitest';
import { deriveDue } from './derive-due';
import type { Bike, ServiceEntry } from '@/types/gear';

const bike = (over: Partial<Bike> = {}): Bike => ({
  id: 'b1', name: 'Force E1', stravaGearId: null,
  cachedOdometerMi: 1800, odometerSyncedAtIso: null,
  isPrimary: true, createdAt: 0, updatedAt: 0, ...over,
});
const entry = (over: Partial<ServiceEntry>): ServiceEntry => ({
  id: 'e1', bikeId: 'b1', typeKey: 'chain_wax', dateIso: '2026-04-10',
  mileageMi: 1600, intervalMi: 250, serviceAtMi: 1850,
  createdAt: 0, updatedAt: 0, ...over,
});

describe('deriveDue', () => {
  it('returns empty when no entries exist', () => {
    expect(deriveDue([bike()], [])).toEqual([]);
  });

  it('computes remainingMi = serviceAtMi - cachedOdometerMi', () => {
    const due = deriveDue([bike({ cachedOdometerMi: 1800 })], [entry({ serviceAtMi: 1850 })]);
    expect(due[0].remainingMi).toBe(50);
  });

  it('flags overdue when remaining < 0', () => {
    const due = deriveDue([bike({ cachedOdometerMi: 1900 })], [entry({ serviceAtMi: 1850 })]);
    expect(due[0].urgency).toBe('overdue');
  });

  it('flags soon when remaining <= 10% of interval', () => {
    const due = deriveDue(
      [bike({ cachedOdometerMi: 1825 })],
      [entry({ serviceAtMi: 1850, intervalMi: 250 })],
    );
    expect(due[0].urgency).toBe('soon');
  });

  it('uses the latest entry per (bike, typeKey) pair', () => {
    const due = deriveDue(
      [bike({ cachedOdometerMi: 1900 })],
      [
        entry({ id: 'e1', dateIso: '2026-01-01', mileageMi: 1000, serviceAtMi: 1250 }),
        entry({ id: 'e2', dateIso: '2026-04-10', mileageMi: 1750, serviceAtMi: 2000 }),
      ],
    );
    expect(due).toHaveLength(1);
    expect(due[0].lastEntry.id).toBe('e2');
    expect(due[0].remainingMi).toBe(100);
  });

  it('sorts ascending by remainingMi (most urgent first)', () => {
    const due = deriveDue(
      [bike({ cachedOdometerMi: 1900 })],
      [
        entry({ id: 'e1', typeKey: 'tires', serviceAtMi: 4000, intervalMi: 2500 }),
        entry({ id: 'e2', typeKey: 'chain_wax', serviceAtMi: 1850, intervalMi: 250 }),
      ],
    );
    expect(due.map((d) => d.typeKey)).toEqual(['chain_wax', 'tires']);
  });

  it('skips bikes with null cachedOdometerMi', () => {
    const due = deriveDue([bike({ cachedOdometerMi: null })], [entry({})]);
    expect(due).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { deriveGarageStatus } from './garage-status';
import type { GearDueItem } from './derive-gear-due';
import type { Bike, GearServiceEvent } from '@/types/gear';

const bike = (overrides: Partial<Bike> = {}): Bike => ({
  id: 'bike-1',
  name: 'Force E1',
  stravaGearId: null,
  cachedOdometerMi: 1000,
  odometerSyncedAtIso: null,
  isPrimary: true,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const event = (overrides: Partial<GearServiceEvent> = {}): GearServiceEvent => ({
  id: 'evt',
  bikeId: 'bike-1',
  typeKey: 'chain_wax',
  dateIso: '2026-04-01',
  mileageMi: 750,
  intervalMi: 250,
  nextDueMileageMi: 1000,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const item = (overrides: Partial<GearDueItem> = {}): GearDueItem => ({
  id: 'item',
  bike: null,
  bikeId: 'bike-1',
  event: event(),
  typeKey: 'chain_wax',
  label: 'Chain wax',
  remainingMi: 0,
  remainingDays: null,
  intervalMi: 250,
  intervalDays: null,
  urgency: 'soon',
  ...overrides,
});

describe('deriveGarageStatus', () => {
  it('reports no attention when there are no due items', () => {
    const status = deriveGarageStatus({
      bikes: [bike()],
      dueItems: [],
      selectedBikeId: 'bike-1',
    });

    expect(status.hasAttention).toBe(false);
    expect(status.worstAcrossGarage).toBeNull();
    expect(status.perBikeUrgency['bike-1']).toBeNull();
    expect(status.thisBikeCounts).toEqual({ overdue: 0, soon: 0 });
    expect(status.elsewhereCounts).toEqual({ overdue: 0, soon: 0 });
    expect(status.garageWideCounts).toEqual({ overdue: 0, soon: 0 });
  });

  it('ignores ok and unknown urgencies in counts', () => {
    const status = deriveGarageStatus({
      bikes: [bike()],
      dueItems: [
        item({ id: 'a', urgency: 'ok' }),
        item({ id: 'b', urgency: 'unknown' }),
      ],
      selectedBikeId: 'bike-1',
    });

    expect(status.hasAttention).toBe(false);
    expect(status.garageWideCounts).toEqual({ overdue: 0, soon: 0 });
    expect(status.perBikeUrgency['bike-1']).toBeNull();
  });

  it('counts overdue and soon on the selected bike', () => {
    const status = deriveGarageStatus({
      bikes: [bike()],
      dueItems: [
        item({ id: 'a', urgency: 'overdue' }),
        item({ id: 'b', urgency: 'soon' }),
        item({ id: 'c', urgency: 'soon' }),
      ],
      selectedBikeId: 'bike-1',
    });

    expect(status.hasAttention).toBe(true);
    expect(status.thisBikeCounts).toEqual({ overdue: 1, soon: 2 });
    expect(status.elsewhereCounts).toEqual({ overdue: 0, soon: 0 });
    expect(status.garageWideCounts).toEqual({ overdue: 1, soon: 2 });
    expect(status.worstAcrossGarage).toBe('overdue');
    expect(status.perBikeUrgency['bike-1']).toBe('overdue');
  });

  it('splits this-bike vs elsewhere when multiple bikes have issues', () => {
    const bikes = [
      bike({ id: 'bike-1' }),
      bike({ id: 'bike-2', name: 'Gravel' }),
    ];
    const status = deriveGarageStatus({
      bikes,
      dueItems: [
        item({ id: 'a', bikeId: 'bike-1', urgency: 'soon' }),
        item({ id: 'b', bikeId: 'bike-2', urgency: 'overdue' }),
      ],
      selectedBikeId: 'bike-1',
    });

    expect(status.thisBikeCounts).toEqual({ overdue: 0, soon: 1 });
    expect(status.elsewhereCounts).toEqual({ overdue: 1, soon: 0 });
    expect(status.garageWideCounts).toEqual({ overdue: 1, soon: 1 });
    expect(status.worstAcrossGarage).toBe('overdue');
    expect(status.perBikeUrgency['bike-1']).toBe('soon');
    expect(status.perBikeUrgency['bike-2']).toBe('overdue');
  });

  it('treats All Bikes selection as no per-bike split', () => {
    const status = deriveGarageStatus({
      bikes: [bike({ id: 'bike-1' }), bike({ id: 'bike-2' })],
      dueItems: [
        item({ id: 'a', bikeId: 'bike-1', urgency: 'soon' }),
        item({ id: 'b', bikeId: 'bike-2', urgency: 'overdue' }),
      ],
      selectedBikeId: null,
    });

    expect(status.thisBikeCounts).toEqual({ overdue: 0, soon: 0 });
    expect(status.elsewhereCounts).toEqual({ overdue: 0, soon: 0 });
    expect(status.garageWideCounts).toEqual({ overdue: 1, soon: 1 });
    expect(status.hasAttention).toBe(true);
  });

  it('keeps the worst urgency when a bike has both overdue and soon items', () => {
    const status = deriveGarageStatus({
      bikes: [bike()],
      dueItems: [
        item({ id: 'a', urgency: 'soon' }),
        item({ id: 'b', urgency: 'overdue' }),
      ],
      selectedBikeId: 'bike-1',
    });

    expect(status.perBikeUrgency['bike-1']).toBe('overdue');
  });

  it('initializes perBikeUrgency entries for bikes with no due items', () => {
    const status = deriveGarageStatus({
      bikes: [bike({ id: 'bike-1' }), bike({ id: 'bike-2' })],
      dueItems: [item({ id: 'a', bikeId: 'bike-1', urgency: 'soon' })],
      selectedBikeId: null,
    });

    expect(status.perBikeUrgency['bike-1']).toBe('soon');
    expect(status.perBikeUrgency['bike-2']).toBeNull();
  });
});

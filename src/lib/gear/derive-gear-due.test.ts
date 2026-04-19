import { describe, expect, it } from 'vitest';
import { deriveGearDue } from './derive-gear-due';
import type { Bike, GearServiceEvent } from '@/types/gear';

const today = '2026-04-18';

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

const serviceEvent = (
  overrides: Partial<GearServiceEvent> = {}
): GearServiceEvent => ({
  id: 'service-1',
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

describe('deriveGearDue', () => {
  it('derives overdue, soon, and ok mileage due items in urgency order', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      serviceEvents: [
        serviceEvent({
          id: 'ok',
          typeKey: 'cassette_check',
          intervalMi: 1000,
          nextDueMileageMi: 1300,
        }),
        serviceEvent({
          id: 'soon',
          typeKey: 'brake_pad_check',
          intervalMi: 250,
          nextDueMileageMi: 1025,
        }),
        serviceEvent({
          id: 'overdue',
          typeKey: 'chain_wax',
          intervalMi: 250,
          nextDueMileageMi: 999,
        }),
      ],
      today,
    });

    expect(items.map((item) => item.id)).toEqual(['overdue', 'soon', 'ok']);
    expect(items.map((item) => item.urgency)).toEqual(['overdue', 'soon', 'ok']);
    expect(items.map((item) => item.remainingMi)).toEqual([-1, 25, 300]);
    expect(items[0].label).toBe('Chain wax');
  });

  it('derives overdue date due items', () => {
    const items = deriveGearDue({
      bikes: [bike()],
      serviceEvents: [
        serviceEvent({
          id: 'overdue-date',
          nextDueMileageMi: undefined,
          intervalMi: undefined,
          intervalDays: 30,
          nextDueDateIso: '2026-04-17',
        }),
      ],
      today,
    });

    expect(items).toMatchObject([
      {
        id: 'overdue-date',
        remainingDays: -1,
        urgency: 'overdue',
      },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { deriveGearDue } from './derive-gear-due';
import type { Bike, GearInstallRecord, GearServiceEvent } from '@/types/gear';

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

const installRecord = (
  overrides: Partial<GearInstallRecord> = {}
): GearInstallRecord => ({
  id: 'install-1',
  bikeId: 'bike-1',
  partInstanceId: 'part-1',
  slotKey: 'chain',
  installedAtMileageMi: 750,
  installedDateIso: '2026-03-01',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe('deriveGearDue', () => {
  it('derives overdue, soon, and ok mileage due items in urgency order', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [],
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
      installRecords: [],
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

  it('uses only the latest event for the same bike, part, and type', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [installRecord()],
      serviceEvents: [
        serviceEvent({
          id: 'old-overdue',
          partInstanceId: 'part-1',
          dateIso: '2026-04-01',
          createdAt: 1,
          nextDueMileageMi: 900,
        }),
        serviceEvent({
          id: 'new-ok',
          partInstanceId: 'part-1',
          dateIso: '2026-04-10',
          createdAt: 1,
          nextDueMileageMi: 1300,
        }),
      ],
      today,
    });

    expect(items.map((item) => item.id)).toEqual(['new-ok']);
    expect(items[0]).toMatchObject({
      remainingMi: 300,
      urgency: 'ok',
    });
  });

  it('suppresses an older due row when the latest target event has no due fields', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [installRecord()],
      serviceEvents: [
        serviceEvent({
          id: 'old-due',
          partInstanceId: 'part-1',
          dateIso: '2026-04-01',
          nextDueMileageMi: 900,
        }),
        serviceEvent({
          id: 'new-no-due',
          partInstanceId: 'part-1',
          dateIso: '2026-04-10',
          nextDueMileageMi: undefined,
          nextDueDateIso: undefined,
        }),
      ],
      today,
    });

    expect(items).toEqual([]);
  });

  it('uses createdAt descending when latest target event dates tie', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [installRecord()],
      serviceEvents: [
        serviceEvent({
          id: 'older-created',
          partInstanceId: 'part-1',
          dateIso: '2026-04-10',
          createdAt: 1,
          nextDueMileageMi: 900,
        }),
        serviceEvent({
          id: 'newer-created',
          partInstanceId: 'part-1',
          dateIso: '2026-04-10',
          createdAt: 2,
          nextDueMileageMi: 1300,
        }),
      ],
      today,
    });

    expect(items.map((item) => item.id)).toEqual(['newer-created']);
  });

  it('uses id descending when latest target event dates and createdAt tie', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [installRecord()],
      serviceEvents: [
        serviceEvent({
          id: 'a-service',
          partInstanceId: 'part-1',
          dateIso: '2026-04-10',
          createdAt: 1,
          nextDueMileageMi: 900,
        }),
        serviceEvent({
          id: 'z-service',
          partInstanceId: 'part-1',
          dateIso: '2026-04-10',
          createdAt: 1,
          nextDueMileageMi: 1300,
        }),
      ],
      today,
    });

    expect(items.map((item) => item.id)).toEqual(['z-service']);
  });

  it('excludes part-specific events for removed install records', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [
        installRecord({
          removedAtMileageMi: 900,
          removedDateIso: '2026-04-01',
        }),
      ],
      serviceEvents: [
        serviceEvent({
          id: 'removed-part-service',
          partInstanceId: 'part-1',
          nextDueMileageMi: 900,
        }),
      ],
      today,
    });

    expect(items).toEqual([]);
  });

  it('includes slot-specific events only when that bike slot has an active install', () => {
    const withoutActiveSlot = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [],
      serviceEvents: [
        serviceEvent({
          id: 'slot-without-install',
          slotKey: 'front_tire',
          typeKey: 'tire_inspection',
          nextDueMileageMi: 900,
        }),
      ],
      today,
    });

    const withActiveSlot = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [
        installRecord({
          id: 'front-tire-install',
          partInstanceId: 'front-tire-part',
          slotKey: 'front_tire',
        }),
      ],
      serviceEvents: [
        serviceEvent({
          id: 'slot-with-install',
          slotKey: 'front_tire',
          typeKey: 'tire_inspection',
          nextDueMileageMi: 900,
        }),
      ],
      today,
    });

    expect(withoutActiveSlot).toEqual([]);
    expect(withActiveSlot.map((item) => item.id)).toEqual(['slot-with-install']);
  });

  it('ignores slot-level due events before a replacement install', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1500 })],
      installRecords: [
        installRecord({
          id: 'rear-tire-install',
          partInstanceId: 'rear-tire-current',
          slotKey: 'rear_tire',
          installedAtMileageMi: 1300,
          installedDateIso: '2026-04-01',
        }),
      ],
      serviceEvents: [
        serviceEvent({
          id: 'old-rear-tire-due',
          partInstanceId: undefined,
          slotKey: 'rear_tire',
          typeKey: 'tire_inspection',
          dateIso: '2026-03-20',
          mileageMi: 1200,
          nextDueMileageMi: 1400,
        }),
      ],
      today,
    });

    expect(items).toEqual([]);
  });

  it('includes bike-only due rows without install records', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 1000 })],
      installRecords: [],
      serviceEvents: [
        serviceEvent({
          id: 'bike-only-service',
          nextDueMileageMi: 900,
        }),
      ],
      today,
    });

    expect(items.map((item) => item.id)).toEqual(['bike-only-service']);
  });
});

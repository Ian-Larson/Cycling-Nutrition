import { describe, expect, it } from 'vitest';
import { FIXED_BIKE_SLOTS } from './constants';
import { deriveActiveSetup } from './derive-active-setup';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';

const today = '2026-04-18';

const bike = (overrides: Partial<Bike> = {}): Bike => ({
  id: 'bike-1',
  name: 'Force E1',
  stravaGearId: null,
  cachedOdometerMi: 1200,
  odometerSyncedAtIso: null,
  isPrimary: true,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const chainCatalog = (
  overrides: Partial<GearPartCatalogItem> = {}
): GearPartCatalogItem => ({
  id: 'catalog-chain',
  category: 'chain',
  brand: 'Shimano',
  model: 'XT M8100',
  attributes: { category: 'chain', speedCount: 12 },
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const instance = (
  overrides: Partial<GearPartInstance> = {}
): GearPartInstance => ({
  id: 'part-1',
  catalogItemId: 'catalog-chain',
  status: 'installed',
  label: 'Race chain',
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
  installedAtMileageMi: 1000,
  installedDateIso: '2026-03-01',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const serviceEvent = (
  overrides: Partial<GearServiceEvent> = {}
): GearServiceEvent => ({
  id: 'service-1',
  bikeId: 'bike-1',
  partInstanceId: 'part-1',
  typeKey: 'chain_wax',
  dateIso: '2026-04-10',
  mileageMi: 1150,
  intervalMi: 100,
  nextDueMileageMi: 1250,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe('deriveActiveSetup', () => {
  it('returns one row for every fixed bike slot', () => {
    const rows = deriveActiveSetup({
      bike: bike(),
      catalog: [],
      instances: [],
      installRecords: [],
      serviceEvents: [],
      today,
    });

    expect(rows.map((row) => row.slotKey)).toEqual(
      FIXED_BIKE_SLOTS.map((slot) => slot.key)
    );
    expect(rows).toHaveLength(FIXED_BIKE_SLOTS.length);
  });

  it('fills installed part details and miles since install for active records', () => {
    const rows = deriveActiveSetup({
      bike: bike({ cachedOdometerMi: 1200 }),
      catalog: [chainCatalog()],
      instances: [instance()],
      installRecords: [installRecord()],
      serviceEvents: [],
      today,
    });

    const chainRow = rows.find((row) => row.slotKey === 'chain');

    expect(chainRow).toMatchObject({
      slotLabel: 'Chain',
      installRecord: { id: 'install-1' },
      instance: { id: 'part-1', label: 'Race chain' },
      catalogItem: { id: 'catalog-chain', model: 'XT M8100' },
      milesSinceInstall: 200,
    });
  });

  it('uses the latest matching part or slot service and flags soon urgency', () => {
    const rows = deriveActiveSetup({
      bike: bike({ cachedOdometerMi: 1241 }),
      catalog: [chainCatalog()],
      instances: [instance()],
      installRecords: [installRecord()],
      serviceEvents: [
        serviceEvent({
          id: 'older-service',
          dateIso: '2026-04-01',
          nextDueMileageMi: 1300,
        }),
        serviceEvent({
          id: 'slot-service',
          partInstanceId: undefined,
          slotKey: 'chain',
          dateIso: '2026-04-15',
          nextDueMileageMi: 1250,
        }),
      ],
      today,
    });

    const chainRow = rows.find((row) => row.slotKey === 'chain');

    expect(chainRow?.latestService?.id).toBe('slot-service');
    expect(chainRow?.urgency).toBe('soon');
  });

  it('ignores slot service before the active replacement install', () => {
    const baseInput = {
      bike: bike({ cachedOdometerMi: 1500 }),
      catalog: [
        chainCatalog({
          id: 'catalog-tire',
          category: 'tire',
          model: 'Racing tire',
          attributes: { category: 'tire', widthMm: 28 },
        }),
      ],
      instances: [
        instance({
          id: 'rear-tire-current',
          catalogItemId: 'catalog-tire',
          label: 'Current rear tire',
        }),
      ],
      installRecords: [
        installRecord({
          id: 'rear-tire-install',
          partInstanceId: 'rear-tire-current',
          slotKey: 'rear_tire',
          installedAtMileageMi: 1300,
          installedDateIso: '2026-04-01',
        }),
      ],
      today,
    };
    const oldSlotService = serviceEvent({
      id: 'old-rear-tire-service',
      partInstanceId: undefined,
      slotKey: 'rear_tire',
      typeKey: 'tire_inspection',
      dateIso: '2026-03-20',
      mileageMi: 1200,
      nextDueMileageMi: 1400,
    });

    const rowsWithOldServiceOnly = deriveActiveSetup({
      ...baseInput,
      serviceEvents: [oldSlotService],
    });

    expect(
      rowsWithOldServiceOnly.find((row) => row.slotKey === 'rear_tire')?.latestService
    ).toBeNull();

    const rows = deriveActiveSetup({
      ...baseInput,
      serviceEvents: [
        oldSlotService,
        serviceEvent({
          id: 'post-install-rear-tire-service',
          partInstanceId: undefined,
          slotKey: 'rear_tire',
          typeKey: 'tire_inspection',
          dateIso: '2026-04-10',
          mileageMi: 1400,
          nextDueMileageMi: 1700,
        }),
      ],
    });

    const rearTireRow = rows.find((row) => row.slotKey === 'rear_tire');

    expect(rearTireRow?.latestService?.id).toBe('post-install-rear-tire-service');
  });

  it('returns null part details for empty slots', () => {
    const rows = deriveActiveSetup({
      bike: bike(),
      catalog: [chainCatalog()],
      instances: [instance()],
      installRecords: [installRecord()],
      serviceEvents: [],
      today,
    });

    const frontTireRow = rows.find((row) => row.slotKey === 'front_tire');

    expect(frontTireRow).toMatchObject({
      installRecord: null,
      instance: null,
      catalogItem: null,
      latestService: null,
      milesSinceInstall: null,
      urgency: 'unknown',
    });
  });

  it('classifies a 100 mi remaining chain wax on a 250 mi interval as soon, not ok', () => {
    const rows = deriveActiveSetup({
      bike: bike({ cachedOdometerMi: 900 }),
      catalog: [chainCatalog()],
      instances: [instance()],
      installRecords: [
        installRecord({
          installedAtMileageMi: 500,
          installedDateIso: '2026-03-01',
        }),
      ],
      serviceEvents: [
        serviceEvent({
          typeKey: 'chain_wax',
          intervalMi: 250,
          mileageMi: 750,
          nextDueMileageMi: 1000,
        }),
      ],
      today,
    });

    const chainRow = rows.find((row) => row.slotKey === 'chain');

    expect(chainRow?.urgency).toBe('soon');
  });

  it('keeps empty slots unknown when stale slot-level service exists', () => {
    const rows = deriveActiveSetup({
      bike: bike({ cachedOdometerMi: 1200 }),
      catalog: [chainCatalog()],
      instances: [instance()],
      installRecords: [installRecord()],
      serviceEvents: [
        serviceEvent({
          id: 'stale-front-tire-service',
          partInstanceId: undefined,
          slotKey: 'front_tire',
          typeKey: 'tire_inspection',
          nextDueMileageMi: 1100,
        }),
      ],
      today,
    });

    const frontTireRow = rows.find((row) => row.slotKey === 'front_tire');

    expect(frontTireRow).toMatchObject({
      installRecord: null,
      latestService: null,
      urgency: 'unknown',
    });
  });
});

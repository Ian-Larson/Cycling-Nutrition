import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type AppState } from '@/store';
import {
  APP_STATE_SCHEMA_VERSION,
  parseSerializedAppState,
  serializeAppState,
} from './app-state';

const baseState: Pick<
  AppState,
  | 'bottleCounts'
  | 'products'
  | 'fuelPlans'
  | 'settings'
  | 'plannerDraft'
  | 'bikes'
  | 'serviceEntries'
  | 'gearPartCatalog'
  | 'gearPartInstances'
  | 'gearInstallRecords'
  | 'gearServiceEvents'
> = {
  bottleCounts: { 550: 0, 750: 1, 950: 0 },
  products: [
    {
      id: 'mix-1',
      name: 'Mix',
      type: 'drink_mix',
      isAvailable: true,
      nutrition: { carbsGrams: 60, calories: 240 },
      serving: {},
      createdAt: 3,
      updatedAt: 4,
    },
  ],
  fuelPlans: [],
  settings: {
    ...DEFAULT_SETTINGS,
    athleteProfile: {
      ...DEFAULT_SETTINGS.athleteProfile,
      ftpWatts: 280,
      weightKg: 72,
    },
  },
  plannerDraft: null,
  bikes: [],
  serviceEntries: [],
  gearPartCatalog: [],
  gearPartInstances: [],
  gearInstallRecords: [],
  gearServiceEvents: [],
};

describe('cloud app-state snapshots', () => {
  it('serializes local app data into a versioned snapshot', () => {
    const snapshot = serializeAppState(baseState, new Date('2026-04-16T12:00:00Z'));

    expect(snapshot.schemaVersion).toBe(APP_STATE_SCHEMA_VERSION);
    expect(snapshot.clientUpdatedAt).toBe('2026-04-16T12:00:00.000Z');
    expect(snapshot.data.bottleCounts).toEqual({ 550: 0, 750: 1, 950: 0 });
    expect(snapshot.data.products[0].nutrition.calories).toBe(240);
    expect(snapshot.data.settings.athleteProfile.ftpWatts).toBe(280);
  });

  it('serializes gear hub v2 data into a schema version 2 snapshot', () => {
    const snapshot = serializeAppState(
      {
        ...baseState,
        gearPartCatalog: [
          {
            id: 'catalog-chain',
            category: 'chain',
            brand: 'Shimano',
            model: 'CN-M8100',
            attributes: { category: 'chain', speedCount: 12 },
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        gearPartInstances: [
          {
            id: 'chain-1',
            catalogItemId: 'catalog-chain',
            label: 'Chain 1',
            status: 'installed',
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        gearInstallRecords: [
          {
            id: 'install-1',
            bikeId: 'bike-1',
            partInstanceId: 'chain-1',
            slotKey: 'chain',
            installedAtMileageMi: 1800,
            installedDateIso: '2026-04-18',
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        gearServiceEvents: [
          {
            id: 'service-1',
            bikeId: 'bike-1',
            partInstanceId: 'chain-1',
            typeKey: 'chain_wax',
            dateIso: '2026-04-18',
            mileageMi: 1800,
            intervalMi: 250,
            nextDueMileageMi: 2050,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      },
      new Date('2026-04-18T12:00:00Z')
    );

    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.data.gearPartCatalog).toHaveLength(1);
    expect(snapshot.data.gearPartInstances).toHaveLength(1);
    expect(snapshot.data.gearInstallRecords).toHaveLength(1);
    expect(snapshot.data.gearServiceEvents).toHaveLength(1);
  });

  it('parses and normalizes a valid cloud snapshot', () => {
    const snapshot = serializeAppState(baseState);
    const parsed = parseSerializedAppState(
      {
        ...snapshot,
        data: {
          ...snapshot.data,
          products: [
            {
              ...snapshot.data.products[0],
              nutrition: { carbsGrams: 50 },
            },
          ],
        },
      },
      snapshot.data
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.snapshot.data.products[0].nutrition.calories).toBe(200);
    }
  });

  it('migrates schema version 1 snapshots to version 2 with empty gear arrays', () => {
    const parsed = parseSerializedAppState(
      {
        schemaVersion: 1,
        clientUpdatedAt: '2026-04-16T12:00:00.000Z',
        data: {
          bottleCounts: { 550: 0, 750: 1, 950: 0 },
          products: baseState.products,
          fuelPlans: baseState.fuelPlans,
          settings: baseState.settings,
          plannerDraft: {
            ride: {
              durationMinutes: 120,
              intensity: 'endurance',
              heatFactor: 'moderate',
              carbTargetGramsPerHour: 75,
            },
            selectedBottleCounts: { 550: 0, 750: 1, 950: 0 },
            selectedDrinkMixId: 'mix-1',
            selectedSolidIds: [],
            includeUnavailableProducts: false,
          },
          bikes: [
            {
              id: 'bike-1',
              name: 'Force E1',
              stravaGearId: null,
              cachedOdometerMi: 1800,
              odometerSyncedAtIso: null,
              isPrimary: true,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
          serviceEntries: [
            {
              id: 'service-entry-1',
              bikeId: 'bike-1',
              typeKey: 'chain_wax',
              dateIso: '2026-04-16',
              mileageMi: 1800,
              intervalMi: 250,
              serviceAtMi: 2050,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        },
      },
      baseState
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.snapshot.schemaVersion).toBe(APP_STATE_SCHEMA_VERSION);
      expect(parsed.snapshot.clientUpdatedAt).toBe('2026-04-16T12:00:00.000Z');
      expect(parsed.snapshot.data.bottleCounts).toEqual({ 550: 0, 750: 1, 950: 0 });
      expect(parsed.snapshot.data.products[0].name).toBe('Mix');
      expect(parsed.snapshot.data.settings.athleteProfile.ftpWatts).toBe(280);
      expect(parsed.snapshot.data.plannerDraft?.ride.durationMinutes).toBe(120);
      expect(parsed.snapshot.data.bikes).toMatchObject([
        {
          id: 'bike-1',
          name: 'Force E1',
          cachedOdometerMi: 1800,
        },
      ]);
      expect(parsed.snapshot.data.serviceEntries).toEqual([]);
      expect(parsed.snapshot.data.gearPartCatalog).toEqual([]);
      expect(parsed.snapshot.data.gearPartInstances).toEqual([]);
      expect(parsed.snapshot.data.gearInstallRecords).toEqual([]);
      expect(parsed.snapshot.data.gearServiceEvents).toEqual([]);
    }
  });

  it('rejects unsupported snapshot versions', () => {
    const snapshot = serializeAppState(baseState);
    const parsed = parseSerializedAppState(
      { ...snapshot, schemaVersion: 999 },
      snapshot.data
    );

    expect(parsed.ok).toBe(false);
  });
});

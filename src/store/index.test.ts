import { beforeEach, describe, expect, it } from 'vitest';
import { getReadinessFromState, normalizeProducts, type Settings } from './index';
import type { Product } from '@/types';
import { useStore } from './index';

const baseSettings: Settings = {
  temperatureUnit: 'celsius',
  athleteProfile: {
    anthropometricsUnit: 'metric',
    heavySweater: false,
    gutTrainingTargetGph: 65,
  },
};

describe('normalizeProducts', () => {
  it('defaults product availability to true during migration', () => {
    const migrated = normalizeProducts(
      [
        {
          id: 'p1',
          name: 'Legacy Mix',
          type: 'drink_mix',
          nutrition: { carbsGrams: 60 },
          serving: {},
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      []
    );

    expect(migrated).toHaveLength(1);
    expect(migrated[0].isAvailable).toBe(true);
    expect(migrated[0].nutrition.calories).toBe(240);
  });
});

describe('getReadinessFromState', () => {
  it('reports setup and profile readiness fields', () => {
    const products: Product[] = [
      {
        id: 'mix',
        name: 'Mix',
        type: 'drink_mix',
        isAvailable: true,
        nutrition: { carbsGrams: 60, calories: 240 },
        serving: {},
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'gel',
        name: 'Gel',
        type: 'gel',
        isAvailable: true,
        nutrition: { carbsGrams: 25, calories: 100 },
        serving: {},
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const settings: Settings = {
      ...baseSettings,
      athleteProfile: {
        ...baseSettings.athleteProfile,
        ftpWatts: 280,
        weightKg: 72,
        age: 35,
      },
    };

    const readiness = getReadinessFromState({ products, settings });

    expect(readiness.autoReady).toBe(true);
    expect(readiness.availableSolidCount).toBe(1);
    expect(readiness.profileCompletionPercent).toBe(100);
    expect(readiness.missingProfileFields).toEqual([]);
  });

  it('flags missing profile requirements', () => {
    const products: Product[] = [
      {
        id: 'mix',
        name: 'Mix',
        type: 'drink_mix',
        isAvailable: false,
        nutrition: { carbsGrams: 60, calories: 240 },
        serving: {},
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const readiness = getReadinessFromState({
      products,
      settings: baseSettings,
    });

    expect(readiness.autoReady).toBe(false);
    expect(readiness.profileCompletionPercent).toBeLessThan(100);
    expect(readiness.missingProfileFields).toContain('FTP');
  });
});

describe('bikes slice', () => {
  beforeEach(() => {
    useStore.setState({ bikes: [], serviceEntries: [] });
  });

  it('addBike appends with generated id and marks first bike primary', () => {
    useStore.getState().addBike({ name: 'Force E1', stravaGearId: 'b1', cachedOdometerMi: 1800 });
    const bikes = useStore.getState().bikes;
    expect(bikes).toHaveLength(1);
    expect(bikes[0].id).toBeTruthy();
    expect(bikes[0].isPrimary).toBe(true);
  });

  it('setPrimaryBike enforces exactly one primary', () => {
    useStore.getState().addBike({ name: 'Force E1', stravaGearId: 'b1', cachedOdometerMi: 1800 });
    useStore.getState().addBike({ name: 'Allied ABLE', stravaGearId: 'b2', cachedOdometerMi: 600 });
    const [a, b] = useStore.getState().bikes;
    useStore.getState().setPrimaryBike(b.id);
    const after = useStore.getState().bikes;
    expect(after.find((x) => x.id === b.id)!.isPrimary).toBe(true);
    expect(after.find((x) => x.id === a.id)!.isPrimary).toBe(false);
  });

  it('deleteBike removes its service entries', () => {
    useStore.getState().addBike({ name: 'Force E1', stravaGearId: null, cachedOdometerMi: 0 });
    const bikeId = useStore.getState().bikes[0].id;
    useStore.getState().addServiceEntry({
      bikeId, typeKey: 'chain_wax', dateIso: '2026-04-17', mileageMi: 1800, intervalMi: 250,
    });
    useStore.getState().deleteBike(bikeId);
    expect(useStore.getState().bikes).toHaveLength(0);
    expect(useStore.getState().serviceEntries).toHaveLength(0);
  });

  it('upsertBikesFromStrava adds new and updates odometer on existing', () => {
    useStore.getState().upsertBikesFromStrava([
      { stravaGearId: 'b1', name: 'Force E1', odometerMi: 1800, isPrimary: true },
    ]);
    expect(useStore.getState().bikes).toHaveLength(1);

    useStore.getState().upsertBikesFromStrava([
      { stravaGearId: 'b1', name: 'Force E1', odometerMi: 1855, isPrimary: true },
      { stravaGearId: 'b2', name: 'Allied ABLE', odometerMi: 600, isPrimary: false },
    ]);
    const bikes = useStore.getState().bikes;
    expect(bikes).toHaveLength(2);
    expect(bikes.find((b) => b.stravaGearId === 'b1')!.cachedOdometerMi).toBe(1855);
  });
});

describe('serviceEntries slice', () => {
  beforeEach(() => {
    useStore.setState({ bikes: [], serviceEntries: [] });
    useStore.getState().addBike({ name: 'Force E1', stravaGearId: null, cachedOdometerMi: 1800 });
  });

  it('addServiceEntry computes serviceAtMi = mileage + interval', () => {
    const bikeId = useStore.getState().bikes[0].id;
    useStore.getState().addServiceEntry({
      bikeId, typeKey: 'chain_wax', dateIso: '2026-04-17', mileageMi: 1800, intervalMi: 250,
    });
    const e = useStore.getState().serviceEntries[0];
    expect(e.serviceAtMi).toBe(2050);
  });
});

describe('gear hub v2 slice', () => {
  beforeEach(() => {
    useStore.setState({
      bikes: [],
      gearPartCatalog: [],
      gearPartInstances: [],
      gearInstallRecords: [],
      gearServiceEvents: [],
    });
    useStore.getState().addBike({
      name: 'Force E1',
      stravaGearId: null,
      cachedOdometerMi: 1800,
    });
  });

  function addChainCatalogItem() {
    return useStore.getState().addGearPartCatalogItem({
      category: 'chain',
      brand: 'Shimano',
      model: 'CN-M8100',
      attributes: { category: 'chain', speedCount: 12 },
    });
  }

  function addTireCatalogItem() {
    return useStore.getState().addGearPartCatalogItem({
      category: 'tire',
      brand: 'Continental',
      model: 'GP5000 S TR',
      attributes: { category: 'tire', widthMm: 30, tubelessReady: true },
    });
  }

  it('addGearPartCatalogItem creates a catalog item and returns its id', () => {
    const id = addChainCatalogItem();

    expect(id).toBeTruthy();
    expect(useStore.getState().gearPartCatalog).toMatchObject([
      {
        id,
        category: 'chain',
        brand: 'Shimano',
        model: 'CN-M8100',
        attributes: { category: 'chain', speedCount: 12 },
      },
    ]);
  });

  it('addGearPartInstances creates spare instances from a catalog item and returns ids', () => {
    const catalogItemId = addChainCatalogItem();

    const ids = useStore.getState().addGearPartInstances({
      catalogItemId,
      quantity: 2,
      labelPrefix: 'Chain',
      acquiredDateIso: '2026-04-18',
      notes: 'Waxed before storage',
    });

    expect(ids).toHaveLength(2);
    expect(useStore.getState().gearPartInstances).toMatchObject([
      {
        id: ids[0],
        catalogItemId,
        label: 'Chain 1',
        status: 'spare',
        acquiredDateIso: '2026-04-18',
        notes: 'Waxed before storage',
      },
      {
        id: ids[1],
        catalogItemId,
        label: 'Chain 2',
        status: 'spare',
      },
    ]);
  });

  it('installGearPart installs a compatible spare into an empty slot', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const catalogItemId = addChainCatalogItem();
    const [partInstanceId] = useStore.getState().addGearPartInstances({
      catalogItemId,
      quantity: 1,
    });

    const installRecordId = useStore.getState().installGearPart({
      bikeId,
      partInstanceId,
      slotKey: 'chain',
      installedAtMileageMi: 1800,
      installedDateIso: '2026-04-18',
    });

    expect(installRecordId).toBeTruthy();
    expect(useStore.getState().gearInstallRecords).toMatchObject([
      {
        id: installRecordId,
        bikeId,
        partInstanceId,
        slotKey: 'chain',
        installedAtMileageMi: 1800,
        installedDateIso: '2026-04-18',
      },
    ]);
    expect(useStore.getState().gearPartInstances[0].status).toBe('installed');
  });

  it('installGearPart throws when the catalog category is incompatible with the slot', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const catalogItemId = addTireCatalogItem();
    const [partInstanceId] = useStore.getState().addGearPartInstances({
      catalogItemId,
      quantity: 1,
    });

    expect(() =>
      useStore.getState().installGearPart({
        bikeId,
        partInstanceId,
        slotKey: 'chain',
        installedAtMileageMi: 1800,
        installedDateIso: '2026-04-18',
      })
    ).toThrow(/compatible/i);
  });

  it('removeGearPart completes the active install record and marks the instance removed', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const catalogItemId = addChainCatalogItem();
    const [partInstanceId] = useStore.getState().addGearPartInstances({
      catalogItemId,
      quantity: 1,
    });
    const installRecordId = useStore.getState().installGearPart({
      bikeId,
      partInstanceId,
      slotKey: 'chain',
      installedAtMileageMi: 1800,
      installedDateIso: '2026-04-18',
    });

    useStore.getState().removeGearPart({
      installRecordId,
      removedAtMileageMi: 2050,
      removedDateIso: '2026-05-01',
      removeReason: 'swapped',
      nextStatus: 'removed',
    });

    expect(useStore.getState().gearInstallRecords[0]).toMatchObject({
      id: installRecordId,
      removedAtMileageMi: 2050,
      removedDateIso: '2026-05-01',
      removeReason: 'swapped',
    });
    expect(useStore.getState().gearPartInstances[0]).toMatchObject({
      id: partInstanceId,
      status: 'removed',
      retiredDateIso: undefined,
    });
  });

  it('removeGearPart marks retired instances with retiredDateIso', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const catalogItemId = addChainCatalogItem();
    const [partInstanceId] = useStore.getState().addGearPartInstances({
      catalogItemId,
      quantity: 1,
    });
    const installRecordId = useStore.getState().installGearPart({
      bikeId,
      partInstanceId,
      slotKey: 'chain',
      installedAtMileageMi: 1800,
      installedDateIso: '2026-04-18',
    });

    useStore.getState().removeGearPart({
      installRecordId,
      removedAtMileageMi: 2050,
      removedDateIso: '2026-05-01',
      nextStatus: 'retired',
    });

    expect(useStore.getState().gearPartInstances[0]).toMatchObject({
      id: partInstanceId,
      status: 'retired',
      retiredDateIso: '2026-05-01',
    });
  });

  it('logGearServiceEvent computes next due mileage and date from intervals', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const eventId = useStore.getState().logGearServiceEvent({
      bikeId,
      typeKey: 'chain_wax',
      dateIso: '2026-04-18',
      mileageMi: 1800,
      intervalMi: 250,
      intervalDays: 14,
      notes: 'Hot wax',
    });

    expect(eventId).toBeTruthy();
    expect(useStore.getState().gearServiceEvents).toMatchObject([
      {
        id: eventId,
        bikeId,
        typeKey: 'chain_wax',
        dateIso: '2026-04-18',
        mileageMi: 1800,
        intervalMi: 250,
        intervalDays: 14,
        nextDueMileageMi: 2050,
        nextDueDateIso: '2026-05-02',
      },
    ]);
  });
});

describe('gearSelectedBikeId', () => {
  beforeEach(() => {
    useStore.setState({ gearSelectedBikeId: null });
  });

  it('defaults to null and is updated via setGearSelectedBikeId', () => {
    expect(useStore.getState().gearSelectedBikeId).toBe(null);
    useStore.getState().setGearSelectedBikeId('bike-123');
    expect(useStore.getState().gearSelectedBikeId).toBe('bike-123');
    useStore.getState().setGearSelectedBikeId(null);
    expect(useStore.getState().gearSelectedBikeId).toBe(null);
  });
});

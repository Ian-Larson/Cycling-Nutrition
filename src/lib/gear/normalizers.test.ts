import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeGearInstallRecords,
  normalizeGearPartCatalog,
  normalizeGearPartInstances,
  normalizeGearServiceEvents,
} from './normalizers';

describe('gear normalizers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty arrays for non-array garbage input', () => {
    expect(normalizeGearPartCatalog(null)).toEqual([]);
    expect(normalizeGearPartInstances({})).toEqual([]);
    expect(normalizeGearInstallRecords('nope')).toEqual([]);
    expect(normalizeGearServiceEvents(undefined)).toEqual([]);
  });

  it('preserves valid tire catalog items and drops invalid tires without width', () => {
    const result = normalizeGearPartCatalog([
      {
        id: 'part-1',
        category: 'tire',
        brand: 'Continental',
        model: 'GP5000 S TR',
        weightGrams: 280,
        attributes: { category: 'tire', widthMm: 28, tubelessReady: true },
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: 'part-2',
        category: 'tire',
        model: 'Missing width',
        attributes: { category: 'tire' },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'part-1',
      model: 'GP5000 S TR',
      attributes: { category: 'tire', widthMm: 28, tubelessReady: true },
    });
  });

  it('trims catalog fields and defaults missing timestamps', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);

    const result = normalizeGearPartCatalog([
      {
        id: 'part-1',
        category: 'cassette',
        brand: '  SRAM  ',
        model: '  Force XPLR  ',
        attributes: { category: 'cassette', range: ' 10-44 ' },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      brand: 'SRAM',
      model: 'Force XPLR',
      attributes: { category: 'cassette', range: '10-44' },
      createdAt: 123456,
      updatedAt: 123456,
    });
  });

  it('keeps catalog items when optional weight is malformed', () => {
    const result = normalizeGearPartCatalog([
      {
        id: 'part-1',
        category: 'tire',
        model: 'GP5000 S TR',
        weightGrams: -1,
        attributes: { category: 'tire', widthMm: 28 },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].weightGrams).toBeUndefined();
  });

  it('preserves known instance statuses and drops invalid statuses', () => {
    const result = normalizeGearPartInstances([
      {
        id: 'instance-1',
        catalogItemId: 'part-1',
        label: 'Rear GP5000 #1',
        status: 'spare',
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: 'instance-2',
        catalogItemId: 'part-1',
        status: 'lost',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('spare');
  });

  it('preserves active install records and drops negative mileage', () => {
    const result = normalizeGearInstallRecords([
      {
        id: 'install-1',
        bikeId: 'bike-1',
        partInstanceId: 'instance-1',
        slotKey: 'rear_tire',
        installedAtMileageMi: 100,
        installedDateIso: '2026-04-18',
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: 'install-2',
        bikeId: 'bike-1',
        partInstanceId: 'instance-2',
        slotKey: 'rear_tire',
        installedAtMileageMi: -1,
        installedDateIso: '2026-04-18',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'install-1',
      installedAtMileageMi: 100,
    });
    expect(result[0].removedAtMileageMi).toBeUndefined();
  });

  it('keeps install records when optional removal fields are malformed', () => {
    const result = normalizeGearInstallRecords([
      {
        id: 'install-1',
        bikeId: 'bike-1',
        partInstanceId: 'instance-1',
        slotKey: 'rear_tire',
        installedAtMileageMi: 100,
        installedDateIso: '2026-04-18',
        removedAtMileageMi: -1,
        removedDateIso: '2026-02-31',
        removeReason: 'not-a-reason',
        createdAt: 1,
        updatedAt: 2,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'install-1',
      removedAtMileageMi: undefined,
      removedDateIso: undefined,
      removeReason: undefined,
    });
  });

  it('preserves valid service events and drops bad dates', () => {
    const result = normalizeGearServiceEvents([
      {
        id: 'service-1',
        bikeId: 'bike-1',
        partInstanceId: 'instance-1',
        slotKey: 'chain',
        typeKey: 'chain_wax',
        dateIso: '2026-04-18',
        mileageMi: 100,
        intervalMi: 250,
        nextDueMileageMi: 350,
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: 'service-2',
        bikeId: 'bike-1',
        typeKey: 'chain_wax',
        dateIso: 'bad-date',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'service-1',
      dateIso: '2026-04-18',
      nextDueMileageMi: 350,
    });
  });

  it('keeps service events when optional service fields are malformed', () => {
    const result = normalizeGearServiceEvents([
      {
        id: 'service-1',
        bikeId: 'bike-1',
        typeKey: 'chain_wax',
        dateIso: '2026-04-18',
        mileageMi: -1,
        intervalMi: 0,
        intervalDays: -14,
        nextDueMileageMi: -10,
        nextDueDateIso: '2026-02-31',
        createdAt: 1,
        updatedAt: 2,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'service-1',
      dateIso: '2026-04-18',
      mileageMi: undefined,
      intervalMi: undefined,
      intervalDays: undefined,
      nextDueMileageMi: undefined,
      nextDueDateIso: undefined,
    });
  });

  it('drops impossible required dates and clears impossible optional dates', () => {
    const instances = normalizeGearPartInstances([
      {
        id: 'instance-1',
        catalogItemId: 'part-1',
        label: 'Rear GP5000 #1',
        status: 'spare',
        acquiredDateIso: '2026-02-31',
        createdAt: 1,
        updatedAt: 2,
      },
    ]);
    const serviceEvents = normalizeGearServiceEvents([
      {
        id: 'service-1',
        bikeId: 'bike-1',
        typeKey: 'chain_wax',
        dateIso: '2026-02-31',
        createdAt: 1,
        updatedAt: 2,
      },
    ]);

    expect(instances).toHaveLength(1);
    expect(instances[0].acquiredDateIso).toBeUndefined();
    expect(serviceEvents).toHaveLength(0);
  });

  it('drops cassette parts without range and chainrings without tooth count', () => {
    expect(
      normalizeGearPartCatalog([
        {
          id: 'part-1',
          category: 'cassette',
          model: 'Force XPLR',
          attributes: { category: 'cassette' },
        },
        {
          id: 'part-2',
          category: 'chainring',
          model: 'Chainring',
          attributes: { category: 'chainring' },
        },
      ])
    ).toHaveLength(0);
  });
});

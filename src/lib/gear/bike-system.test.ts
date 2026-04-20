import { describe, expect, it } from 'vitest';
import {
  formatDrivetrainSpeeds,
  formatGearRatioRange,
  formatMileage,
  formatOdometerSynced,
  formatWeightKg,
  getCassetteCogRange,
  getInstalledChainring,
  parseCassetteRange,
} from './bike-system';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
} from '@/types/gear';

const bike: Bike = {
  id: 'bike-1',
  name: 'Force E1',
  stravaGearId: null,
  cachedOdometerMi: 1800,
  odometerSyncedAtIso: null,
  isPrimary: true,
  createdAt: 0,
  updatedAt: 0,
};

function chainring(
  id: string,
  drivetrainType: '1x' | '2x',
  outerRing: number,
  innerRing?: number
): GearPartCatalogItem {
  return {
    id,
    category: 'chainring',
    model: 'Crankset',
    attributes: {
      category: 'chainring',
      drivetrainType,
      outerRing,
      innerRing: drivetrainType === '2x' ? innerRing : undefined,
    },
    createdAt: 0,
    updatedAt: 0,
  };
}

function cassette(id: string, range: string, speedCount?: number): GearPartCatalogItem {
  return {
    id,
    category: 'cassette',
    model: 'Cass',
    attributes: { category: 'cassette', range, speedCount },
    createdAt: 0,
    updatedAt: 0,
  };
}

function instance(id: string, catalogItemId: string): GearPartInstance {
  return {
    id,
    catalogItemId,
    status: 'installed',
    createdAt: 0,
    updatedAt: 0,
  };
}

function install(id: string, partInstanceId: string, slotKey: GearInstallRecord['slotKey']): GearInstallRecord {
  return {
    id,
    bikeId: 'bike-1',
    partInstanceId,
    slotKey,
    installedAtMileageMi: 0,
    installedDateIso: '2026-01-01',
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('parseCassetteRange', () => {
  it('parses "11-36"', () => {
    expect(parseCassetteRange('11-36')).toEqual({ smallest: 11, largest: 36 });
  });
  it('parses "10-36T" with trailing T', () => {
    expect(parseCassetteRange('10-36T')).toEqual({ smallest: 10, largest: 36 });
  });
  it('parses with en-dash', () => {
    expect(parseCassetteRange('11–34')).toEqual({ smallest: 11, largest: 34 });
  });
  it('returns null for garbage', () => {
    expect(parseCassetteRange('abc')).toBeNull();
    expect(parseCassetteRange('')).toBeNull();
    expect(parseCassetteRange(null)).toBeNull();
  });
});

describe('getInstalledChainring', () => {
  it('returns the 2x crankset with inner and outer rings', () => {
    const catalog = [chainring('cr-2x', '2x', 48, 35)];
    const instances = [instance('i-cr', 'cr-2x')];
    const installs = [install('in-cr', 'i-cr', 'chainrings')];
    expect(
      getInstalledChainring({ bike, installRecords: installs, instances, catalog })
    ).toEqual({ drivetrainType: '2x', outerRing: 48, innerRing: 35 });
  });

  it('returns the 1x crankset with no inner ring', () => {
    const catalog = [chainring('cr-1x', '1x', 42)];
    const instances = [instance('i-cr', 'cr-1x')];
    const installs = [install('in-cr', 'i-cr', 'chainrings')];
    expect(
      getInstalledChainring({ bike, installRecords: installs, instances, catalog })
    ).toEqual({ drivetrainType: '1x', outerRing: 42, innerRing: undefined });
  });

  it('excludes removed installs', () => {
    const catalog = [chainring('cr-a', '2x', 48, 35)];
    const instances = [instance('i-a', 'cr-a')];
    const removed: GearInstallRecord = {
      ...install('in-a', 'i-a', 'chainrings'),
      removedDateIso: '2026-04-01',
    };
    expect(
      getInstalledChainring({ bike, installRecords: [removed], instances, catalog })
    ).toBeNull();
  });

  it('returns null when no chainring installed', () => {
    expect(
      getInstalledChainring({ bike, installRecords: [], instances: [], catalog: [] })
    ).toBeNull();
  });
});

describe('getCassetteCogRange', () => {
  it('parses legacy range string', () => {
    const catalog = [cassette('cs-a', '10-36', 12)];
    const instances = [instance('i-cs', 'cs-a')];
    const installs = [install('in-cs', 'i-cs', 'cassette')];
    expect(
      getCassetteCogRange({ bike, installRecords: installs, instances, catalog })
    ).toEqual({ smallest: 10, largest: 36 });
  });

  it('prefers numeric fields over range string when present', () => {
    const item: GearPartCatalogItem = {
      id: 'cs-b',
      category: 'cassette',
      model: 'Cass',
      attributes: {
        category: 'cassette',
        range: '11-34',
        speedCount: 12,
        smallestCog: 10,
        largestCog: 36,
      } as never,
      createdAt: 0,
      updatedAt: 0,
    };
    const instances = [instance('i-cs', 'cs-b')];
    const installs = [install('in-cs', 'i-cs', 'cassette')];
    expect(
      getCassetteCogRange({ bike, installRecords: installs, instances, catalog: [item] })
    ).toEqual({ smallest: 10, largest: 36 });
  });

  it('returns null if no cassette installed', () => {
    expect(
      getCassetteCogRange({ bike, installRecords: [], instances: [], catalog: [] })
    ).toBeNull();
  });
});

describe('formatGearRatioRange', () => {
  it('formats 2x crankset (48/35) × 10-36 cassette', () => {
    expect(
      formatGearRatioRange(
        { drivetrainType: '2x', outerRing: 48, innerRing: 35 },
        { smallest: 10, largest: 36 }
      )
    ).toBe('0.97–4.80');
  });

  it('formats 1x crankset (42) × 10-36 cassette', () => {
    expect(
      formatGearRatioRange(
        { drivetrainType: '1x', outerRing: 42 },
        { smallest: 10, largest: 36 }
      )
    ).toBe('1.17–4.20');
  });

  it('falls back to outerRing when 2x is missing innerRing', () => {
    expect(
      formatGearRatioRange(
        { drivetrainType: '2x', outerRing: 48 },
        { smallest: 10, largest: 36 }
      )
    ).toBe('1.33–4.80');
  });

  it('returns null if chainring missing', () => {
    expect(formatGearRatioRange(null, { smallest: 10, largest: 36 })).toBeNull();
  });

  it('returns null if cassette missing', () => {
    expect(
      formatGearRatioRange({ drivetrainType: '1x', outerRing: 42 }, null)
    ).toBeNull();
  });
});

describe('formatDrivetrainSpeeds', () => {
  it('formats 2x × 12', () => {
    expect(
      formatDrivetrainSpeeds({ drivetrainType: '2x', outerRing: 48, innerRing: 35 }, 12)
    ).toBe('2 × 12');
  });
  it('formats 1x × 12', () => {
    expect(formatDrivetrainSpeeds({ drivetrainType: '1x', outerRing: 42 }, 12)).toBe('1 × 12');
  });
  it('reports 2x even when innerRing data is missing', () => {
    expect(
      formatDrivetrainSpeeds({ drivetrainType: '2x', outerRing: 48 }, 12)
    ).toBe('2 × 12');
  });
  it('returns null if speedCount missing', () => {
    expect(
      formatDrivetrainSpeeds({ drivetrainType: '1x', outerRing: 42 }, undefined)
    ).toBeNull();
  });
  it('returns null if chainring missing', () => {
    expect(formatDrivetrainSpeeds(null, 12)).toBeNull();
  });
});

describe('formatWeightKg', () => {
  it('formats grams to 2-decimal kg', () => {
    expect(formatWeightKg(8420)).toBe('8.42 kg');
  });
  it('returns null for null/undefined/invalid', () => {
    expect(formatWeightKg(null)).toBeNull();
    expect(formatWeightKg(undefined)).toBeNull();
    expect(formatWeightKg(0)).toBeNull();
    expect(formatWeightKg(Number.NaN)).toBeNull();
  });
});

describe('formatMileage', () => {
  it('formats with thousands separators and mi unit', () => {
    expect(formatMileage(1800)).toBe('1,800 mi');
    expect(formatMileage(0)).toBe('0 mi');
  });
  it('returns null for null/undefined', () => {
    expect(formatMileage(null)).toBeNull();
    expect(formatMileage(undefined)).toBeNull();
  });
});

describe('formatOdometerSynced', () => {
  const now = new Date('2026-04-20T12:00:00Z').getTime();

  it('returns "just now" for <1 min', () => {
    const iso = new Date(now - 29_000).toISOString();
    expect(formatOdometerSynced(iso, now)).toBe('just now');
  });

  it('returns "Xm ago" under an hour', () => {
    const iso = new Date(now - 15 * 60_000).toISOString();
    expect(formatOdometerSynced(iso, now)).toBe('15m ago');
  });

  it('returns "Xh ago" under a day', () => {
    const iso = new Date(now - 3 * 60 * 60_000).toISOString();
    expect(formatOdometerSynced(iso, now)).toBe('3h ago');
  });

  it('returns "Xd ago" over a day', () => {
    const iso = new Date(now - 5 * 24 * 60 * 60_000).toISOString();
    expect(formatOdometerSynced(iso, now)).toBe('5d ago');
  });

  it('returns "Never synced" when iso is null', () => {
    expect(formatOdometerSynced(null, now)).toBe('Never synced');
  });
});

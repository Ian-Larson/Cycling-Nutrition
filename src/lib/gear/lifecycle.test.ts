import { describe, expect, it } from 'vitest';
import {
  validateInstallDraft,
  validateRemoveDraft,
  validateServiceDraft,
} from './lifecycle';
import type { GearInstallRecord } from '@/types/gear';

const today = '2026-04-18';

const activeRecord = (overrides: Partial<GearInstallRecord> = {}): GearInstallRecord => ({
  id: 'install-1',
  bikeId: 'bike-1',
  partInstanceId: 'part-1',
  slotKey: 'chain',
  installedAtMileageMi: 500,
  installedDateIso: '2026-03-01',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe('lifecycle validation', () => {
  it('rejects invalid install mileage and future install date', () => {
    expect(
      validateInstallDraft(
        {
          bikeId: 'bike-1',
          partInstanceId: 'part-1',
          slotKey: 'chain',
          installedAtMileageMi: Number.POSITIVE_INFINITY,
          installedDateIso: '2026-04-19',
        },
        today
      )
    ).toMatchObject({
      installedAtMileageMi: 'Mileage must be a finite number greater than or equal to 0.',
      installedDateIso: 'Install date cannot be in the future.',
    });
  });

  it('rejects removal mileage before the active install mileage', () => {
    expect(
      validateRemoveDraft(
        {
          installRecordId: 'install-1',
          removedAtMileageMi: 499,
          removedDateIso: '2026-04-18',
        },
        activeRecord(),
        today
      )
    ).toMatchObject({
      removedAtMileageMi: 'Removal mileage cannot be before install mileage.',
    });
  });

  it('rejects non-positive service intervals', () => {
    expect(
      validateServiceDraft(
        {
          bikeId: 'bike-1',
          typeKey: 'chain_wax',
          dateIso: '2026-04-18',
          intervalMi: 0,
          intervalDays: -1,
        },
        today
      )
    ).toMatchObject({
      intervalMi: 'Mileage interval must be a finite number greater than 0.',
      intervalDays: 'Day interval must be a finite number greater than 0.',
    });
  });
});

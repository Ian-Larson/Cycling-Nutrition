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
  it('rejects installs missing bike, part instance, and slot', () => {
    expect(
      validateInstallDraft(
        {
          installedAtMileageMi: 0,
          installedDateIso: '2026-04-18',
        },
        today
      )
    ).toMatchObject({
      bikeId: 'Bike is required.',
      partInstanceId: 'Part instance is required.',
      slotKey: 'Slot is required.',
    });
  });

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

  it('rejects removes missing an install record id', () => {
    expect(
      validateRemoveDraft(
        {
          removedAtMileageMi: 500,
          removedDateIso: '2026-04-18',
        },
        activeRecord(),
        today
      )
    ).toMatchObject({
      installRecordId: 'Install record is required.',
    });
  });

  it('rejects removes without an active install record', () => {
    expect(
      validateRemoveDraft(
        {
          installRecordId: 'install-1',
          removedAtMileageMi: 500,
          removedDateIso: '2026-04-18',
        },
        undefined,
        today
      )
    ).toMatchObject({
      activeRecord: 'Active install record is required.',
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

  it('rejects future remove dates', () => {
    expect(
      validateRemoveDraft(
        {
          installRecordId: 'install-1',
          removedAtMileageMi: 500,
          removedDateIso: '2026-04-19',
        },
        activeRecord(),
        today
      )
    ).toMatchObject({
      removedDateIso: 'Remove date cannot be in the future.',
    });
  });

  it('rejects services missing bike and type', () => {
    expect(
      validateServiceDraft(
        {
          dateIso: '2026-04-18',
        },
        today
      )
    ).toMatchObject({
      bikeId: 'Bike is required.',
      typeKey: 'Service type is required.',
    });
  });

  it('rejects future service dates', () => {
    expect(
      validateServiceDraft(
        {
          bikeId: 'bike-1',
          typeKey: 'chain_wax',
          dateIso: '2026-04-19',
        },
        today
      )
    ).toMatchObject({
      dateIso: 'Service date cannot be in the future.',
    });
  });

  it('rejects negative and non-finite optional service mileage', () => {
    expect(
      validateServiceDraft(
        {
          bikeId: 'bike-1',
          typeKey: 'chain_wax',
          dateIso: '2026-04-18',
          mileageMi: -1,
        },
        today
      )
    ).toMatchObject({
      mileageMi: 'Mileage must be a finite number greater than or equal to 0.',
    });

    expect(
      validateServiceDraft(
        {
          bikeId: 'bike-1',
          typeKey: 'chain_wax',
          dateIso: '2026-04-18',
          mileageMi: Number.NaN,
        },
        today
      )
    ).toMatchObject({
      mileageMi: 'Mileage must be a finite number greater than or equal to 0.',
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

  it('rejects non-finite optional service intervals', () => {
    expect(
      validateServiceDraft(
        {
          bikeId: 'bike-1',
          typeKey: 'chain_wax',
          dateIso: '2026-04-18',
          intervalMi: Number.POSITIVE_INFINITY,
          intervalDays: Number.NaN,
        },
        today
      )
    ).toMatchObject({
      intervalMi: 'Mileage interval must be a finite number greater than 0.',
      intervalDays: 'Day interval must be a finite number greater than 0.',
    });
  });
});

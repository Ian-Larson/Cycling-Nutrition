import { describe, it, expect } from 'vitest';
import {
  validateServiceEntryDraft,
  type ServiceEntryDraft,
} from '../validate-service-entry';
import type { ServiceEntry } from '@/types/gear';

const TODAY = new Date('2026-04-17T12:00:00Z');

function makeDraft(overrides: Partial<ServiceEntryDraft> = {}): ServiceEntryDraft {
  return {
    bikeId: 'bike-1',
    typeKey: 'chain_wax',
    dateIso: '2026-04-17',
    mileageMi: 1000,
    intervalMi: 250,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ServiceEntry> = {}): ServiceEntry {
  const base: ServiceEntry = {
    id: 'e1',
    bikeId: 'bike-1',
    typeKey: 'chain_wax',
    dateIso: '2026-04-01',
    mileageMi: 800,
    intervalMi: 250,
    serviceAtMi: 1050,
    createdAt: 1000,
    updatedAt: 1000,
  };
  return { ...base, ...overrides };
}

describe('validateServiceEntryDraft', () => {
  it('returns no errors for a valid draft', () => {
    const errors = validateServiceEntryDraft(makeDraft(), [], TODAY);
    expect(errors).toEqual({});
  });

  it('flags a missing bikeId', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ bikeId: '' }),
      [],
      TODAY
    );
    expect(errors.bikeId).toBe('Choose a bike.');
  });

  it('flags a zero interval', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ intervalMi: 0 }),
      [],
      TODAY
    );
    expect(errors.intervalMi).toBe('Interval must be greater than 0.');
  });

  it('flags a negative interval', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ intervalMi: -5 }),
      [],
      TODAY
    );
    expect(errors.intervalMi).toBe('Interval must be greater than 0.');
  });

  it('flags a non-finite interval', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ intervalMi: Number.NaN }),
      [],
      TODAY
    );
    expect(errors.intervalMi).toBe('Interval must be greater than 0.');
  });

  it('flags a future date', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ dateIso: '2026-04-18' }),
      [],
      TODAY
    );
    expect(errors.dateIso).toBe("Date can't be in the future.");
  });

  it("accepts today's date", () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ dateIso: '2026-04-17' }),
      [],
      TODAY
    );
    expect(errors.dateIso).toBeUndefined();
  });

  it('flags mileage below the latest entry for the same bike+type', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ mileageMi: 700 }),
      [makeEntry({ mileageMi: 800 })],
      TODAY
    );
    expect(errors.mileageMi).toBe(
      'Mileage must be ≥ your last logged mileage (800)'
    );
  });

  it('accepts mileage equal to the latest entry', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ mileageMi: 800 }),
      [makeEntry({ mileageMi: 800 })],
      TODAY
    );
    expect(errors.mileageMi).toBeUndefined();
  });

  it('does not cross-check mileage across different bikes', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ bikeId: 'bike-1', mileageMi: 200 }),
      [makeEntry({ bikeId: 'bike-2', mileageMi: 5000 })],
      TODAY
    );
    expect(errors.mileageMi).toBeUndefined();
  });

  it('does not cross-check mileage across different service types on the same bike', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ typeKey: 'chain_wax', mileageMi: 200 }),
      [makeEntry({ typeKey: 'tires', mileageMi: 5000 })],
      TODAY
    );
    expect(errors.mileageMi).toBeUndefined();
  });

  it('accepts any non-negative mileage when there are no prior entries', () => {
    const errors = validateServiceEntryDraft(
      makeDraft({ mileageMi: 0 }),
      [],
      TODAY
    );
    expect(errors.mileageMi).toBeUndefined();
  });

  it('uses the latest entry by dateIso, then createdAt', () => {
    // Two entries with the same dateIso; newer createdAt wins.
    const errors = validateServiceEntryDraft(
      makeDraft({ mileageMi: 900 }),
      [
        makeEntry({ id: 'a', dateIso: '2026-04-10', mileageMi: 800, createdAt: 1 }),
        makeEntry({ id: 'b', dateIso: '2026-04-10', mileageMi: 1000, createdAt: 2 }),
      ],
      TODAY
    );
    expect(errors.mileageMi).toBe(
      'Mileage must be ≥ your last logged mileage (1000)'
    );
  });
});

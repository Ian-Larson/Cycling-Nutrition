import type { ServiceEntry, ServiceTypeKey } from '@/types/gear';

export interface ServiceEntryDraft {
  bikeId: string;
  typeKey: ServiceTypeKey;
  dateIso: string;
  mileageMi: number;
  intervalMi: number;
}

export interface ValidationErrors {
  mileageMi?: string;
  intervalMi?: string;
  dateIso?: string;
  bikeId?: string;
}

/**
 * Pure validator. `previousEntries` is the full list of entries; this function
 * filters internally to the same (bikeId, typeKey) pair and uses the latest
 * `mileageMi` on that pair as the monotonicity floor.
 */
export function validateServiceEntryDraft(
  draft: ServiceEntryDraft,
  previousEntries: ServiceEntry[],
  today: Date
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!draft.bikeId) {
    errors.bikeId = 'Choose a bike.';
  }

  if (!Number.isFinite(draft.intervalMi) || draft.intervalMi <= 0) {
    errors.intervalMi = 'Interval must be greater than 0.';
  }

  const todayIso = today.toISOString().slice(0, 10);
  if (draft.dateIso > todayIso) {
    errors.dateIso = "Date can't be in the future.";
  }

  if (!Number.isFinite(draft.mileageMi) || draft.mileageMi < 0) {
    errors.mileageMi = 'Enter a mileage.';
  } else {
    const sameTarget = previousEntries
      .filter((e) => e.bikeId === draft.bikeId && e.typeKey === draft.typeKey)
      .sort((a, b) => {
        if (a.dateIso !== b.dateIso) return a.dateIso < b.dateIso ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
    const latest = sameTarget[0];
    if (latest && draft.mileageMi < latest.mileageMi) {
      errors.mileageMi = `Mileage must be ≥ your last logged mileage (${latest.mileageMi})`;
    }
  }

  return errors;
}

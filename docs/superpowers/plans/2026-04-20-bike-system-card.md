# Bike System Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact "Bike system" summary card to the left sidebar of the Gear page. The card shows the selected bike's key specs in a dot-leader row pattern (label ······· value): mileage, user-entered total weight, computed gear-ratio range, odometer sync freshness, and a primary-bike indicator.

**Architecture:** A new `BikeSystemCard` component renders a stack of `SystemSpecRow` dot-leader rows inside the existing `Card` primitive. Pure helpers in `src/lib/gear/bike-system.ts` compute the installed-parts summary (chainring tooth counts, cassette smallest/largest cogs, gear-ratio range). The helpers tolerate in-flight cassette shape changes by preferring numeric attributes when present and falling back to parsing the legacy `range: string` ("11-36"). Weight is a new **optional** `totalWeightGrams` field on `Bike`, edited via a minimal dialog that calls the existing `updateBike(id, updates)` store action.

**Tech Stack:** React 19, TypeScript, Zustand store (existing), Tailwind v4, existing `Card`/`CardContent` primitives, Vitest for unit tests.

**Upstream context:** The chainring schema was just redesigned to represent a whole crankset in one catalog record with `drivetrainType: '1x' | '2x'`, `outerRing: number`, and optional `innerRing: number` (commit 10db931). The normalizer migrates legacy `toothCount` → `outerRing`, so mixed states don't need to be handled. Cassette still has `range: string` — Task 2's helper reads that and also checks for future numeric `smallestCog`/`largestCog` fields, so if cassette is restructured later the helper keeps working.

**Files:**
- Create:
  - `src/lib/gear/bike-system.ts`
  - `src/lib/gear/bike-system.test.ts`
  - `src/components/gear/bike-system-card.tsx`
  - `src/components/gear/system-spec-row.tsx`
  - `src/components/gear/edit-bike-weight-dialog.tsx`
- Modify:
  - `src/types/gear.ts` — add optional `totalWeightGrams?: number` to `Bike`
  - `src/pages/gear.tsx` — mount `<BikeSystemCard>` in the sidebar below `<BikePillRow>`

---

### Task 1: Add optional `totalWeightGrams` field to the `Bike` type

**Files:**
- Modify: `src/types/gear.ts:1-10`

Rationale: Optional field is migration-safe — existing persisted bikes parse without errors. No store action changes needed; the generic `updateBike(id, updates: Partial<Bike>)` already accepts any subset.

- [ ] **Step 1: Edit `src/types/gear.ts` — add the field**

Change the `Bike` interface to:

```typescript
export interface Bike {
  id: string;
  name: string;
  stravaGearId: string | null;
  cachedOdometerMi: number | null;
  odometerSyncedAtIso: string | null;
  isPrimary: boolean;
  totalWeightGrams?: number;
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run build`
Expected: build completes without TypeScript errors. No existing callsites should break because the field is optional.

- [ ] **Step 3: Commit**

```bash
git add src/types/gear.ts
git commit -m "feat(gear): add optional totalWeightGrams field to Bike"
```

---

### Task 2: Write pure gear-system helpers

**Files:**
- Create: `src/lib/gear/bike-system.ts`

These helpers compute the displayable summary values. Keeping them pure and decoupled from components makes them easy to test and swap if the cassette shape changes.

- [ ] **Step 1: Create `src/lib/gear/bike-system.ts`**

```typescript
import type {
  Bike,
  CassetteAttributes,
  ChainringAttributes,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
} from '@/types/gear';

export interface BikeSystemInputs {
  bike: Bike;
  installRecords: GearInstallRecord[];
  instances: GearPartInstance[];
  catalog: GearPartCatalogItem[];
}

/**
 * An install record counts as "active" when it has no removedDateIso.
 * Only active installs for this bike contribute to the system summary.
 */
function activeInstallsForBike(
  bikeId: string,
  installRecords: GearInstallRecord[]
): GearInstallRecord[] {
  return installRecords.filter(
    (record) => record.bikeId === bikeId && record.removedDateIso === undefined
  );
}

function catalogForInstall(
  install: GearInstallRecord,
  instances: GearPartInstance[],
  catalog: GearPartCatalogItem[]
): GearPartCatalogItem | null {
  const instance = instances.find((i) => i.id === install.partInstanceId);
  if (!instance) return null;
  return catalog.find((c) => c.id === instance.catalogItemId) ?? null;
}

export interface ChainringSummary {
  drivetrainType: '1x' | '2x';
  outerRing: number;
  innerRing?: number;
}

export function getInstalledChainring(inputs: BikeSystemInputs): ChainringSummary | null {
  for (const install of activeInstallsForBike(inputs.bike.id, inputs.installRecords)) {
    const item = catalogForInstall(install, inputs.instances, inputs.catalog);
    if (!item || item.attributes.category !== 'chainring') continue;
    const attrs = item.attributes as ChainringAttributes;
    if (!Number.isFinite(attrs.outerRing) || attrs.outerRing <= 0) continue;
    return {
      drivetrainType: attrs.drivetrainType,
      outerRing: attrs.outerRing,
      innerRing:
        attrs.drivetrainType === '2x' &&
        typeof attrs.innerRing === 'number' &&
        Number.isFinite(attrs.innerRing) &&
        attrs.innerRing > 0
          ? attrs.innerRing
          : undefined,
    };
  }
  return null;
}

/**
 * Extract cassette smallest/largest cog counts. Prefers numeric attribute
 * fields when present (to support an upcoming shape change), falls back
 * to parsing the legacy `range: string` format like "11-36".
 */
export function getCassetteCogRange(
  inputs: BikeSystemInputs
): { smallest: number; largest: number } | null {
  for (const install of activeInstallsForBike(inputs.bike.id, inputs.installRecords)) {
    const item = catalogForInstall(install, inputs.instances, inputs.catalog);
    if (!item || item.attributes.category !== 'cassette') continue;
    const attrs = item.attributes as CassetteAttributes & {
      smallestCog?: number;
      largestCog?: number;
    };

    if (
      typeof attrs.smallestCog === 'number' &&
      typeof attrs.largestCog === 'number' &&
      Number.isFinite(attrs.smallestCog) &&
      Number.isFinite(attrs.largestCog) &&
      attrs.smallestCog > 0 &&
      attrs.largestCog > 0
    ) {
      return {
        smallest: Math.min(attrs.smallestCog, attrs.largestCog),
        largest: Math.max(attrs.smallestCog, attrs.largestCog),
      };
    }

    const parsed = parseCassetteRange(attrs.range);
    if (parsed) return parsed;
  }
  return null;
}

export function parseCassetteRange(
  range: string | undefined | null
): { smallest: number; largest: number } | null {
  if (!range) return null;
  const match = /^\s*(\d{1,2})\s*[-–]\s*(\d{2,3})\s*t?\s*$/i.exec(range);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return { smallest: Math.min(a, b), largest: Math.max(a, b) };
}

/**
 * Easiest ratio = smallest-available-ring / largest cog.
 * Hardest ratio = outerRing / smallest cog.
 * For 2x with an innerRing, the easiest side uses innerRing; for 1x (or
 * 2x missing innerRing) it uses outerRing.
 */
export function formatGearRatioRange(
  chainring: ChainringSummary | null,
  cassetteCogs: { smallest: number; largest: number } | null
): string | null {
  if (!chainring || !cassetteCogs) return null;
  const smallRing =
    chainring.drivetrainType === '2x' && chainring.innerRing !== undefined
      ? chainring.innerRing
      : chainring.outerRing;
  const largeRing = chainring.outerRing;
  const easiest = smallRing / cassetteCogs.largest;
  const hardest = largeRing / cassetteCogs.smallest;
  if (!Number.isFinite(easiest) || !Number.isFinite(hardest)) return null;
  if (Math.abs(easiest - hardest) < 0.005) {
    return easiest.toFixed(2);
  }
  return `${easiest.toFixed(2)}–${hardest.toFixed(2)}`;
}

export function formatDrivetrainSpeeds(
  chainring: ChainringSummary | null,
  cassetteSpeedCount: number | undefined
): string | null {
  if (!chainring) return null;
  if (!cassetteSpeedCount || !Number.isFinite(cassetteSpeedCount)) return null;
  const front = chainring.drivetrainType === '2x' && chainring.innerRing !== undefined ? 2 : 1;
  return `${front} × ${cassetteSpeedCount}`;
}

export function formatWeightKg(grams: number | null | undefined): string | null {
  if (grams === null || grams === undefined || !Number.isFinite(grams)) return null;
  if (grams <= 0) return null;
  return `${(grams / 1000).toFixed(2)} kg`;
}

export function formatMileage(miles: number | null | undefined): string | null {
  if (miles === null || miles === undefined || !Number.isFinite(miles)) return null;
  return `${Math.round(miles).toLocaleString()} mi`;
}

export function formatOdometerSynced(
  iso: string | null | undefined,
  now: number = Date.now()
): string {
  if (!iso) return 'Never synced';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Never synced';
  const diffMs = now - ts;
  if (diffMs < 0) return 'just now';
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/gear/bike-system.ts
git commit -m "feat(gear): add bike-system summary helpers"
```

---

### Task 3: Tests for the helpers

**Files:**
- Create: `src/lib/gear/bike-system.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
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
    const iso = new Date(now - 30_000).toISOString();
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
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `npx vitest run src/lib/gear/bike-system.test.ts`
Expected: all tests pass. If `formatGearRatioRange` values don't match, verify the math in Task 2 and correct either code or the expected values before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gear/bike-system.test.ts
git commit -m "test(gear): cover bike-system helpers"
```

---

### Task 4: Build the `SystemSpecRow` dot-leader primitive

**Files:**
- Create: `src/components/gear/system-spec-row.tsx`

Dot-leader approach: a flex row with `label` on the left, a `flex-1` filler element that renders the dots via repeating background, and `value` on the right. Using a repeating radial-gradient (or repeating border-bottom dashed) gives a controllable, crisp leader line. We'll use `border-b border-dotted` on the filler and align it to the baseline via padding.

- [ ] **Step 1: Create the component**

```tsx
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface SystemSpecRowProps {
  label: string;
  value: ReactNode;
  /** When true, the value is rendered dimmer (for "—" placeholders). */
  muted?: boolean;
  /** Optional action slot rendered after the value (e.g. edit icon button). */
  action?: ReactNode;
}

export function SystemSpecRow({ label, value, muted, action }: SystemSpecRowProps) {
  return (
    <div className="flex items-baseline gap-2 text-sm leading-6">
      <span className="shrink-0 text-ink-600">{label}</span>
      <span
        aria-hidden
        className="mx-1 min-w-[1.5rem] flex-1 translate-y-[-0.22em] border-b border-dotted border-[color:var(--border-soft)]"
      />
      <span
        className={clsx(
          'shrink-0 font-medium tabular-nums',
          muted ? 'text-ink-400' : 'text-ink-900'
        )}
      >
        {value}
      </span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gear/system-spec-row.tsx
git commit -m "feat(gear): add SystemSpecRow dot-leader primitive"
```

---

### Task 5: Build the `EditBikeWeightDialog`

**Files:**
- Create: `src/components/gear/edit-bike-weight-dialog.tsx`

A minimal modal: backdrop, one numeric input (accepts kg with two decimals), save/cancel. Save calls `updateBike(bike.id, { totalWeightGrams: Math.round(kg * 1000) })`. The dialog is uncontrolled from the parent's perspective — it receives `open`, `bike`, `onClose` — and pulls `updateBike` directly from the store.

The existing codebase uses "sheet" components (e.g. `install-part-sheet.tsx`). Mirror that visual pattern; a proper modal/portal library is not needed — we can use a fixed-inset backdrop.

- [ ] **Step 1: Inspect an existing sheet for style reference**

Run: read `src/components/gear/install-part-sheet.tsx` — match its backdrop/panel/close-button structure so the new dialog feels consistent.

- [ ] **Step 2: Create the dialog**

```tsx
import { useEffect, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useStore } from '@/store';
import type { Bike } from '@/types/gear';

interface EditBikeWeightDialogProps {
  open: boolean;
  bike: Bike | null;
  onClose: () => void;
}

function gramsToKgInputValue(grams: number | undefined): string {
  if (grams === undefined || !Number.isFinite(grams) || grams <= 0) return '';
  return (grams / 1000).toFixed(2);
}

export function EditBikeWeightDialog({ open, bike, onClose }: EditBikeWeightDialogProps) {
  const updateBike = useStore((s) => s.updateBike);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && bike) {
      setValue(gramsToKgInputValue(bike.totalWeightGrams));
      setError(null);
    }
  }, [open, bike]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !bike) return null;

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed === '') {
      updateBike(bike.id, { totalWeightGrams: undefined });
      onClose();
      return;
    }
    const kg = Number(trimmed);
    if (!Number.isFinite(kg) || kg <= 0 || kg > 50) {
      setError('Enter a weight between 0 and 50 kg.');
      return;
    }
    updateBike(bike.id, { totalWeightGrams: Math.round(kg * 1000) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-bike-weight-title"
        className="relative w-full max-w-sm rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 shadow-[var(--shadow-float)]"
      >
        <h3 id="edit-bike-weight-title" className="section-title">
          {bike.name} weight
        </h3>
        <p className="mt-1 text-sm leading-5 text-ink-600">
          Enter the total system weight in kilograms. Leave blank to clear.
        </p>
        <div className="mt-4">
          <Input
            id="edit-bike-weight-input"
            label="Weight (kg)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            autoFocus
          />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/gear/edit-bike-weight-dialog.tsx
git commit -m "feat(gear): add EditBikeWeightDialog"
```

---

### Task 6: Build the `BikeSystemCard`

**Files:**
- Create: `src/components/gear/bike-system-card.tsx`

Composes rows from Task 4 using helpers from Task 2. Renders a compact `Card` with a small title, the primary-bike badge (when `isPrimary`), and five rows. Weight row has an inline pencil button that opens the dialog from Task 5.

- [ ] **Step 1: Create the component**

```tsx
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui';
import { SystemSpecRow } from './system-spec-row';
import { EditBikeWeightDialog } from './edit-bike-weight-dialog';
import {
  formatDrivetrainSpeeds,
  formatGearRatioRange,
  formatMileage,
  formatOdometerSynced,
  formatWeightKg,
  getCassetteCogRange,
  getInstalledChainring,
} from '@/lib/gear/bike-system';
import type {
  Bike,
  CassetteAttributes,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
} from '@/types/gear';

interface BikeSystemCardProps {
  bike: Bike;
  installRecords: GearInstallRecord[];
  instances: GearPartInstance[];
  catalog: GearPartCatalogItem[];
}

export function BikeSystemCard({ bike, installRecords, instances, catalog }: BikeSystemCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const inputs = useMemo(
    () => ({ bike, installRecords, instances, catalog }),
    [bike, installRecords, instances, catalog]
  );
  const chainring = useMemo(() => getInstalledChainring(inputs), [inputs]);
  const cassetteCogs = useMemo(() => getCassetteCogRange(inputs), [inputs]);

  const cassetteItem = useMemo(() => {
    for (const install of installRecords) {
      if (install.bikeId !== bike.id || install.removedDateIso !== undefined) continue;
      const instance = instances.find((i) => i.id === install.partInstanceId);
      if (!instance) continue;
      const item = catalog.find((c) => c.id === instance.catalogItemId);
      if (!item || item.attributes.category !== 'cassette') continue;
      return item;
    }
    return null;
  }, [bike.id, catalog, installRecords, instances]);

  const mileage = formatMileage(bike.cachedOdometerMi);
  const weight = formatWeightKg(bike.totalWeightGrams);
  const ratio = formatGearRatioRange(chainring, cassetteCogs);
  const speeds = cassetteItem
    ? formatDrivetrainSpeeds(
        chainring,
        (cassetteItem.attributes as CassetteAttributes).speedCount
      )
    : null;
  const synced = formatOdometerSynced(bike.odometerSyncedAtIso);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="space-y-2.5 px-4 py-3.5 md:px-5 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="section-kicker text-[0.68rem]">Bike system</p>
            {bike.isPrimary ? (
              <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-700">
                Default
              </span>
            ) : null}
          </div>
          <div className="space-y-1.5 pt-0.5">
            <SystemSpecRow
              label="Mileage"
              value={mileage ?? '—'}
              muted={mileage === null}
            />
            <SystemSpecRow
              label="Weight"
              value={weight ?? 'Set'}
              muted={weight === null}
              action={
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  aria-label="Edit bike weight"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-3.5 w-3.5">
                    <path
                      d="M4 14.5 14 4.5l2 2L6 16.5H4v-2Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              }
            />
            <SystemSpecRow
              label="Gear range"
              value={ratio ?? '—'}
              muted={ratio === null}
            />
            <SystemSpecRow
              label="Drivetrain"
              value={speeds ?? '—'}
              muted={speeds === null}
            />
            <SystemSpecRow label="Odometer synced" value={synced} />
          </div>
        </CardContent>
      </Card>
      <EditBikeWeightDialog
        open={editOpen}
        bike={bike}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gear/bike-system-card.tsx
git commit -m "feat(gear): add BikeSystemCard composing spec rows and weight editor"
```

---

### Task 7: Mount the card in the Gear page sidebar

**Files:**
- Modify: `src/pages/gear.tsx` (imports section around line 1-22; sidebar JSX around line 224-235)

- [ ] **Step 1: Import the component**

Add to the imports block near the top of `src/pages/gear.tsx`:

```typescript
import { BikeSystemCard } from '@/components/gear/bike-system-card';
```

- [ ] **Step 2: Render the card below `<BikePillRow>` in the sidebar aside**

Replace this block (around `src/pages/gear.tsx:225-235`):

```tsx
        <aside className="surface-note p-3 md:p-4 lg:sticky lg:top-20">
          <BikePillRow
            bikes={bikes}
            selectedBikeId={selectedBikeIdForView}
            onSelect={handleSelectBike}
            onRefresh={handleRefresh}
            isRefreshing={isFetching}
            lastSyncedAt={lastSyncedAt}
            stravaError={error}
          />
        </aside>
```

with:

```tsx
        <aside className="space-y-3 lg:sticky lg:top-20">
          <div className="surface-note p-3 md:p-4">
            <BikePillRow
              bikes={bikes}
              selectedBikeId={selectedBikeIdForView}
              onSelect={handleSelectBike}
              onRefresh={handleRefresh}
              isRefreshing={isFetching}
              lastSyncedAt={lastSyncedAt}
              stravaError={error}
            />
          </div>
          {selectedBike ? (
            <BikeSystemCard
              bike={selectedBike}
              installRecords={gearInstallRecords}
              instances={gearPartInstances}
              catalog={gearPartCatalog}
            />
          ) : null}
        </aside>
```

Note: the existing `surface-note` styling moved from the `aside` to an inner wrapper because the new card ships its own surface (via `Card`). The `aside` now just provides spacing and sticky-positioning.

- [ ] **Step 3: Commit**

```bash
git add src/pages/gear.tsx
git commit -m "feat(gear): mount BikeSystemCard in sidebar"
```

---

### Task 8: Verify lint, typecheck, tests, and build

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 2: Run the gear tests**

Run: `npx vitest run src/lib/gear/bike-system.test.ts`
Expected: all tests pass.

- [ ] **Step 3: Run the full build**

Run: `npm run build`
Expected: builds without TypeScript errors. Bundle size warning about chunk size is pre-existing and OK.

- [ ] **Step 4: Manual verification in dev**

Run: `npm run dev` then navigate to the Gear page. Verify:
- Card appears below the bike pill row when a bike is selected.
- "Default" badge shows on the primary bike only.
- Mileage formats as e.g. "1,800 mi".
- Weight starts as "Set" (muted) — clicking the pencil opens the dialog, entering e.g. "8.42" and saving renders "8.42 kg".
- With a bike that has both chainrings and a cassette installed (e.g. 48-35 × 10-36), Gear range shows "0.97–4.80" and Drivetrain shows "2 × 12".
- With no cassette installed, Gear range and Drivetrain show "—".
- Odometer synced reads "Never synced" for a bike without `odometerSyncedAtIso`.
- Dot leaders align cleanly between rows; values right-align.

- [ ] **Step 5: No extra commit needed** — verification only.

---

## Self-review notes

- **Spec coverage:** Mileage ✓ (Task 6 + helper). Weight ✓ (Task 1 field + Task 5 editor + Task 6 row). Gear ratio ✓ (Task 2 helpers + Task 6 rendering). Odometer sync ✓ (Task 2 + Task 6). Default bike indicator ✓ (Task 6 header badge). Dot-leader layout ✓ (Task 4 primitive).
- **In-flight cassette shape:** Task 2's `getCassetteCogRange` tries numeric attrs first, falls back to parsing `range`, so either ordering with the parallel agent works.
- **No placeholders:** Every step includes real code or a concrete command.
- **Type consistency:** `BikeSystemInputs`, `SystemSpecRow` props, `EditBikeWeightDialog` props all match across tasks.

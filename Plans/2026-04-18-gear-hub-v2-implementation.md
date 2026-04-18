# Gear Hub V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Gear Hub V2: a `/gear` mechanical-maintenance hub with part catalog, physical part instances, installed bike slots, service events, mileage/time due tracking, and Supabase snapshot sync.

**Architecture:** Keep the current React/Zustand/Supabase snapshot architecture. Replace the old gear maintenance model with new canonical gear arrays in Zustand, derive active setup and due state through pure functions, and rebuild the gear page around Active Setup, Due, Parts, and History tabs. Preserve Strava bike/odometer sync and use app-state schema version 2 for a dev-reset migration.

**Tech Stack:** React 19, TypeScript, Vite, Zustand with `persist` and `immer`, Tailwind v4 utility classes, Supabase `user_state` JSON snapshot, Vitest.

---

## Design Reference

Read the approved design before editing code:

- `docs/superpowers/specs/2026-04-18-gear-hub-v2-design.md`

The design intentionally keeps mechanical inventory inside `/gear`. Do not add mechanical parts to the existing nutrition `/inventory` page.

## File Structure

Create or modify these files:

- Modify: `src/types/gear.ts` - new Gear Hub V2 types while preserving `Bike`.
- Modify: `src/types/index.ts` - keeps exporting gear types.
- Create: `src/lib/gear/constants.ts` - categories, fixed bike slots, service presets, compatibility helpers.
- Create: `src/lib/gear/normalizers.ts` - snapshot/localStorage normalization for v2 arrays.
- Create: `src/lib/gear/lifecycle.ts` - pure validation and transition helpers for install/remove/retire/service flows.
- Create: `src/lib/gear/derive-active-setup.ts` - active bike slot rows.
- Create: `src/lib/gear/derive-gear-due.ts` - mileage/date due rows.
- Modify: `src/store/index.ts` - app snapshot fields and gear actions.
- Modify: `src/store/index.test.ts` - store action tests.
- Modify: `src/lib/cloud/app-state.ts` - schema version 2 serialization/parsing.
- Modify: `src/lib/cloud/app-state.test.ts` - v2 snapshot tests.
- Modify: `src/lib/cloud/sync.test.ts` - snapshot data factory updates.
- Modify: `src/pages/gear.tsx` - Gear Hub V2 page composition.
- Modify: `src/components/gear/gear-tabs.tsx` - tabs become `active`, `due`, `parts`, `history`.
- Create: `src/components/gear/active-setup-list.tsx` - active setup rows.
- Create: `src/components/gear/parts-inventory.tsx` - catalog/instance inventory list.
- Create: `src/components/gear/part-catalog-form.tsx` - add/edit catalog items.
- Create: `src/components/gear/part-instance-form.tsx` - add instances from a catalog item.
- Create: `src/components/gear/install-part-sheet.tsx` - install flow.
- Create: `src/components/gear/remove-part-sheet.tsx` - remove/retire flow.
- Create: `src/components/gear/log-gear-service-sheet.tsx` - service event flow.
- Create: `src/components/gear/gear-history-list.tsx` - service/install/remove history.
- Modify or remove usage of: `src/components/gear/due-list.tsx`, `src/components/gear/history-list.tsx`, `src/components/gear/log-service-sheet.tsx`.
- Keep existing Strava files unchanged unless tests reveal a type mismatch: `src/hooks/use-strava-gear.ts`, `src/lib/gear/strava-gear.ts`, `supabase/functions/strava-gear-list/index.ts`.

## Commands

Use these commands throughout:

```bash
npm run lint
npx vitest run
npm run build
```

For targeted tests, run:

```bash
npx vitest run src/lib/gear/constants.test.ts
npx vitest run src/lib/gear/normalizers.test.ts
npx vitest run src/lib/gear/lifecycle.test.ts
npx vitest run src/lib/gear/derive-active-setup.test.ts
npx vitest run src/lib/gear/derive-gear-due.test.ts
npx vitest run src/store/index.test.ts
npx vitest run src/lib/cloud/app-state.test.ts src/lib/cloud/sync.test.ts
```

## Task 0: Prep and Baseline

**Files:**
- Read: `docs/superpowers/specs/2026-04-18-gear-hub-v2-design.md`
- Read: `src/pages/gear.tsx`
- Read: `src/store/index.ts`
- Read: `src/lib/cloud/app-state.ts`

- [ ] **Step 1: Confirm branch and working tree**

Run:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
```

Expected: no unrelated edits. If unrelated user edits exist, leave them untouched and continue around them.

- [ ] **Step 2: Run baseline verification**

Run:

```bash
npm run lint
npx vitest run
npm run build
```

Expected: all commands pass before Gear Hub V2 changes begin. If a baseline command fails, capture the failure in the task notes and do not hide it inside Gear Hub V2 work.

- [ ] **Step 3: Commit no code**

No commit is needed for prep.

## Task 1: Gear V2 Types, Constants, and Normalizers

**Files:**
- Modify: `src/types/gear.ts`
- Create: `src/lib/gear/constants.ts`
- Create: `src/lib/gear/constants.test.ts`
- Create: `src/lib/gear/normalizers.ts`
- Create: `src/lib/gear/normalizers.test.ts`

- [ ] **Step 1: Write failing constants tests**

Create `src/lib/gear/constants.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  FIXED_BIKE_SLOTS,
  GEAR_PART_CATEGORIES,
  GEAR_SERVICE_TYPES,
  getBikeSlot,
  getGearPartCategory,
  getGearServiceType,
  isPartCategoryCompatibleWithSlot,
} from './constants';

describe('gear constants', () => {
  it('defines the supported part categories', () => {
    expect(GEAR_PART_CATEGORIES.map((category) => category.key)).toEqual([
      'chain',
      'tire',
      'brake_pad',
      'cassette',
      'chainring',
    ]);
    expect(getGearPartCategory('tire').label).toBe('Tire');
  });

  it('defines fixed bike slots in display order', () => {
    expect(FIXED_BIKE_SLOTS.map((slot) => slot.key)).toEqual([
      'chain',
      'front_tire',
      'rear_tire',
      'cassette',
      'front_brake_pads',
      'rear_brake_pads',
      'chainrings',
    ]);
    expect(getBikeSlot('rear_tire').label).toBe('Rear tire');
  });

  it('maps slots to compatible categories', () => {
    expect(isPartCategoryCompatibleWithSlot('tire', 'front_tire')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('tire', 'rear_tire')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('chain', 'front_tire')).toBe(false);
    expect(isPartCategoryCompatibleWithSlot('cassette', 'cassette')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('brake_pad', 'rear_brake_pads')).toBe(true);
  });

  it('defines service types and defaults used by due tracking', () => {
    expect(GEAR_SERVICE_TYPES.map((service) => service.key)).toContain('chain_wax');
    expect(getGearServiceType('chain_wax').defaultIntervalMi).toBe(250);
    expect(getGearServiceType('tire_inspection').defaultIntervalDays).toBe(30);
  });
});
```

- [ ] **Step 2: Run constants tests and verify failure**

Run:

```bash
npx vitest run src/lib/gear/constants.test.ts
```

Expected: fail because `src/lib/gear/constants.ts` does not exist.

- [ ] **Step 3: Replace gear types**

Replace `src/types/gear.ts` with:

```ts
export interface Bike {
  id: string;
  name: string;
  stravaGearId: string | null;
  cachedOdometerMi: number | null;
  odometerSyncedAtIso: string | null;
  isPrimary: boolean;
  createdAt: number;
  updatedAt: number;
}

export type GearPartCategory =
  | 'chain'
  | 'tire'
  | 'brake_pad'
  | 'cassette'
  | 'chainring';

export type TireAttributes = {
  category: 'tire';
  widthMm: number;
  diameter?: string;
  tubelessReady?: boolean;
};

export type ChainAttributes = {
  category: 'chain';
  speedCount?: number;
};

export type BrakePadAttributes = {
  category: 'brake_pad';
  compound?: string;
  padShape?: string;
};

export type CassetteAttributes = {
  category: 'cassette';
  range: string;
  speedCount?: number;
};

export type ChainringAttributes = {
  category: 'chainring';
  toothCount: number;
  position?: string;
  mount?: string;
};

export type GearPartAttributes =
  | TireAttributes
  | ChainAttributes
  | BrakePadAttributes
  | CassetteAttributes
  | ChainringAttributes;

export interface GearPartCatalogItem {
  id: string;
  category: GearPartCategory;
  brand?: string;
  model: string;
  weightGrams?: number;
  attributes: GearPartAttributes;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type GearPartInstanceStatus =
  | 'spare'
  | 'installed'
  | 'removed'
  | 'retired';

export interface GearPartInstance {
  id: string;
  catalogItemId: string;
  label?: string;
  status: GearPartInstanceStatus;
  acquiredDateIso?: string;
  retiredDateIso?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type FixedBikeSlotKey =
  | 'chain'
  | 'front_tire'
  | 'rear_tire'
  | 'cassette'
  | 'front_brake_pads'
  | 'rear_brake_pads'
  | 'chainrings';

export type BikeSlotKey = FixedBikeSlotKey | `custom:${string}`;

export interface GearInstallRecord {
  id: string;
  bikeId: string;
  partInstanceId: string;
  slotKey: BikeSlotKey;
  installedAtMileageMi: number;
  installedDateIso: string;
  removedAtMileageMi?: number;
  removedDateIso?: string;
  removeReason?: 'swapped' | 'worn' | 'damaged' | 'sold' | 'other';
  createdAt: number;
  updatedAt: number;
}

export type GearServiceTypeKey =
  | 'chain_wax'
  | 'chain_clean'
  | 'tire_inspection'
  | 'sealant_check'
  | 'brake_pad_check'
  | 'cassette_check'
  | 'chainring_check'
  | 'other';

export interface GearServiceEvent {
  id: string;
  bikeId: string;
  partInstanceId?: string;
  slotKey?: BikeSlotKey;
  typeKey: GearServiceTypeKey;
  dateIso: string;
  mileageMi?: number;
  intervalMi?: number;
  intervalDays?: number;
  nextDueMileageMi?: number;
  nextDueDateIso?: string;
  materialsNote?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type LegacyServiceTypeKey = 'chain_wax' | 'chain' | 'brake_pads' | 'tires';

export interface LegacyServiceEntry {
  id: string;
  bikeId: string;
  typeKey: LegacyServiceTypeKey;
  dateIso: string;
  mileageMi: number;
  intervalMi: number;
  serviceAtMi: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 4: Create constants implementation**

Create `src/lib/gear/constants.ts`:

```ts
import type {
  BikeSlotKey,
  FixedBikeSlotKey,
  GearPartCategory,
  GearServiceTypeKey,
} from '@/types/gear';

export interface GearPartCategoryDefinition {
  key: GearPartCategory;
  label: string;
}

export interface BikeSlotDefinition {
  key: FixedBikeSlotKey;
  label: string;
  compatibleCategories: GearPartCategory[];
}

export interface GearServiceTypeDefinition {
  key: GearServiceTypeKey;
  label: string;
  defaultIntervalMi?: number;
  defaultIntervalDays?: number;
}

export const GEAR_PART_CATEGORIES = [
  { key: 'chain', label: 'Chain' },
  { key: 'tire', label: 'Tire' },
  { key: 'brake_pad', label: 'Brake pads' },
  { key: 'cassette', label: 'Cassette' },
  { key: 'chainring', label: 'Chainring' },
] as const satisfies readonly GearPartCategoryDefinition[];

export const FIXED_BIKE_SLOTS = [
  { key: 'chain', label: 'Chain', compatibleCategories: ['chain'] },
  { key: 'front_tire', label: 'Front tire', compatibleCategories: ['tire'] },
  { key: 'rear_tire', label: 'Rear tire', compatibleCategories: ['tire'] },
  { key: 'cassette', label: 'Cassette', compatibleCategories: ['cassette'] },
  {
    key: 'front_brake_pads',
    label: 'Front brake pads',
    compatibleCategories: ['brake_pad'],
  },
  {
    key: 'rear_brake_pads',
    label: 'Rear brake pads',
    compatibleCategories: ['brake_pad'],
  },
  { key: 'chainrings', label: 'Chainrings', compatibleCategories: ['chainring'] },
] as const satisfies readonly BikeSlotDefinition[];

export const GEAR_SERVICE_TYPES = [
  { key: 'chain_wax', label: 'Chain wax', defaultIntervalMi: 250 },
  { key: 'chain_clean', label: 'Chain clean', defaultIntervalMi: 500 },
  { key: 'tire_inspection', label: 'Tire inspection', defaultIntervalDays: 30 },
  { key: 'sealant_check', label: 'Sealant check', defaultIntervalDays: 90 },
  { key: 'brake_pad_check', label: 'Brake pad check', defaultIntervalMi: 1500 },
  { key: 'cassette_check', label: 'Cassette check', defaultIntervalMi: 2500 },
  { key: 'chainring_check', label: 'Chainring check', defaultIntervalMi: 2500 },
  { key: 'other', label: 'Other' },
] as const satisfies readonly GearServiceTypeDefinition[];

export function getGearPartCategory(key: GearPartCategory): GearPartCategoryDefinition {
  const category = GEAR_PART_CATEGORIES.find((candidate) => candidate.key === key);
  if (!category) throw new Error(`Unknown gear part category: ${key}`);
  return category;
}

export function getBikeSlot(key: BikeSlotKey): BikeSlotDefinition {
  if (key.startsWith('custom:')) {
    return {
      key: 'chain',
      label: key.slice('custom:'.length) || 'Custom slot',
      compatibleCategories: ['chain', 'tire', 'brake_pad', 'cassette', 'chainring'],
    };
  }

  const slot = FIXED_BIKE_SLOTS.find((candidate) => candidate.key === key);
  if (!slot) throw new Error(`Unknown bike slot: ${key}`);
  return slot;
}

export function getGearServiceType(key: GearServiceTypeKey): GearServiceTypeDefinition {
  const service = GEAR_SERVICE_TYPES.find((candidate) => candidate.key === key);
  if (!service) throw new Error(`Unknown gear service type: ${key}`);
  return service;
}

export function isPartCategoryCompatibleWithSlot(
  category: GearPartCategory,
  slotKey: BikeSlotKey
): boolean {
  return getBikeSlot(slotKey).compatibleCategories.includes(category);
}
```

- [ ] **Step 5: Run constants tests and build**

Run:

```bash
npx vitest run src/lib/gear/constants.test.ts
npm run build
```

Expected: constants tests pass. Build may fail because old files still import `ServiceTypeKey`; keep going if the error points to old gear components that later tasks replace.

- [ ] **Step 6: Write failing normalizer tests**

Create `src/lib/gear/normalizers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  normalizeGearInstallRecords,
  normalizeGearPartCatalog,
  normalizeGearPartInstances,
  normalizeGearServiceEvents,
} from './normalizers';

describe('gear normalizers', () => {
  it('normalizes valid catalog items and drops invalid rows', () => {
    const result = normalizeGearPartCatalog([
      {
        id: 'part-1',
        category: 'tire',
        brand: 'Continental',
        model: 'GP5000 S TR',
        weightGrams: 280,
        attributes: { category: 'tire', widthMm: 28 },
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: 'bad-tire',
        category: 'tire',
        model: 'Missing width',
        attributes: { category: 'tire' },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('GP5000 S TR');
    expect(result[0].attributes).toEqual({ category: 'tire', widthMm: 28 });
  });

  it('normalizes instances with known lifecycle statuses', () => {
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
        id: 'bad-instance',
        catalogItemId: 'part-1',
        status: 'lost',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('spare');
  });

  it('normalizes active and removed install records', () => {
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
        id: 'bad-install',
        bikeId: 'bike-1',
        partInstanceId: 'instance-1',
        slotKey: 'rear_tire',
        installedAtMileageMi: -1,
        installedDateIso: '2026-04-18',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].removedAtMileageMi).toBeUndefined();
  });

  it('computes next due values for valid service events when already present', () => {
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
        materialsNote: 'Silca wax',
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: 'bad-service',
        bikeId: 'bike-1',
        typeKey: 'chain_wax',
        dateIso: 'not-a-date',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].nextDueMileageMi).toBe(350);
  });
});
```

- [ ] **Step 7: Run normalizer tests and verify failure**

Run:

```bash
npx vitest run src/lib/gear/normalizers.test.ts
```

Expected: fail because `src/lib/gear/normalizers.ts` does not exist.

- [ ] **Step 8: Create normalizers**

Create `src/lib/gear/normalizers.ts` with these exported functions:

```ts
import type {
  BikeSlotKey,
  GearInstallRecord,
  GearPartAttributes,
  GearPartCatalogItem,
  GearPartCategory,
  GearPartInstance,
  GearPartInstanceStatus,
  GearServiceEvent,
  GearServiceTypeKey,
} from '@/types/gear';
import {
  FIXED_BIKE_SLOTS,
  GEAR_PART_CATEGORIES,
  GEAR_SERVICE_TYPES,
} from './constants';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalText(value: unknown): string | undefined {
  return text(value);
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = numberValue(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  const parsed = numberValue(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
}

function timestamp(value: unknown): number {
  return nonNegativeNumber(value) ?? Date.now();
}

function dateIso(value: unknown): string | undefined {
  const parsed = text(value);
  if (!parsed) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : undefined;
}

function category(value: unknown): GearPartCategory | undefined {
  const parsed = text(value);
  return GEAR_PART_CATEGORIES.some((candidate) => candidate.key === parsed)
    ? (parsed as GearPartCategory)
    : undefined;
}

function serviceType(value: unknown): GearServiceTypeKey | undefined {
  const parsed = text(value);
  return GEAR_SERVICE_TYPES.some((candidate) => candidate.key === parsed)
    ? (parsed as GearServiceTypeKey)
    : undefined;
}

function slotKey(value: unknown): BikeSlotKey | undefined {
  const parsed = text(value);
  if (!parsed) return undefined;
  if (parsed.startsWith('custom:')) return parsed as BikeSlotKey;
  return FIXED_BIKE_SLOTS.some((slot) => slot.key === parsed)
    ? (parsed as BikeSlotKey)
    : undefined;
}

function instanceStatus(value: unknown): GearPartInstanceStatus | undefined {
  return value === 'spare' ||
    value === 'installed' ||
    value === 'removed' ||
    value === 'retired'
    ? value
    : undefined;
}

function normalizeAttributes(
  incomingCategory: GearPartCategory,
  value: unknown
): GearPartAttributes | undefined {
  if (!isObject(value) || value.category !== incomingCategory) return undefined;

  if (incomingCategory === 'tire') {
    const widthMm = positiveNumber(value.widthMm);
    if (!widthMm) return undefined;
    return {
      category: 'tire',
      widthMm,
      diameter: optionalText(value.diameter),
      tubelessReady:
        typeof value.tubelessReady === 'boolean' ? value.tubelessReady : undefined,
    };
  }

  if (incomingCategory === 'chain') {
    return { category: 'chain', speedCount: positiveNumber(value.speedCount) };
  }

  if (incomingCategory === 'brake_pad') {
    return {
      category: 'brake_pad',
      compound: optionalText(value.compound),
      padShape: optionalText(value.padShape),
    };
  }

  if (incomingCategory === 'cassette') {
    const range = text(value.range);
    if (!range) return undefined;
    return {
      category: 'cassette',
      range,
      speedCount: positiveNumber(value.speedCount),
    };
  }

  const toothCount = positiveNumber(value.toothCount);
  if (!toothCount) return undefined;
  return {
    category: 'chainring',
    toothCount,
    position: optionalText(value.position),
    mount: optionalText(value.mount),
  };
}

export function normalizeGearPartCatalog(value: unknown): GearPartCatalogItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = text(item.id);
    const model = text(item.model);
    const parsedCategory = category(item.category);
    if (!id || !model || !parsedCategory) return [];
    const attributes = normalizeAttributes(parsedCategory, item.attributes);
    if (!attributes) return [];

    return [
      {
        id,
        category: parsedCategory,
        brand: optionalText(item.brand),
        model,
        weightGrams: positiveNumber(item.weightGrams),
        attributes,
        notes: optionalText(item.notes),
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}

export function normalizeGearPartInstances(value: unknown): GearPartInstance[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = text(item.id);
    const catalogItemId = text(item.catalogItemId);
    const status = instanceStatus(item.status);
    if (!id || !catalogItemId || !status) return [];

    return [
      {
        id,
        catalogItemId,
        label: optionalText(item.label),
        status,
        acquiredDateIso: dateIso(item.acquiredDateIso),
        retiredDateIso: dateIso(item.retiredDateIso),
        notes: optionalText(item.notes),
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}

export function normalizeGearInstallRecords(value: unknown): GearInstallRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = text(item.id);
    const bikeId = text(item.bikeId);
    const partInstanceId = text(item.partInstanceId);
    const parsedSlotKey = slotKey(item.slotKey);
    const installedAtMileageMi = nonNegativeNumber(item.installedAtMileageMi);
    const installedDateIso = dateIso(item.installedDateIso);
    if (
      !id ||
      !bikeId ||
      !partInstanceId ||
      !parsedSlotKey ||
      installedAtMileageMi === undefined ||
      !installedDateIso
    ) {
      return [];
    }

    const removedAtMileageMi = nonNegativeNumber(item.removedAtMileageMi);
    const removedDateIso = dateIso(item.removedDateIso);

    return [
      {
        id,
        bikeId,
        partInstanceId,
        slotKey: parsedSlotKey,
        installedAtMileageMi,
        installedDateIso,
        removedAtMileageMi,
        removedDateIso,
        removeReason:
          item.removeReason === 'swapped' ||
          item.removeReason === 'worn' ||
          item.removeReason === 'damaged' ||
          item.removeReason === 'sold' ||
          item.removeReason === 'other'
            ? item.removeReason
            : undefined,
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}

export function normalizeGearServiceEvents(value: unknown): GearServiceEvent[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = text(item.id);
    const bikeId = text(item.bikeId);
    const parsedType = serviceType(item.typeKey);
    const parsedDate = dateIso(item.dateIso);
    if (!id || !bikeId || !parsedType || !parsedDate) return [];

    return [
      {
        id,
        bikeId,
        partInstanceId: optionalText(item.partInstanceId),
        slotKey: slotKey(item.slotKey),
        typeKey: parsedType,
        dateIso: parsedDate,
        mileageMi: nonNegativeNumber(item.mileageMi),
        intervalMi: positiveNumber(item.intervalMi),
        intervalDays: positiveNumber(item.intervalDays),
        nextDueMileageMi: nonNegativeNumber(item.nextDueMileageMi),
        nextDueDateIso: dateIso(item.nextDueDateIso),
        materialsNote: optionalText(item.materialsNote),
        notes: optionalText(item.notes),
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}
```

- [ ] **Step 9: Run tests**

Run:

```bash
npx vitest run src/lib/gear/constants.test.ts src/lib/gear/normalizers.test.ts
```

Expected: pass.

- [ ] **Step 10: Commit**

Run:

```bash
git add src/types/gear.ts src/lib/gear/constants.ts src/lib/gear/constants.test.ts src/lib/gear/normalizers.ts src/lib/gear/normalizers.test.ts
git commit -m "feat(gear): define gear hub v2 domain types"
```

## Task 2: Store Fields, Actions, and App Snapshot Schema V2

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/store/index.test.ts`
- Modify: `src/lib/cloud/app-state.ts`
- Modify: `src/lib/cloud/app-state.test.ts`
- Modify: `src/lib/cloud/sync.test.ts`

- [ ] **Step 1: Add failing store tests**

Append these tests to `src/store/index.test.ts`:

```ts
describe('gear hub v2 store', () => {
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
      cachedOdometerMi: 1000,
    });
  });

  it('adds a catalog item and instances from it', () => {
    const catalogId = useStore.getState().addGearPartCatalogItem({
      category: 'tire',
      brand: 'Continental',
      model: 'GP5000 S TR',
      weightGrams: 280,
      attributes: { category: 'tire', widthMm: 28 },
    });

    const instanceIds = useStore.getState().addGearPartInstances({
      catalogItemId: catalogId,
      quantity: 2,
      labelPrefix: 'GP5000',
    });

    expect(useStore.getState().gearPartCatalog).toHaveLength(1);
    expect(instanceIds).toHaveLength(2);
    expect(useStore.getState().gearPartInstances[0].status).toBe('spare');
  });

  it('installs a compatible spare instance into an empty slot', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const catalogId = useStore.getState().addGearPartCatalogItem({
      category: 'chain',
      model: 'YBN SLA',
      weightGrams: 240,
      attributes: { category: 'chain', speedCount: 12 },
    });
    const [instanceId] = useStore.getState().addGearPartInstances({
      catalogItemId: catalogId,
      quantity: 1,
      labelPrefix: 'Chain',
    });

    const installId = useStore.getState().installGearPart({
      bikeId,
      partInstanceId: instanceId,
      slotKey: 'chain',
      installedAtMileageMi: 1000,
      installedDateIso: '2026-04-18',
    });

    expect(installId).toBeTruthy();
    expect(useStore.getState().gearInstallRecords).toHaveLength(1);
    expect(useStore.getState().gearPartInstances[0].status).toBe('installed');
  });

  it('blocks incompatible installs', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const catalogId = useStore.getState().addGearPartCatalogItem({
      category: 'chain',
      model: 'YBN SLA',
      attributes: { category: 'chain' },
    });
    const [instanceId] = useStore.getState().addGearPartInstances({
      catalogItemId: catalogId,
      quantity: 1,
    });

    expect(() =>
      useStore.getState().installGearPart({
        bikeId,
        partInstanceId: instanceId,
        slotKey: 'front_tire',
        installedAtMileageMi: 1000,
        installedDateIso: '2026-04-18',
      })
    ).toThrow('not compatible');
  });

  it('removes and retires installed parts', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const catalogId = useStore.getState().addGearPartCatalogItem({
      category: 'tire',
      model: 'GP5000',
      attributes: { category: 'tire', widthMm: 28 },
    });
    const [instanceId] = useStore.getState().addGearPartInstances({
      catalogItemId: catalogId,
      quantity: 1,
    });
    const installId = useStore.getState().installGearPart({
      bikeId,
      partInstanceId: instanceId,
      slotKey: 'rear_tire',
      installedAtMileageMi: 1000,
      installedDateIso: '2026-04-18',
    });

    useStore.getState().removeGearPart({
      installRecordId: installId,
      removedAtMileageMi: 1400,
      removedDateIso: '2026-05-01',
      removeReason: 'swapped',
      nextStatus: 'retired',
    });

    expect(useStore.getState().gearInstallRecords[0].removedAtMileageMi).toBe(1400);
    expect(useStore.getState().gearPartInstances[0].status).toBe('retired');
  });

  it('logs service events and computes next due values', () => {
    const bikeId = useStore.getState().bikes[0].id;
    const eventId = useStore.getState().logGearServiceEvent({
      bikeId,
      typeKey: 'chain_wax',
      dateIso: '2026-04-18',
      mileageMi: 1000,
      intervalMi: 250,
      intervalDays: 21,
      materialsNote: 'Silca wax',
    });

    const event = useStore.getState().gearServiceEvents.find((candidate) => candidate.id === eventId);
    expect(event?.nextDueMileageMi).toBe(1250);
    expect(event?.nextDueDateIso).toBe('2026-05-09');
  });
});
```

- [ ] **Step 2: Run store tests and verify failure**

Run:

```bash
npx vitest run src/store/index.test.ts
```

Expected: fail because the new store arrays and actions do not exist.

- [ ] **Step 3: Extend store types**

In `src/store/index.ts`, import new gear types and normalizers:

```ts
import type {
  BikeSlotKey,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearPartInstanceStatus,
  GearServiceEvent,
} from '@/types';
import {
  normalizeGearInstallRecords,
  normalizeGearPartCatalog,
  normalizeGearPartInstances,
  normalizeGearServiceEvents,
} from '@/lib/gear/normalizers';
import { isPartCategoryCompatibleWithSlot } from '@/lib/gear/constants';
```

Add to `AppDataSnapshot`:

```ts
gearPartCatalog: GearPartCatalogItem[];
gearPartInstances: GearPartInstance[];
gearInstallRecords: GearInstallRecord[];
gearServiceEvents: GearServiceEvent[];
```

Add to `AppState`:

```ts
gearPartCatalog: GearPartCatalogItem[];
gearPartInstances: GearPartInstance[];
gearInstallRecords: GearInstallRecord[];
gearServiceEvents: GearServiceEvent[];
addGearPartCatalogItem: (
  item: Omit<GearPartCatalogItem, 'id' | 'createdAt' | 'updatedAt'>
) => string;
updateGearPartCatalogItem: (
  id: string,
  updates: Partial<Omit<GearPartCatalogItem, 'id' | 'createdAt'>>
) => void;
deleteGearPartCatalogItem: (id: string) => void;
addGearPartInstances: (input: {
  catalogItemId: string;
  quantity: number;
  labelPrefix?: string;
  acquiredDateIso?: string;
  notes?: string;
}) => string[];
updateGearPartInstance: (
  id: string,
  updates: Partial<Omit<GearPartInstance, 'id' | 'createdAt'>>
) => void;
installGearPart: (input: {
  bikeId: string;
  partInstanceId: string;
  slotKey: BikeSlotKey;
  installedAtMileageMi: number;
  installedDateIso: string;
}) => string;
removeGearPart: (input: {
  installRecordId: string;
  removedAtMileageMi: number;
  removedDateIso: string;
  removeReason?: GearInstallRecord['removeReason'];
  nextStatus: Extract<GearPartInstanceStatus, 'removed' | 'retired'>;
}) => void;
retireGearPart: (instanceId: string, retiredDateIso: string) => void;
logGearServiceEvent: (
  event: Omit<
    GearServiceEvent,
    'id' | 'createdAt' | 'updatedAt' | 'nextDueMileageMi' | 'nextDueDateIso'
  > & {
    nextDueMileageMi?: number;
    nextDueDateIso?: string;
  }
) => string;
deleteGearServiceEvent: (id: string) => void;
```

- [ ] **Step 4: Include new arrays in snapshots and normalization**

In `getAppDataFromState`, return the four new arrays.

In `normalizeAppData`, normalize them:

```ts
gearPartCatalog: normalizeGearPartCatalog(incoming?.gearPartCatalog),
gearPartInstances: normalizeGearPartInstances(incoming?.gearPartInstances),
gearInstallRecords: normalizeGearInstallRecords(incoming?.gearInstallRecords),
gearServiceEvents: normalizeGearServiceEvents(incoming?.gearServiceEvents),
```

Keep old `bikes` normalization as-is. Set legacy `serviceEntries` to an empty array during v2 replacement:

```ts
serviceEntries: [],
```

In store initial state, add:

```ts
gearPartCatalog: [],
gearPartInstances: [],
gearInstallRecords: [],
gearServiceEvents: [],
```

In `replaceAppData`, assign the four new normalized arrays and set `state.serviceEntries = []`.

In persisted `merge`, normalize the four arrays and set `serviceEntries: []`.

- [ ] **Step 5: Implement store action helpers**

Add local helpers near the store implementation:

```ts
function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function assertPositiveCount(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer.');
  }
  return quantity;
}
```

Implement these actions inside the existing object returned from the store's `immer` initializer:

```ts
addGearPartCatalogItem: (item) => {
  const id = nanoid();
  set((state) => {
    state.gearPartCatalog.push({
      ...item,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  return id;
},
addGearPartInstances: ({ catalogItemId, quantity, labelPrefix, acquiredDateIso, notes }) => {
  const count = assertPositiveCount(quantity);
  const ids = Array.from({ length: count }, () => nanoid());
  set((state) => {
    const catalogItem = state.gearPartCatalog.find((item) => item.id === catalogItemId);
    if (!catalogItem) throw new Error('Catalog item not found.');
    ids.forEach((id, index) => {
      state.gearPartInstances.push({
        id,
        catalogItemId,
        label: labelPrefix ? `${labelPrefix} ${index + 1}` : undefined,
        status: 'spare',
        acquiredDateIso,
        notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
  });
  return ids;
},
installGearPart: (input) => {
  const installId = nanoid();
  set((state) => {
    const instance = state.gearPartInstances.find((candidate) => candidate.id === input.partInstanceId);
    if (!instance) throw new Error('Part instance not found.');
    if (instance.status === 'installed' || instance.status === 'retired') {
      throw new Error('Part instance is not available to install.');
    }
    const catalogItem = state.gearPartCatalog.find((candidate) => candidate.id === instance.catalogItemId);
    if (!catalogItem) throw new Error('Catalog item not found.');
    if (!isPartCategoryCompatibleWithSlot(catalogItem.category, input.slotKey)) {
      throw new Error(`${catalogItem.category} is not compatible with ${input.slotKey}.`);
    }
    const occupied = state.gearInstallRecords.some(
      (record) =>
        record.bikeId === input.bikeId &&
        record.slotKey === input.slotKey &&
        record.removedAtMileageMi === undefined &&
        record.removedDateIso === undefined
    );
    if (occupied) throw new Error('Slot already has an installed part.');
    state.gearInstallRecords.push({
      id: installId,
      ...input,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    instance.status = 'installed';
    instance.updatedAt = Date.now();
  });
  return installId;
},
removeGearPart: (input) =>
  set((state) => {
    const record = state.gearInstallRecords.find((candidate) => candidate.id === input.installRecordId);
    if (!record) throw new Error('Install record not found.');
    if (record.removedAtMileageMi !== undefined || record.removedDateIso !== undefined) {
      throw new Error('Part is already removed.');
    }
    if (input.removedAtMileageMi < record.installedAtMileageMi) {
      throw new Error('Removal mileage cannot be before install mileage.');
    }
    record.removedAtMileageMi = input.removedAtMileageMi;
    record.removedDateIso = input.removedDateIso;
    record.removeReason = input.removeReason;
    record.updatedAt = Date.now();
    const instance = state.gearPartInstances.find((candidate) => candidate.id === record.partInstanceId);
    if (instance) {
      instance.status = input.nextStatus;
      instance.retiredDateIso = input.nextStatus === 'retired' ? input.removedDateIso : instance.retiredDateIso;
      instance.updatedAt = Date.now();
    }
  }),
logGearServiceEvent: (event) => {
  const id = nanoid();
  set((state) => {
    state.gearServiceEvents.push({
      ...event,
      id,
      nextDueMileageMi:
        event.nextDueMileageMi ??
        (typeof event.mileageMi === 'number' && typeof event.intervalMi === 'number'
          ? event.mileageMi + event.intervalMi
          : undefined),
      nextDueDateIso:
        event.nextDueDateIso ??
        (typeof event.intervalDays === 'number'
          ? addDaysIso(event.dateIso, event.intervalDays)
          : undefined),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  return id;
},
updateGearPartCatalogItem: (id, updates) =>
  set((state) => {
    const item = state.gearPartCatalog.find((candidate) => candidate.id === id);
    if (!item) return;
    Object.assign(item, updates, { id, updatedAt: Date.now() });
  }),
deleteGearPartCatalogItem: (id) =>
  set((state) => {
    const instanceIds = new Set(
      state.gearPartInstances
        .filter((instance) => instance.catalogItemId === id)
        .map((instance) => instance.id)
    );
    state.gearPartCatalog = state.gearPartCatalog.filter((item) => item.id !== id);
    state.gearPartInstances = state.gearPartInstances.filter(
      (instance) => instance.catalogItemId !== id
    );
    state.gearInstallRecords = state.gearInstallRecords.filter(
      (record) => !instanceIds.has(record.partInstanceId)
    );
    state.gearServiceEvents = state.gearServiceEvents.filter(
      (event) => !event.partInstanceId || !instanceIds.has(event.partInstanceId)
    );
  }),
updateGearPartInstance: (id, updates) =>
  set((state) => {
    const instance = state.gearPartInstances.find((candidate) => candidate.id === id);
    if (!instance) return;
    Object.assign(instance, updates, { id, updatedAt: Date.now() });
  }),
retireGearPart: (instanceId, retiredDateIso) =>
  set((state) => {
    const instance = state.gearPartInstances.find((candidate) => candidate.id === instanceId);
    if (!instance) throw new Error('Part instance not found.');
    const activeRecord = state.gearInstallRecords.find(
      (record) =>
        record.partInstanceId === instanceId &&
        record.removedAtMileageMi === undefined &&
        record.removedDateIso === undefined
    );
    if (activeRecord) {
      activeRecord.removedDateIso = retiredDateIso;
      activeRecord.removedAtMileageMi = activeRecord.installedAtMileageMi;
      activeRecord.removeReason = 'worn';
      activeRecord.updatedAt = Date.now();
    }
    instance.status = 'retired';
    instance.retiredDateIso = retiredDateIso;
    instance.updatedAt = Date.now();
  }),
deleteGearServiceEvent: (id) =>
  set((state) => {
    state.gearServiceEvents = state.gearServiceEvents.filter((event) => event.id !== id);
  }),
```

- [ ] **Step 6: Update cloud app-state schema and tests**

In `src/lib/cloud/app-state.ts`, change:

```ts
export const APP_STATE_SCHEMA_VERSION = 2;
```

Update the `serializeAppState` app-state field list to include the existing snapshot fields plus `gearPartCatalog`, `gearPartInstances`, `gearInstallRecords`, and `gearServiceEvents`.

Update `src/lib/cloud/app-state.test.ts` `baseState` with:

```ts
gearPartCatalog: [],
gearPartInstances: [],
gearInstallRecords: [],
gearServiceEvents: [],
```

Add a test:

```ts
it('serializes gear hub v2 data', () => {
  const snapshot = serializeAppState(
    {
      ...baseState,
      gearPartCatalog: [
        {
          id: 'part-1',
          category: 'chain',
          model: 'YBN SLA',
          attributes: { category: 'chain', speedCount: 12 },
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      gearPartInstances: [
        {
          id: 'instance-1',
          catalogItemId: 'part-1',
          status: 'spare',
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      gearInstallRecords: [],
      gearServiceEvents: [],
    },
    new Date('2026-04-18T12:00:00Z')
  );

  expect(snapshot.schemaVersion).toBe(2);
  expect(snapshot.data.gearPartCatalog[0].model).toBe('YBN SLA');
  expect(snapshot.data.gearPartInstances[0].status).toBe('spare');
});
```

Update `src/lib/cloud/sync.test.ts` `makeAppData` to include the four gear arrays.

- [ ] **Step 7: Run targeted tests**

Run:

```bash
npx vitest run src/store/index.test.ts src/lib/cloud/app-state.test.ts src/lib/cloud/sync.test.ts
```

Expected: pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/store/index.ts src/store/index.test.ts src/lib/cloud/app-state.ts src/lib/cloud/app-state.test.ts src/lib/cloud/sync.test.ts
git commit -m "feat(gear): add gear hub state and snapshot sync"
```

## Task 3: Lifecycle Validation and Derived State

**Files:**
- Create: `src/lib/gear/lifecycle.ts`
- Create: `src/lib/gear/lifecycle.test.ts`
- Create: `src/lib/gear/derive-active-setup.ts`
- Create: `src/lib/gear/derive-active-setup.test.ts`
- Create: `src/lib/gear/derive-gear-due.ts`
- Create: `src/lib/gear/derive-gear-due.test.ts`

- [ ] **Step 1: Write lifecycle tests**

Create `src/lib/gear/lifecycle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  validateInstallDraft,
  validateRemoveDraft,
  validateServiceDraft,
} from './lifecycle';
import type { GearInstallRecord } from '@/types/gear';

describe('gear lifecycle validation', () => {
  it('rejects install mileage below zero and future dates', () => {
    const errors = validateInstallDraft(
      {
        bikeId: 'bike-1',
        partInstanceId: 'instance-1',
        slotKey: 'chain',
        installedAtMileageMi: -1,
        installedDateIso: '2026-04-19',
      },
      new Date('2026-04-18T12:00:00Z')
    );

    expect(errors.installedAtMileageMi).toBe('Mileage must be 0 or greater.');
    expect(errors.installedDateIso).toBe("Date can't be in the future.");
  });

  it('rejects removal mileage before install mileage', () => {
    const record: GearInstallRecord = {
      id: 'install-1',
      bikeId: 'bike-1',
      partInstanceId: 'instance-1',
      slotKey: 'chain',
      installedAtMileageMi: 1000,
      installedDateIso: '2026-04-18',
      createdAt: 1,
      updatedAt: 1,
    };

    const errors = validateRemoveDraft(
      {
        installRecordId: 'install-1',
        removedAtMileageMi: 900,
        removedDateIso: '2026-04-19',
        nextStatus: 'removed',
      },
      record,
      new Date('2026-04-20T12:00:00Z')
    );

    expect(errors.removedAtMileageMi).toBe('Removal mileage must be at or after install mileage.');
  });

  it('rejects non-positive service intervals', () => {
    const errors = validateServiceDraft(
      {
        bikeId: 'bike-1',
        typeKey: 'chain_wax',
        dateIso: '2026-04-18',
        mileageMi: 1000,
        intervalMi: 0,
        intervalDays: -1,
      },
      new Date('2026-04-18T12:00:00Z')
    );

    expect(errors.intervalMi).toBe('Mileage interval must be greater than 0.');
    expect(errors.intervalDays).toBe('Time interval must be greater than 0.');
  });
});
```

- [ ] **Step 2: Implement lifecycle validators**

Create `src/lib/gear/lifecycle.ts`:

```ts
import type {
  BikeSlotKey,
  GearInstallRecord,
  GearServiceTypeKey,
  GearPartInstanceStatus,
} from '@/types/gear';

export interface InstallDraft {
  bikeId: string;
  partInstanceId: string;
  slotKey: BikeSlotKey;
  installedAtMileageMi: number;
  installedDateIso: string;
}

export interface RemoveDraft {
  installRecordId: string;
  removedAtMileageMi: number;
  removedDateIso: string;
  nextStatus: Extract<GearPartInstanceStatus, 'removed' | 'retired'>;
}

export interface ServiceDraft {
  bikeId: string;
  partInstanceId?: string;
  slotKey?: BikeSlotKey;
  typeKey: GearServiceTypeKey;
  dateIso: string;
  mileageMi?: number;
  intervalMi?: number;
  intervalDays?: number;
}

export type InstallDraftErrors = Partial<Record<keyof InstallDraft, string>>;
export type RemoveDraftErrors = Partial<Record<keyof RemoveDraft, string>>;
export type ServiceDraftErrors = Partial<Record<keyof ServiceDraft, string>>;

function todayIso(today: Date): string {
  return today.toISOString().slice(0, 10);
}

function isFutureDate(dateIso: string, today: Date): boolean {
  return dateIso > todayIso(today);
}

export function validateInstallDraft(
  draft: InstallDraft,
  today: Date
): InstallDraftErrors {
  const errors: InstallDraftErrors = {};
  if (!draft.bikeId) errors.bikeId = 'Choose a bike.';
  if (!draft.partInstanceId) errors.partInstanceId = 'Choose a part.';
  if (!draft.slotKey) errors.slotKey = 'Choose a slot.';
  if (!Number.isFinite(draft.installedAtMileageMi) || draft.installedAtMileageMi < 0) {
    errors.installedAtMileageMi = 'Mileage must be 0 or greater.';
  }
  if (!draft.installedDateIso) {
    errors.installedDateIso = 'Choose an install date.';
  } else if (isFutureDate(draft.installedDateIso, today)) {
    errors.installedDateIso = "Date can't be in the future.";
  }
  return errors;
}

export function validateRemoveDraft(
  draft: RemoveDraft,
  activeRecord: GearInstallRecord | undefined,
  today: Date
): RemoveDraftErrors {
  const errors: RemoveDraftErrors = {};
  if (!draft.installRecordId) errors.installRecordId = 'Choose an installed part.';
  if (!activeRecord) errors.installRecordId = 'Installed part was not found.';
  if (!Number.isFinite(draft.removedAtMileageMi) || draft.removedAtMileageMi < 0) {
    errors.removedAtMileageMi = 'Mileage must be 0 or greater.';
  }
  if (activeRecord && draft.removedAtMileageMi < activeRecord.installedAtMileageMi) {
    errors.removedAtMileageMi = 'Removal mileage must be at or after install mileage.';
  }
  if (!draft.removedDateIso) {
    errors.removedDateIso = 'Choose a removal date.';
  } else if (isFutureDate(draft.removedDateIso, today)) {
    errors.removedDateIso = "Date can't be in the future.";
  }
  return errors;
}

export function validateServiceDraft(
  draft: ServiceDraft,
  today: Date
): ServiceDraftErrors {
  const errors: ServiceDraftErrors = {};
  if (!draft.bikeId) errors.bikeId = 'Choose a bike.';
  if (!draft.typeKey) errors.typeKey = 'Choose a service type.';
  if (!draft.dateIso) {
    errors.dateIso = 'Choose a service date.';
  } else if (isFutureDate(draft.dateIso, today)) {
    errors.dateIso = "Date can't be in the future.";
  }
  if (draft.mileageMi !== undefined && (!Number.isFinite(draft.mileageMi) || draft.mileageMi < 0)) {
    errors.mileageMi = 'Mileage must be 0 or greater.';
  }
  if (draft.intervalMi !== undefined && (!Number.isFinite(draft.intervalMi) || draft.intervalMi <= 0)) {
    errors.intervalMi = 'Mileage interval must be greater than 0.';
  }
  if (draft.intervalDays !== undefined && (!Number.isFinite(draft.intervalDays) || draft.intervalDays <= 0)) {
    errors.intervalDays = 'Time interval must be greater than 0.';
  }
  return errors;
}
```

- [ ] **Step 3: Write active setup tests**

Create `src/lib/gear/derive-active-setup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deriveActiveSetup } from './derive-active-setup';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';

const bike: Bike = {
  id: 'bike-1',
  name: 'Force E1',
  stravaGearId: null,
  cachedOdometerMi: 1250,
  odometerSyncedAtIso: null,
  isPrimary: true,
  createdAt: 1,
  updatedAt: 1,
};

const catalog: GearPartCatalogItem[] = [
  {
    id: 'part-1',
    category: 'chain',
    model: 'YBN SLA',
    attributes: { category: 'chain', speedCount: 12 },
    createdAt: 1,
    updatedAt: 1,
  },
];

const instances: GearPartInstance[] = [
  {
    id: 'instance-1',
    catalogItemId: 'part-1',
    label: 'Chain A',
    status: 'installed',
    createdAt: 1,
    updatedAt: 1,
  },
];

const installs: GearInstallRecord[] = [
  {
    id: 'install-1',
    bikeId: 'bike-1',
    partInstanceId: 'instance-1',
    slotKey: 'chain',
    installedAtMileageMi: 1000,
    installedDateIso: '2026-04-01',
    createdAt: 1,
    updatedAt: 1,
  },
];

const services: GearServiceEvent[] = [
  {
    id: 'service-1',
    bikeId: 'bike-1',
    partInstanceId: 'instance-1',
    slotKey: 'chain',
    typeKey: 'chain_wax',
    dateIso: '2026-04-10',
    mileageMi: 1100,
    intervalMi: 250,
    nextDueMileageMi: 1350,
    createdAt: 1,
    updatedAt: 1,
  },
];

describe('deriveActiveSetup', () => {
  it('returns fixed slots with installed part details and mileage', () => {
    const rows = deriveActiveSetup({
      bike,
      catalog,
      instances,
      installRecords: installs,
      serviceEvents: services,
      today: new Date('2026-04-18T12:00:00Z'),
    });

    const chain = rows.find((row) => row.slotKey === 'chain');
    expect(rows).toHaveLength(7);
    expect(chain?.instance?.label).toBe('Chain A');
    expect(chain?.milesSinceInstall).toBe(250);
    expect(chain?.latestService?.id).toBe('service-1');
    expect(chain?.urgency).toBe('soon');
  });

  it('returns empty rows for slots without installed parts', () => {
    const rows = deriveActiveSetup({
      bike,
      catalog,
      instances,
      installRecords: [],
      serviceEvents: [],
      today: new Date('2026-04-18T12:00:00Z'),
    });

    expect(rows.find((row) => row.slotKey === 'rear_tire')?.instance).toBeNull();
  });
});
```

- [ ] **Step 4: Implement active setup derivation**

Create `src/lib/gear/derive-active-setup.ts`:

```ts
import type {
  Bike,
  BikeSlotKey,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';
import { FIXED_BIKE_SLOTS, getBikeSlot } from './constants';

export interface ActiveSetupRow {
  slotKey: BikeSlotKey;
  slotLabel: string;
  installRecord: GearInstallRecord | null;
  instance: GearPartInstance | null;
  catalogItem: GearPartCatalogItem | null;
  latestService: GearServiceEvent | null;
  milesSinceInstall: number | null;
  urgency: 'overdue' | 'soon' | 'ok' | 'unknown';
}

interface DeriveActiveSetupInput {
  bike: Bike | null;
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  serviceEvents: GearServiceEvent[];
  today: Date;
}

function isActive(record: GearInstallRecord): boolean {
  return record.removedAtMileageMi === undefined && record.removedDateIso === undefined;
}

function latestServiceFor(
  bikeId: string,
  slotKey: BikeSlotKey,
  instanceId: string | undefined,
  serviceEvents: GearServiceEvent[]
): GearServiceEvent | null {
  const matches = serviceEvents
    .filter(
      (event) =>
        event.bikeId === bikeId &&
        (event.partInstanceId === instanceId || (!event.partInstanceId && event.slotKey === slotKey))
    )
    .sort((a, b) => {
      if (a.dateIso !== b.dateIso) return b.dateIso.localeCompare(a.dateIso);
      return b.createdAt - a.createdAt;
    });

  return matches[0] ?? null;
}

function urgencyFromService(
  bike: Bike,
  latestService: GearServiceEvent | null,
  today: Date
): ActiveSetupRow['urgency'] {
  if (!latestService) return 'unknown';

  const mileageUrgency = (() => {
    if (
      bike.cachedOdometerMi === null ||
      latestService.nextDueMileageMi === undefined ||
      latestService.intervalMi === undefined
    ) {
      return null;
    }
    const remaining = latestService.nextDueMileageMi - bike.cachedOdometerMi;
    if (remaining < 0) return 'overdue';
    if (remaining <= latestService.intervalMi * 0.1) return 'soon';
    return 'ok';
  })();

  const dateUrgency = (() => {
    if (!latestService.nextDueDateIso) return null;
    const todayIso = today.toISOString().slice(0, 10);
    if (todayIso > latestService.nextDueDateIso) return 'overdue';
    const dueTime = new Date(`${latestService.nextDueDateIso}T00:00:00.000Z`).getTime();
    const todayTime = new Date(`${todayIso}T00:00:00.000Z`).getTime();
    const days = Math.ceil((dueTime - todayTime) / 86_400_000);
    return days <= 14 ? 'soon' : 'ok';
  })();

  if (mileageUrgency === 'overdue' || dateUrgency === 'overdue') return 'overdue';
  if (mileageUrgency === 'soon' || dateUrgency === 'soon') return 'soon';
  if (mileageUrgency === 'ok' || dateUrgency === 'ok') return 'ok';
  return 'unknown';
}

export function deriveActiveSetup({
  bike,
  catalog,
  instances,
  installRecords,
  serviceEvents,
  today,
}: DeriveActiveSetupInput): ActiveSetupRow[] {
  return FIXED_BIKE_SLOTS.map((slot) => {
    const slotKey = slot.key;
    if (!bike) {
      return {
        slotKey,
        slotLabel: getBikeSlot(slotKey).label,
        installRecord: null,
        instance: null,
        catalogItem: null,
        latestService: null,
        milesSinceInstall: null,
        urgency: 'unknown',
      };
    }

    const installRecord =
      installRecords.find(
        (record) => record.bikeId === bike.id && record.slotKey === slotKey && isActive(record)
      ) ?? null;
    const instance =
      installRecord ? instances.find((item) => item.id === installRecord.partInstanceId) ?? null : null;
    const catalogItem =
      instance ? catalog.find((item) => item.id === instance.catalogItemId) ?? null : null;
    const latestService = latestServiceFor(
      bike.id,
      slotKey,
      instance?.id,
      serviceEvents
    );

    return {
      slotKey,
      slotLabel: getBikeSlot(slotKey).label,
      installRecord,
      instance,
      catalogItem,
      latestService,
      milesSinceInstall:
        installRecord && bike.cachedOdometerMi !== null
          ? bike.cachedOdometerMi - installRecord.installedAtMileageMi
          : null,
      urgency: urgencyFromService(bike, latestService, today),
    };
  });
}
```

- [ ] **Step 5: Write due derivation tests**

Create `src/lib/gear/derive-gear-due.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deriveGearDue } from './derive-gear-due';
import type { Bike, GearServiceEvent } from '@/types/gear';

const bike: Bike = {
  id: 'bike-1',
  name: 'Force E1',
  stravaGearId: null,
  cachedOdometerMi: 1260,
  odometerSyncedAtIso: null,
  isPrimary: true,
  createdAt: 1,
  updatedAt: 1,
};

describe('deriveGearDue', () => {
  it('derives overdue and soon mileage items from service events', () => {
    const events: GearServiceEvent[] = [
      {
        id: 'event-1',
        bikeId: 'bike-1',
        slotKey: 'chain',
        typeKey: 'chain_wax',
        dateIso: '2026-04-01',
        mileageMi: 1000,
        intervalMi: 250,
        nextDueMileageMi: 1250,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'event-2',
        bikeId: 'bike-1',
        slotKey: 'rear_tire',
        typeKey: 'tire_inspection',
        dateIso: '2026-04-01',
        mileageMi: 1000,
        intervalMi: 300,
        nextDueMileageMi: 1300,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const due = deriveGearDue({
      bikes: [bike],
      serviceEvents: events,
      today: new Date('2026-04-18T12:00:00Z'),
    });

    expect(due[0].urgency).toBe('overdue');
    expect(due[0].remainingMi).toBe(-10);
    expect(due[1].urgency).toBe('ok');
  });

  it('derives overdue date items from service events', () => {
    const due = deriveGearDue({
      bikes: [bike],
      serviceEvents: [
        {
          id: 'event-1',
          bikeId: 'bike-1',
          typeKey: 'sealant_check',
          dateIso: '2026-01-01',
          intervalDays: 90,
          nextDueDateIso: '2026-04-01',
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      today: new Date('2026-04-18T12:00:00Z'),
    });

    expect(due[0].urgency).toBe('overdue');
    expect(due[0].remainingDays).toBe(-17);
  });
});
```

- [ ] **Step 6: Implement due derivation**

Create `src/lib/gear/derive-gear-due.ts`:

```ts
import type { Bike, GearServiceEvent } from '@/types/gear';
import { getGearServiceType } from './constants';

export interface GearDueItem {
  id: string;
  bikeId: string;
  partInstanceId?: string;
  slotKey?: GearServiceEvent['slotKey'];
  serviceEvent: GearServiceEvent;
  label: string;
  remainingMi: number | null;
  remainingDays: number | null;
  urgency: 'overdue' | 'soon' | 'ok' | 'unknown';
}

interface DeriveGearDueInput {
  bikes: Bike[];
  serviceEvents: GearServiceEvent[];
  today: Date;
}

function daysUntil(dateIso: string, today: Date): number {
  const todayIso = today.toISOString().slice(0, 10);
  const dueTime = new Date(`${dateIso}T00:00:00.000Z`).getTime();
  const todayTime = new Date(`${todayIso}T00:00:00.000Z`).getTime();
  return Math.ceil((dueTime - todayTime) / 86_400_000);
}

function maxUrgency(
  mileageUrgency: GearDueItem['urgency'],
  dateUrgency: GearDueItem['urgency']
): GearDueItem['urgency'] {
  if (mileageUrgency === 'overdue' || dateUrgency === 'overdue') return 'overdue';
  if (mileageUrgency === 'soon' || dateUrgency === 'soon') return 'soon';
  if (mileageUrgency === 'ok' || dateUrgency === 'ok') return 'ok';
  return 'unknown';
}

export function deriveGearDue({
  bikes,
  serviceEvents,
  today,
}: DeriveGearDueInput): GearDueItem[] {
  const bikeById = new Map(bikes.map((bike) => [bike.id, bike]));

  return serviceEvents
    .flatMap((event): GearDueItem[] => {
      const bike = bikeById.get(event.bikeId);
      const remainingMi =
        bike?.cachedOdometerMi !== null &&
        bike?.cachedOdometerMi !== undefined &&
        event.nextDueMileageMi !== undefined
          ? event.nextDueMileageMi - bike.cachedOdometerMi
          : null;
      const remainingDays = event.nextDueDateIso
        ? daysUntil(event.nextDueDateIso, today)
        : null;

      if (remainingMi === null && remainingDays === null) return [];

      const mileageUrgency =
        remainingMi === null || event.intervalMi === undefined
          ? 'unknown'
          : remainingMi < 0
            ? 'overdue'
            : remainingMi <= event.intervalMi * 0.1
              ? 'soon'
              : 'ok';
      const dateUrgency =
        remainingDays === null
          ? 'unknown'
          : remainingDays < 0
            ? 'overdue'
            : remainingDays <= 14
              ? 'soon'
              : 'ok';

      return [
        {
          id: event.id,
          bikeId: event.bikeId,
          partInstanceId: event.partInstanceId,
          slotKey: event.slotKey,
          serviceEvent: event,
          label: getGearServiceType(event.typeKey).label,
          remainingMi,
          remainingDays,
          urgency: maxUrgency(mileageUrgency, dateUrgency),
        },
      ];
    })
    .sort((a, b) => {
      const urgencyRank = { overdue: 0, soon: 1, ok: 2, unknown: 3 };
      if (urgencyRank[a.urgency] !== urgencyRank[b.urgency]) {
        return urgencyRank[a.urgency] - urgencyRank[b.urgency];
      }
      const aDistance = a.remainingMi ?? a.remainingDays ?? Number.POSITIVE_INFINITY;
      const bDistance = b.remainingMi ?? b.remainingDays ?? Number.POSITIVE_INFINITY;
      return aDistance - bDistance;
    });
}
```

- [ ] **Step 7: Run derivation tests**

Run:

```bash
npx vitest run src/lib/gear/lifecycle.test.ts src/lib/gear/derive-active-setup.test.ts src/lib/gear/derive-gear-due.test.ts
```

Expected: pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/gear/lifecycle.ts src/lib/gear/lifecycle.test.ts src/lib/gear/derive-active-setup.ts src/lib/gear/derive-active-setup.test.ts src/lib/gear/derive-gear-due.ts src/lib/gear/derive-gear-due.test.ts
git commit -m "feat(gear): derive active setup and due state"
```

## Task 4: Gear Page Tabs and Read-Only Displays

**Files:**
- Modify: `src/components/gear/gear-tabs.tsx`
- Create: `src/components/gear/active-setup-list.tsx`
- Create: `src/components/gear/gear-due-list.tsx`
- Create: `src/components/gear/parts-inventory.tsx`
- Create: `src/components/gear/gear-history-list.tsx`
- Modify: `src/pages/gear.tsx`

- [ ] **Step 1: Update tab component**

Replace `src/components/gear/gear-tabs.tsx` with a tab component that supports four values:

```tsx
import { clsx } from 'clsx';

export type GearTabValue = 'active' | 'due' | 'parts' | 'history';

interface GearTabsProps {
  value: GearTabValue;
  onChange: (value: GearTabValue) => void;
}

const TABS: Array<{ id: GearTabValue; label: string }> = [
  { id: 'active', label: 'Active setup' },
  { id: 'due', label: 'Due' },
  { id: 'parts', label: 'Parts' },
  { id: 'history', label: 'History' },
];

export function GearTabs({ value, onChange }: GearTabsProps) {
  return (
    <div
      role="group"
      aria-label="Gear view"
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[color:var(--border-soft)] bg-white p-1"
    >
      {TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'min-h-9 shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors md:px-4',
              active
                ? 'bg-brand-100 text-brand-900'
                : 'text-ink-700 hover:bg-shell-50'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create active setup read-only component**

Create `src/components/gear/active-setup-list.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui';
import type { ActiveSetupRow } from '@/lib/gear/derive-active-setup';

interface ActiveSetupListProps {
  rows: ActiveSetupRow[];
  onInstall: (slotKey: ActiveSetupRow['slotKey']) => void;
  onRemove: (row: ActiveSetupRow) => void;
  onService: (row: ActiveSetupRow) => void;
}

function formatMiles(value: number | null): string {
  return value === null ? 'Mileage unknown' : `${Math.round(value).toLocaleString()} mi`;
}

export function ActiveSetupList({
  rows,
  onInstall,
  onRemove,
  onService,
}: ActiveSetupListProps) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <Card key={row.slotKey}>
          <CardContent className="py-3.5 md:py-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-ink-500">{row.slotLabel}</p>
                <p className="truncate text-base font-semibold text-ink-900">
                  {row.instance
                    ? row.instance.label || row.catalogItem?.model || 'Installed part'
                    : 'No part installed'}
                </p>
                <p className="text-sm leading-5 text-ink-600">
                  {row.catalogItem
                    ? [row.catalogItem.brand, row.catalogItem.model].filter(Boolean).join(' ')
                    : 'Install a compatible part from gear inventory.'}
                </p>
                {row.instance ? (
                  <p className="text-sm leading-5 text-ink-700">
                    {formatMiles(row.milesSinceInstall)} since install
                    {row.latestService ? ` · Last service ${row.latestService.dateIso}` : ''}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.instance ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onService(row)}
                      className="min-h-10 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-shell-50"
                    >
                      Log service
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(row)}
                      className="min-h-10 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-shell-50"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onInstall(row.slotKey)}
                    className="min-h-10 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-shell-50"
                  >
                    Install part
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create read-only due, parts, and history placeholders with real data**

Create `src/components/gear/gear-due-list.tsx`, `src/components/gear/parts-inventory.tsx`, and `src/components/gear/gear-history-list.tsx` with read-only lists using the same `Card` and `CardContent` pattern. Each component must accept typed props and render empty states:

```tsx
// src/components/gear/gear-due-list.tsx
import { Card, CardContent } from '@/components/ui';
import type { GearDueItem } from '@/lib/gear/derive-gear-due';
import type { Bike } from '@/types/gear';

interface GearDueListProps {
  items: GearDueItem[];
  bikes: Bike[];
  onLogService: (item: GearDueItem) => void;
}

function bikeName(bikes: Bike[], bikeId: string): string {
  return bikes.find((bike) => bike.id === bikeId)?.name ?? 'Unknown bike';
}

export function GearDueList({ items, bikes, onLogService }: GearDueListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-5 md:py-6">
          <p className="text-sm leading-5 text-ink-600">
            Nothing due yet. Log a service with an interval to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="py-3.5 md:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink-900">{item.label}</p>
                <p className="text-sm text-ink-600">
                  {bikeName(bikes, item.bikeId)}
                  {item.remainingMi !== null
                    ? ` · ${Math.round(item.remainingMi).toLocaleString()} mi remaining`
                    : ''}
                  {item.remainingDays !== null
                    ? ` · ${item.remainingDays.toLocaleString()} days remaining`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onLogService(item)}
                className="min-h-10 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-shell-50"
              >
                Log service
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Wire page to new derived state**

In `src/pages/gear.tsx`:

- Replace `serviceEntries` reads with `gearPartCatalog`, `gearPartInstances`, `gearInstallRecords`, and `gearServiceEvents`.
- Set default tab to `active`.
- Derive selected bike with `bikes.find((bike) => bike.id === selectedBikeId)`.
- Call `deriveActiveSetup` and `deriveGearDue`.
- Render `ActiveSetupList`, `GearDueList`, `PartsInventory`, and `GearHistoryList` by tab.
- Keep `BikePillRow`, `useStravaGear`, and `upsertBikesFromStrava`.

Use this state shape for sheets, even before the sheets exist:

```ts
const [installSlotKey, setInstallSlotKey] = useState<BikeSlotKey | null>(null);
const [removeInstallId, setRemoveInstallId] = useState<string | null>(null);
const [serviceContext, setServiceContext] = useState<{
  bikeId?: string;
  slotKey?: BikeSlotKey;
  partInstanceId?: string;
  typeKey?: GearServiceTypeKey;
} | null>(null);
```

- [ ] **Step 5: Run build and fix old import errors**

Run:

```bash
npm run build
```

Expected: build may fail because old `DueList`, `HistoryList`, and `LogServiceSheet` still reference removed types. Fix by removing their imports from `src/pages/gear.tsx`; leave files unused for now.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/components/gear/gear-tabs.tsx src/components/gear/active-setup-list.tsx src/components/gear/gear-due-list.tsx src/components/gear/parts-inventory.tsx src/components/gear/gear-history-list.tsx src/pages/gear.tsx
git commit -m "feat(gear): add gear hub views"
```

## Task 5: Parts Catalog and Instance Inventory UI

**Files:**
- Create: `src/components/gear/part-catalog-form.tsx`
- Create: `src/components/gear/part-instance-form.tsx`
- Modify: `src/components/gear/parts-inventory.tsx`
- Modify: `src/pages/gear.tsx`

- [ ] **Step 1: Create catalog form**

Create `src/components/gear/part-catalog-form.tsx` with controlled inputs for:

- category
- brand
- model
- weight grams
- category attributes
- notes

The submit payload type is:

```ts
type CatalogSubmit = Omit<GearPartCatalogItem, 'id' | 'createdAt' | 'updatedAt'>;
```

The form must enforce these required fields before calling `onSubmit`:

- `model`
- tire `widthMm`
- cassette `range`
- chainring `toothCount`

Use existing `Input`, `Select`, and `Button` primitives from `src/components/ui`.

- [ ] **Step 2: Create instance form**

Create `src/components/gear/part-instance-form.tsx`:

```tsx
import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import type { GearPartCatalogItem } from '@/types/gear';

interface PartInstanceFormProps {
  catalog: GearPartCatalogItem[];
  onSubmit: (input: {
    catalogItemId: string;
    quantity: number;
    labelPrefix?: string;
    acquiredDateIso?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export function PartInstanceForm({
  catalog,
  onSubmit,
  onCancel,
}: PartInstanceFormProps) {
  const [catalogItemId, setCatalogItemId] = useState(catalog[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [labelPrefix, setLabelPrefix] = useState('');
  const [acquiredDateIso, setAcquiredDateIso] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <form
      className="space-y-3 md:space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedQuantity = Number(quantity);
        if (!catalogItemId || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) return;
        onSubmit({
          catalogItemId,
          quantity: parsedQuantity,
          labelPrefix: labelPrefix.trim() || undefined,
          acquiredDateIso: acquiredDateIso || undefined,
          notes: notes.trim() || undefined,
        });
      }}
    >
      <Select
        label="Catalog part"
        value={catalogItemId}
        onChange={(event) => setCatalogItemId(event.target.value)}
        options={catalog.map((item) => ({
          value: item.id,
          label: [item.brand, item.model].filter(Boolean).join(' '),
        }))}
      />
      <Input
        label="Quantity"
        type="number"
        min="1"
        step="1"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
      />
      <Input
        label="Label prefix"
        placeholder="e.g., GP5000"
        value={labelPrefix}
        onChange={(event) => setLabelPrefix(event.target.value)}
      />
      <Input
        label="Acquired date"
        type="date"
        value={acquiredDateIso}
        onChange={(event) => setAcquiredDateIso(event.target.value)}
      />
      <Input
        label="Notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit">Add instances</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Expand parts inventory**

In `src/components/gear/parts-inventory.tsx`, render:

- catalog item count
- instance count by status
- add catalog button
- add instances button
- catalog list grouped by category
- instance list grouped by status

Use existing card/list styling from `src/pages/inventory.tsx`, but keep this component inside gear.

- [ ] **Step 4: Wire inventory forms in gear page**

In `src/pages/gear.tsx`, add local state:

```ts
const [partsMode, setPartsMode] = useState<'list' | 'catalog' | 'instances'>('list');
```

Pass actions:

```ts
const addGearPartCatalogItem = useStore((state) => state.addGearPartCatalogItem);
const addGearPartInstances = useStore((state) => state.addGearPartInstances);
```

When a form submits, call the store action and return to list mode.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/components/gear/part-catalog-form.tsx src/components/gear/part-instance-form.tsx src/components/gear/parts-inventory.tsx src/pages/gear.tsx
git commit -m "feat(gear): add mechanical parts inventory"
```

## Task 6: Install, Remove, Retire, and Service Sheets

**Files:**
- Create: `src/components/gear/install-part-sheet.tsx`
- Create: `src/components/gear/remove-part-sheet.tsx`
- Create: `src/components/gear/log-gear-service-sheet.tsx`
- Modify: `src/pages/gear.tsx`

- [ ] **Step 1: Create install sheet**

Create `src/components/gear/install-part-sheet.tsx` using the dialog pattern from `src/components/gear/log-service-sheet.tsx`. Props:

```ts
interface InstallPartSheetProps {
  open: boolean;
  onClose: () => void;
  bikeId: string | null;
  slotKey: BikeSlotKey | null;
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  currentMileageMi: number | null;
  onInstall: (input: {
    bikeId: string;
    partInstanceId: string;
    slotKey: BikeSlotKey;
    installedAtMileageMi: number;
    installedDateIso: string;
  }) => void;
}
```

The instance selector must only show `spare` and `removed` instances compatible with `slotKey`. On submit, run `validateInstallDraft`.

- [ ] **Step 2: Create remove sheet**

Create `src/components/gear/remove-part-sheet.tsx`. Props:

```ts
interface RemovePartSheetProps {
  open: boolean;
  onClose: () => void;
  installRecord: GearInstallRecord | null;
  instance: GearPartInstance | null;
  catalogItem: GearPartCatalogItem | null;
  currentMileageMi: number | null;
  onRemove: (input: {
    installRecordId: string;
    removedAtMileageMi: number;
    removedDateIso: string;
    removeReason?: GearInstallRecord['removeReason'];
    nextStatus: 'removed' | 'retired';
  }) => void;
}
```

The form offers a status choice:

- `removed` label: `Remove and keep for later`
- `retired` label: `Retire permanently`

On submit, run `validateRemoveDraft`.

- [ ] **Step 3: Create service sheet**

Create `src/components/gear/log-gear-service-sheet.tsx`. Props:

```ts
interface LogGearServiceSheetProps {
  open: boolean;
  onClose: () => void;
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  initialContext: {
    bikeId?: string;
    slotKey?: BikeSlotKey;
    partInstanceId?: string;
    typeKey?: GearServiceTypeKey;
  } | null;
  currentMileageMi: number | null;
  onSave: (event: Omit<
    GearServiceEvent,
    'id' | 'createdAt' | 'updatedAt' | 'nextDueMileageMi' | 'nextDueDateIso'
  >) => void;
}
```

Fields:

- service type
- bike
- slot
- installed part instance
- date
- mileage
- interval miles
- interval days
- materials note
- notes

Defaults:

- date: today
- mileage: selected bike cached odometer when available
- interval: preset defaults from `getGearServiceType`

On submit, run `validateServiceDraft`.

- [ ] **Step 4: Wire sheets in page**

In `src/pages/gear.tsx`:

- Render `InstallPartSheet` when `installSlotKey !== null`.
- Render `RemovePartSheet` when `removeInstallId !== null`.
- Render `LogGearServiceSheet` when `serviceContext !== null`.
- Pass store actions `installGearPart`, `removeGearPart`, and `logGearServiceEvent`.
- Close each sheet after successful submit.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/components/gear/install-part-sheet.tsx src/components/gear/remove-part-sheet.tsx src/components/gear/log-gear-service-sheet.tsx src/pages/gear.tsx
git commit -m "feat(gear): add component lifecycle sheets"
```

## Task 7: History, Old Gear Cleanup, and Full Verification

**Files:**
- Modify: `src/components/gear/gear-history-list.tsx`
- Modify: `src/pages/gear.tsx`
- Delete or leave unused until a later cleanup commit: `src/components/gear/log-service-sheet.tsx`, `src/components/gear/due-list.tsx`, `src/components/gear/history-list.tsx`
- Modify: `src/lib/gear/service-types.ts` only if no imports remain.
- Modify: `src/lib/gear/derive-due.ts` only if no imports remain.
- Modify: `src/lib/gear/validate-service-entry.ts` only if no imports remain.

- [ ] **Step 1: Finish history list**

Update `src/components/gear/gear-history-list.tsx` to combine:

- `gearServiceEvents`
- completed `gearInstallRecords`
- active `gearInstallRecords`

Sort newest first by date. Display:

- service events as `Service · Chain wax · Force E1 · 2026-04-18`
- install records as `Install · Rear tire · GP5000 #1 · 2026-04-18`
- remove records as `Remove · Rear tire · GP5000 #1 · 2026-05-01`

- [ ] **Step 2: Remove old gear page dependencies**

Run:

```bash
rg -n "ServiceEntry|ServiceTypeKey|deriveDue|validateServiceEntry|LogServiceSheet|DueList|HistoryList" src
```

Expected after cleanup: matches only in old files that are deliberately unused, or no matches. If no old imports remain, delete the unused old files and their old tests in a cleanup commit:

```bash
git rm src/components/gear/log-service-sheet.tsx src/components/gear/due-list.tsx src/components/gear/history-list.tsx
git rm src/lib/gear/derive-due.ts src/lib/gear/derive-due.test.ts
git rm src/lib/gear/validate-service-entry.ts src/lib/gear/__tests__/validate-service-entry.test.ts
git rm src/lib/gear/service-types.ts src/lib/gear/service-types.test.ts
```

If any old files are still imported by tests that are not part of Gear Hub V2, update those imports to v2 modules before deleting.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run lint
npx vitest run
npm run build
```

Expected: all pass.

- [ ] **Step 4: Manual local verification**

Run:

```bash
npm run dev
```

Open the local URL printed by Vite. Verify:

- `/gear` loads.
- Strava bike refresh still updates bikes.
- Active setup shows seven fixed slots.
- Add catalog part works for tire, chain, cassette, brake pad, and chainring.
- Add two instances from one catalog item works.
- Install a spare instance into a compatible slot.
- Incompatible install is blocked.
- Remove an installed part to `removed`.
- Retire an installed part to `retired`.
- Log chain wax with mileage interval and see due item update.
- Log tire inspection with day interval and see due item update.
- Refresh page and confirm data persists locally.

Stop the dev server after verification.

- [ ] **Step 5: Commit**

Run:

```bash
git add src
git commit -m "feat(gear): finish gear hub v2 workflows"
```

## Task 8: Cloud Sync Dev Reset Verification

**Files:**
- Modify only if a defect is found: `src/lib/cloud/app-state.ts`, `src/store/index.ts`, `src/lib/auth/auth-provider.tsx`

- [ ] **Step 1: Verify snapshot content in tests**

Run:

```bash
npx vitest run src/lib/cloud/app-state.test.ts src/lib/cloud/sync.test.ts src/store/index.test.ts
```

Expected: pass.

- [ ] **Step 2: Verify browser persistence manually**

With `npm run dev` running:

1. Create one catalog item.
2. Create one instance.
3. Install it on the selected bike.
4. Log one service event.
5. Open browser dev tools.
6. Inspect localStorage key `cycling-nutrition-storage`.
7. Confirm JSON includes `gearPartCatalog`, `gearPartInstances`, `gearInstallRecords`, and `gearServiceEvents`.

- [ ] **Step 3: Verify cloud write manually when signed in**

In the app:

1. Sign in.
2. Create or update one gear item.
3. Wait for sync status to show current.
4. In Supabase, inspect `public.user_state.app_state`.
5. Confirm the four v2 gear arrays are present.

If stale cloud data blocks the app during development, delete the user row:

```sql
delete from public.user_state where user_id = '<your-user-id>';
```

Then reload the app and let it upload the current local snapshot.

- [ ] **Step 4: Final verification**

Run:

```bash
npm run lint
npx vitest run
npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit defects found during verification**

If Step 2 or Step 3 required fixes, commit them:

```bash
git add src
git commit -m "fix(gear): verify gear hub cloud sync"
```

If no fixes were needed, no commit is needed for this task.

## Self-Review Checklist for Implementer

Before marking the implementation complete, confirm every item below:

- Gear-specific inventory lives under `/gear`; nutrition inventory remains separate.
- Bikes still sync from Strava through the existing edge function and hook.
- Odometer refresh changes active component mileage.
- Catalog item details are reusable across multiple physical instances.
- Instances can be `spare`, `installed`, `removed`, or `retired`.
- Install actions create active install records.
- Remove and retire actions complete active install records.
- Service events can attach to bike, slot, and exact part instance.
- Mileage intervals produce `nextDueMileageMi`.
- Day intervals produce `nextDueDateIso`.
- Due list handles mileage and date items.
- App-state schema version is `2`.
- Supabase still uses `user_state.app_state`; no normalized gear tables are added.
- Old `serviceEntries` are dropped or ignored during Gear Hub V2 normalization.
- Full verification passes: `npm run lint`, `npx vitest run`, `npm run build`.

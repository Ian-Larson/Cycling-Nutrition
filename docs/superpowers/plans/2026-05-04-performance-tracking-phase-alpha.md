# Performance Tracking — Phase α (Foundations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the foundation of the Performance page — FTP/weight history logs, the Hero strip, and the Trend trio chart — with no Strava dependency. The rider can manually log FTP and weight changes through the Account page and watch their w/kg trend on `/performance`.

**Architecture:** Two new appendable history arrays (`ftpHistory`, `weightHistory`) live inside the existing Zustand store and ride the existing `AppDataSnapshot` cloud-sync path — no new Supabase tables. `updateAthleteProfile` becomes the single funnel that appends a history row whenever FTP or weight changes. A pure derivation library (`src/lib/performance/`) computes w/kg points by closest-prior history lookup. The page itself is a thin shell composing four components: `<HeroStrip>`, `<RangeToggle>`, `<TrendTrioChart>`, and `<EmptyState>`. The chart is hand-rolled SVG, matching the analyzer pattern.

**Tech Stack:** React 19 + TypeScript + Vite + Zustand (with `persist` and `immer` middleware) + Tailwind CSS v4 + Vitest + Testing Library. Hand-rolled SVG charts and UI primitives.

**Spec:** `docs/superpowers/specs/2026-05-04-performance-tracking-design.md`

**Out of scope (deferred to Phase β / γ):** Strava activity sync, `activities` table, mean-max curves, PR tiles, Power Profile hexagon, period-over-period comparison.

---

## File structure (after the change)

**Created**
- `src/types/performance.ts` — `FtpHistoryEntry`, `WeightHistoryEntry`
- `src/lib/performance/history.ts` — `closestPriorEntry`, history mutators
- `src/lib/performance/history.test.ts`
- `src/lib/performance/wkg.ts` — w/kg derivation helpers
- `src/lib/performance/wkg.test.ts`
- `src/pages/performance.tsx` — `/performance` page shell
- `src/components/performance/hero-strip.tsx`
- `src/components/performance/hero-strip.test.tsx`
- `src/components/performance/range-toggle.tsx`
- `src/components/performance/range-toggle.test.tsx`
- `src/components/performance/trend-trio-chart.tsx`
- `src/components/performance/trend-trio-chart.test.tsx`
- `src/components/performance/empty-state.tsx`
- `src/components/account/history-editor.tsx` — combined FTP + weight history editor
- `src/components/account/history-editor.test.tsx`

**Modified**
- `src/types/index.ts` — re-export new performance types
- `src/store/index.ts` — add history slices, `updateAthleteProfile` history-append hook, snapshot serialization, normalization, actions
- `src/store/index.test.ts` — cover the new actions and the append-on-edit hook
- `src/lib/cloud/app-state.ts` — accept the wider `SerializeAppStateInput`, bump `APP_STATE_SCHEMA_VERSION` to `3`, accept `1 | 2 | 3`
- `src/lib/cloud/app-state.test.ts` — cover the version bump + history round-trip
- `src/App.tsx` — register `/performance` route
- `src/components/layout/navigation.ts` — add Performance to `primaryNavItems`
- `src/pages/account.tsx` — mount `<HistoryEditor>` next to existing athlete fields

---

## Conventions used throughout

- **Test runner:** `npm run test` (Vitest). Single-file run: `npx vitest run path/to/file.test.ts`. Watch one file: `npx vitest path/to/file.test.ts`.
- **TDD beat:** write failing test → run → see it fail → write minimal code → run → see it pass → commit. Each task spells this out.
- **Commits:** Conventional Commits (`feat:`, `test:`, `refactor:`, `chore:`). Co-authored-by trailer is added by Claude Code automatically — do not write it manually.
- **Imports:** `@/...` alias to `src/`. Never use deep relative paths.
- **IDs:** `nanoid()` from the existing import in `src/store/index.ts`.
- **Timestamps:** ISO 8601 strings (`new Date().toISOString()`), not epoch ms — matches the gear pattern (`acquiredDateIso`, `odometerSyncedAtIso`).
- **Charts:** hand-rolled SVG. Reference: `src/components/analyzer/power-time-series-chart.tsx` for layout idiom (fixed viewBox, `PLOT` margins, hover state via `useState`).

---

## Task 1: Define performance types

**Files:**
- Create: `src/types/performance.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/performance.ts

/**
 * One logged FTP value. The rider's "current FTP" is the most recent entry
 * (by recordedAt). History is append-only; edits issue a new entry and may
 * delete the prior one.
 */
export interface FtpHistoryEntry {
  id: string;
  /** ISO-8601 date the FTP value started applying. */
  recordedAt: string;
  ftpWatts: number;
  note?: string;
}

/**
 * One logged weight value. Mirror of FtpHistoryEntry.
 */
export interface WeightHistoryEntry {
  id: string;
  /** ISO-8601 date the weight value applied. */
  recordedAt: string;
  weightKg: number;
  note?: string;
}
```

- [ ] **Step 2: Re-export from the types barrel**

Open `src/types/index.ts` and add at the end:

```typescript
export type { FtpHistoryEntry, WeightHistoryEntry } from './performance';
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/types/performance.ts src/types/index.ts
git commit -m "feat(types): add FtpHistoryEntry + WeightHistoryEntry"
```

---

## Task 2: Closest-prior history lookup

**Files:**
- Create: `src/lib/performance/history.ts`
- Test: `src/lib/performance/history.test.ts`

The Trend trio and the eventual Power Profile both need to ask: "what was the FTP/weight on date X?" Answer = the entry with the largest `recordedAt` ≤ X. If none exists, undefined.

- [ ] **Step 1: Write the failing test file**

```typescript
// src/lib/performance/history.test.ts
import { describe, expect, it } from 'vitest';
import { closestPriorEntry } from './history';

interface Sample {
  id: string;
  recordedAt: string;
  value: number;
}

const fixture: Sample[] = [
  { id: 'a', recordedAt: '2025-01-15', value: 70 },
  { id: 'b', recordedAt: '2025-06-01', value: 72 },
  { id: 'c', recordedAt: '2025-12-20', value: 71 },
];

describe('closestPriorEntry', () => {
  it('returns undefined when history is empty', () => {
    expect(closestPriorEntry([], '2025-06-01')).toBeUndefined();
  });

  it('returns undefined when target precedes the first entry', () => {
    expect(closestPriorEntry(fixture, '2024-12-31')).toBeUndefined();
  });

  it('returns the exact-match entry when one exists', () => {
    expect(closestPriorEntry(fixture, '2025-06-01')?.id).toBe('b');
  });

  it('returns the latest entry on or before the target', () => {
    expect(closestPriorEntry(fixture, '2025-09-15')?.id).toBe('b');
  });

  it('returns the most recent entry when target is after all entries', () => {
    expect(closestPriorEntry(fixture, '2026-05-01')?.id).toBe('c');
  });

  it('does not require input to be pre-sorted', () => {
    const shuffled = [fixture[2], fixture[0], fixture[1]];
    expect(closestPriorEntry(shuffled, '2025-09-15')?.id).toBe('b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/performance/history.test.ts`
Expected: FAIL with `Cannot find module './history'`.

- [ ] **Step 3: Implement `closestPriorEntry`**

```typescript
// src/lib/performance/history.ts

interface DatedEntry {
  recordedAt: string;
}

/**
 * Returns the latest entry whose `recordedAt` is on or before `targetIsoDate`,
 * or `undefined` if none exists. Input does not need to be pre-sorted.
 */
export function closestPriorEntry<T extends DatedEntry>(
  entries: readonly T[],
  targetIsoDate: string
): T | undefined {
  let winner: T | undefined;
  for (const entry of entries) {
    if (entry.recordedAt > targetIsoDate) continue;
    if (!winner || entry.recordedAt > winner.recordedAt) {
      winner = entry;
    }
  }
  return winner;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/performance/history.test.ts`
Expected: PASS, six tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/performance/history.ts src/lib/performance/history.test.ts
git commit -m "feat(performance): add closestPriorEntry history helper"
```

---

## Task 3: W/kg derivation helpers

**Files:**
- Create: `src/lib/performance/wkg.ts`
- Test: `src/lib/performance/wkg.test.ts`

Three derivations: w/kg at any past date (for the chart), the current value, and a delta vs. N days ago (for the hero).

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/performance/wkg.test.ts
import { describe, expect, it } from 'vitest';
import {
  computeCurrentWkg,
  computeWkgAtDate,
  computeWkgDeltaVsDaysAgo,
} from './wkg';
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';

const ftp: FtpHistoryEntry[] = [
  { id: 'f1', recordedAt: '2025-01-01', ftpWatts: 250 },
  { id: 'f2', recordedAt: '2025-06-01', ftpWatts: 270 },
];

const weight: WeightHistoryEntry[] = [
  { id: 'w1', recordedAt: '2025-01-01', weightKg: 75 },
  { id: 'w2', recordedAt: '2025-09-01', weightKg: 73 },
];

describe('computeWkgAtDate', () => {
  it('returns undefined when either history is empty before target', () => {
    expect(computeWkgAtDate([], weight, '2025-12-01')).toBeUndefined();
    expect(computeWkgAtDate(ftp, [], '2025-12-01')).toBeUndefined();
  });

  it('uses closest-prior FTP and weight', () => {
    // 2025-07-15 → ftp 270 (since 2025-06-01), weight 75 (since 2025-01-01)
    expect(computeWkgAtDate(ftp, weight, '2025-07-15')).toBeCloseTo(3.6, 2);
  });

  it('updates when a new weight applies', () => {
    // 2025-12-01 → ftp 270, weight 73
    expect(computeWkgAtDate(ftp, weight, '2025-12-01')).toBeCloseTo(3.7, 2);
  });
});

describe('computeCurrentWkg', () => {
  it('returns undefined when ftp or weight is missing', () => {
    expect(computeCurrentWkg(undefined, 70)).toBeUndefined();
    expect(computeCurrentWkg(250, undefined)).toBeUndefined();
    expect(computeCurrentWkg(0, 70)).toBeUndefined();
    expect(computeCurrentWkg(250, 0)).toBeUndefined();
  });

  it('divides ftp by weight', () => {
    expect(computeCurrentWkg(280, 70)).toBeCloseTo(4.0, 2);
  });
});

describe('computeWkgDeltaVsDaysAgo', () => {
  it('returns undefined when there is no historical w/kg to compare against', () => {
    const result = computeWkgDeltaVsDaysAgo({
      ftpHistory: [],
      weightHistory: [],
      currentWkg: 4.0,
      daysAgo: 90,
      now: new Date('2026-01-01'),
    });
    expect(result).toBeUndefined();
  });

  it('returns the signed delta vs. the date N days ago', () => {
    const result = computeWkgDeltaVsDaysAgo({
      ftpHistory: ftp,
      weightHistory: weight,
      currentWkg: 3.7, // matches computeWkgAtDate('2025-12-01')
      daysAgo: 90,
      now: new Date('2026-03-01'),
    });
    // 2025-12-01 was 3.7, current 3.7 → delta 0
    expect(result).toBeCloseTo(0, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/performance/wkg.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helpers**

```typescript
// src/lib/performance/wkg.ts
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';
import { closestPriorEntry } from './history';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeCurrentWkg(
  ftpWatts: number | undefined,
  weightKg: number | undefined
): number | undefined {
  if (typeof ftpWatts !== 'number' || ftpWatts <= 0) return undefined;
  if (typeof weightKg !== 'number' || weightKg <= 0) return undefined;
  return ftpWatts / weightKg;
}

export function computeWkgAtDate(
  ftpHistory: readonly FtpHistoryEntry[],
  weightHistory: readonly WeightHistoryEntry[],
  isoDate: string
): number | undefined {
  const ftp = closestPriorEntry(ftpHistory, isoDate);
  const weight = closestPriorEntry(weightHistory, isoDate);
  if (!ftp || !weight || weight.weightKg <= 0) return undefined;
  return ftp.ftpWatts / weight.weightKg;
}

export interface WkgDeltaInput {
  ftpHistory: readonly FtpHistoryEntry[];
  weightHistory: readonly WeightHistoryEntry[];
  currentWkg: number;
  daysAgo: number;
  now?: Date;
}

export function computeWkgDeltaVsDaysAgo({
  ftpHistory,
  weightHistory,
  currentWkg,
  daysAgo,
  now = new Date(),
}: WkgDeltaInput): number | undefined {
  const target = new Date(now.getTime() - daysAgo * MS_PER_DAY);
  const isoDate = target.toISOString().slice(0, 10);
  const past = computeWkgAtDate(ftpHistory, weightHistory, isoDate);
  if (past === undefined) return undefined;
  return currentWkg - past;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/performance/wkg.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/performance/wkg.ts src/lib/performance/wkg.test.ts
git commit -m "feat(performance): add w/kg derivation helpers"
```

---

## Task 4: Store — history slices and CRUD actions

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/store/index.test.ts`

The store gets `ftpHistory` and `weightHistory` arrays plus add/edit/remove actions. The actions follow the existing `addProduct` / `updateProduct` / `deleteProduct` shape and use `nanoid()` + `immer`.

- [ ] **Step 1: Write failing tests for the new actions**

Append to `src/store/index.test.ts`:

```typescript
describe('FTP history actions', () => {
  beforeEach(() => {
    useStore.setState({ ftpHistory: [], weightHistory: [] });
  });

  it('addFtpEntry appends a row with a generated id', () => {
    useStore.getState().addFtpEntry({
      recordedAt: '2025-06-01',
      ftpWatts: 270,
    });
    const history = useStore.getState().ftpHistory;
    expect(history).toHaveLength(1);
    expect(history[0].id).toBeTruthy();
    expect(history[0].ftpWatts).toBe(270);
  });

  it('editFtpEntry updates the matching row', () => {
    useStore.getState().addFtpEntry({ recordedAt: '2025-06-01', ftpWatts: 270 });
    const id = useStore.getState().ftpHistory[0].id;
    useStore.getState().editFtpEntry(id, { ftpWatts: 275, note: 'recheck' });
    const updated = useStore.getState().ftpHistory[0];
    expect(updated.ftpWatts).toBe(275);
    expect(updated.note).toBe('recheck');
  });

  it('removeFtpEntry drops the matching row', () => {
    useStore.getState().addFtpEntry({ recordedAt: '2025-06-01', ftpWatts: 270 });
    const id = useStore.getState().ftpHistory[0].id;
    useStore.getState().removeFtpEntry(id);
    expect(useStore.getState().ftpHistory).toHaveLength(0);
  });
});

describe('Weight history actions', () => {
  beforeEach(() => {
    useStore.setState({ ftpHistory: [], weightHistory: [] });
  });

  it('addWeightEntry appends a row with a generated id', () => {
    useStore.getState().addWeightEntry({
      recordedAt: '2025-06-01',
      weightKg: 73,
    });
    const history = useStore.getState().weightHistory;
    expect(history).toHaveLength(1);
    expect(history[0].weightKg).toBe(73);
  });

  it('editWeightEntry updates the matching row', () => {
    useStore.getState().addWeightEntry({ recordedAt: '2025-06-01', weightKg: 73 });
    const id = useStore.getState().weightHistory[0].id;
    useStore.getState().editWeightEntry(id, { weightKg: 73.5 });
    expect(useStore.getState().weightHistory[0].weightKg).toBe(73.5);
  });

  it('removeWeightEntry drops the matching row', () => {
    useStore.getState().addWeightEntry({ recordedAt: '2025-06-01', weightKg: 73 });
    const id = useStore.getState().weightHistory[0].id;
    useStore.getState().removeWeightEntry(id);
    expect(useStore.getState().weightHistory).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/index.test.ts`
Expected: FAIL — `addFtpEntry is not a function` (and similar).

- [ ] **Step 3: Add the slices to `AppState`, `AppDataSnapshot`, defaults, and actions**

In `src/store/index.ts`:

a) Import the new types near the existing type imports:

```typescript
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';
```

b) Extend `AppDataSnapshot` (around line 79):

```typescript
export interface AppDataSnapshot {
  products: Product[];
  fuelPlans: FuelPlan[];
  settings: Settings;
  plannerDraft: PlannerDraft | null;
  bikes: Bike[];
  serviceEntries: ServiceEntry[];
  gearPartCatalog: GearPartCatalogItem[];
  gearPartInstances: GearPartInstance[];
  gearInstallRecords: GearInstallRecord[];
  gearServiceEvents: GearServiceEvent[];
  gearSelectedBikeId: string | null;
  ftpHistory: FtpHistoryEntry[];
  weightHistory: WeightHistoryEntry[];
}
```

c) Extend `AppState` (around line 103) — add the two arrays alongside the other slices, and add the action signatures somewhere near the end of the action block (before `_initialized`):

```typescript
  ftpHistory: FtpHistoryEntry[];
  weightHistory: WeightHistoryEntry[];

  // ... existing actions ...

  addFtpEntry: (entry: Omit<FtpHistoryEntry, 'id'>) => void;
  editFtpEntry: (id: string, updates: Partial<Omit<FtpHistoryEntry, 'id'>>) => void;
  removeFtpEntry: (id: string) => void;

  addWeightEntry: (entry: Omit<WeightHistoryEntry, 'id'>) => void;
  editWeightEntry: (id: string, updates: Partial<Omit<WeightHistoryEntry, 'id'>>) => void;
  removeWeightEntry: (id: string) => void;
```

d) Add defaults in the store creator (around line 594, alongside the other defaults):

```typescript
      ftpHistory: [],
      weightHistory: [],
```

e) Implement the six actions (place near the existing `updateAthleteProfile`):

```typescript
      addFtpEntry: (entry) =>
        set((state) => {
          state.ftpHistory.push({
            ...entry,
            id: nanoid(),
          });
        }),

      editFtpEntry: (id, updates) =>
        set((state) => {
          const index = state.ftpHistory.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.ftpHistory[index] = {
              ...state.ftpHistory[index],
              ...updates,
              id: state.ftpHistory[index].id,
            };
          }
        }),

      removeFtpEntry: (id) =>
        set((state) => {
          state.ftpHistory = state.ftpHistory.filter((e) => e.id !== id);
        }),

      addWeightEntry: (entry) =>
        set((state) => {
          state.weightHistory.push({
            ...entry,
            id: nanoid(),
          });
        }),

      editWeightEntry: (id, updates) =>
        set((state) => {
          const index = state.weightHistory.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.weightHistory[index] = {
              ...state.weightHistory[index],
              ...updates,
              id: state.weightHistory[index].id,
            };
          }
        }),

      removeWeightEntry: (id) =>
        set((state) => {
          state.weightHistory = state.weightHistory.filter((e) => e.id !== id);
        }),
```

f) Update `getAppDataFromState` (around line 471) to include the new arrays in its `Pick<>` and its return value:

```typescript
export function getAppDataFromState(
  state: Pick<
    AppState,
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
    | 'gearSelectedBikeId'
    | 'ftpHistory'
    | 'weightHistory'
  >
): AppDataSnapshot {
  return {
    products: state.products,
    fuelPlans: state.fuelPlans,
    settings: state.settings,
    plannerDraft: state.plannerDraft,
    bikes: state.bikes,
    serviceEntries: [],
    gearPartCatalog: state.gearPartCatalog,
    gearPartInstances: state.gearPartInstances,
    gearInstallRecords: state.gearInstallRecords,
    gearServiceEvents: state.gearServiceEvents,
    gearSelectedBikeId: state.gearSelectedBikeId,
    ftpHistory: state.ftpHistory,
    weightHistory: state.weightHistory,
  };
}
```

g) Update `normalizeAppData` (around line 502) to default the new arrays:

```typescript
    ftpHistory: Array.isArray(incoming?.ftpHistory)
      ? (incoming.ftpHistory as FtpHistoryEntry[])
      : fallback.ftpHistory,
    weightHistory: Array.isArray(incoming?.weightHistory)
      ? (incoming.weightHistory as WeightHistoryEntry[])
      : fallback.weightHistory,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/index.test.ts`
Expected: PASS, including the six new tests.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/index.ts src/store/index.test.ts
git commit -m "feat(store): add ftp/weight history slices and CRUD actions"
```

---

## Task 5: Append-on-edit hook in `updateAthleteProfile`

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/store/index.test.ts`

When the rider edits their FTP or weight on the Account page, append a history entry. This keeps the existing single-value `athleteProfile.ftpWatts` / `weightKg` as the "current" pointer while accumulating timestamped history.

Skip the append when the new value equals the current (e.g., the user opened the field and re-saved unchanged).

- [ ] **Step 1: Write failing tests**

Append to `src/store/index.test.ts`:

```typescript
describe('updateAthleteProfile history append', () => {
  beforeEach(() => {
    useStore.setState({
      ftpHistory: [],
      weightHistory: [],
      settings: {
        ...useStore.getState().settings,
        athleteProfile: {
          ...useStore.getState().settings.athleteProfile,
          ftpWatts: 250,
          weightKg: 75,
        },
      },
    });
  });

  it('appends an FTP history entry when ftpWatts changes', () => {
    useStore.getState().updateAthleteProfile({ ftpWatts: 270 });
    const history = useStore.getState().ftpHistory;
    expect(history).toHaveLength(1);
    expect(history[0].ftpWatts).toBe(270);
    expect(history[0].recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('appends a weight history entry when weightKg changes', () => {
    useStore.getState().updateAthleteProfile({ weightKg: 73 });
    const history = useStore.getState().weightHistory;
    expect(history).toHaveLength(1);
    expect(history[0].weightKg).toBe(73);
  });

  it('does not append when the value is unchanged', () => {
    useStore.getState().updateAthleteProfile({ ftpWatts: 250 });
    expect(useStore.getState().ftpHistory).toHaveLength(0);
  });

  it('does not append when the field is not part of the update', () => {
    useStore.getState().updateAthleteProfile({ name: 'Ian' });
    expect(useStore.getState().ftpHistory).toHaveLength(0);
    expect(useStore.getState().weightHistory).toHaveLength(0);
  });

  it('appends both when both change in one update', () => {
    useStore.getState().updateAthleteProfile({ ftpWatts: 270, weightKg: 73 });
    expect(useStore.getState().ftpHistory).toHaveLength(1);
    expect(useStore.getState().weightHistory).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/index.test.ts -t "updateAthleteProfile history append"`
Expected: FAIL — history arrays empty after the action.

- [ ] **Step 3: Modify `updateAthleteProfile`**

Find the existing `updateAthleteProfile` action (search for `updateAthleteProfile: (updates) =>`) and replace it with:

```typescript
      updateAthleteProfile: (updates) =>
        set((state) => {
          const today = new Date().toISOString().slice(0, 10);
          const previous = state.settings.athleteProfile;

          if (
            typeof updates.ftpWatts === 'number' &&
            updates.ftpWatts > 0 &&
            updates.ftpWatts !== previous.ftpWatts
          ) {
            state.ftpHistory.push({
              id: nanoid(),
              recordedAt: today,
              ftpWatts: updates.ftpWatts,
            });
          }

          if (
            typeof updates.weightKg === 'number' &&
            updates.weightKg > 0 &&
            updates.weightKg !== previous.weightKg
          ) {
            state.weightHistory.push({
              id: nanoid(),
              recordedAt: today,
              weightKg: updates.weightKg,
            });
          }

          Object.assign(state.settings.athleteProfile, updates);
        }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/index.test.ts`
Expected: PASS, all tests including the five new ones.

- [ ] **Step 5: Commit**

```bash
git add src/store/index.ts src/store/index.test.ts
git commit -m "feat(store): append history on athlete profile FTP/weight change"
```

---

## Task 6: Cloud sync — bump schema and round-trip new fields

**Files:**
- Modify: `src/lib/cloud/app-state.ts`
- Modify: `src/lib/cloud/app-state.test.ts`

The cloud snapshot already serializes `AppDataSnapshot` as JSONB on the `user_state` row. Since Task 4 added `ftpHistory` / `weightHistory` to `AppDataSnapshot`, they ride the same path automatically. We bump the schema version from `2` to `3` so old clients realize they're behind, and we widen the accepted-version set to `{1, 2, 3}`.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/cloud/app-state.test.ts`:

```typescript
describe('serializeAppState — performance history', () => {
  it('round-trips ftpHistory and weightHistory', () => {
    const ftp = [
      { id: 'f1', recordedAt: '2025-06-01', ftpWatts: 270 },
    ];
    const weight = [
      { id: 'w1', recordedAt: '2025-06-01', weightKg: 73 },
    ];
    // `baseState` is the module-level fixture defined at the top of this file.
    const serialized = serializeAppState({
      ...baseState,
      ftpHistory: ftp,
      weightHistory: weight,
    });
    expect(serialized.schemaVersion).toBe(3);
    expect(serialized.data.ftpHistory).toEqual(ftp);
    expect(serialized.data.weightHistory).toEqual(weight);
  });
});

describe('parseSerializedAppState — schema version 3', () => {
  it('accepts a v3 snapshot', () => {
    const fallback = serializeAppState(baseState).data;
    const snapshot = {
      schemaVersion: 3,
      clientUpdatedAt: '2026-05-04T00:00:00.000Z',
      data: fallback,
    };
    const parsed = parseSerializedAppState(snapshot, fallback);
    expect(parsed.ok).toBe(true);
  });
});
```

> Note: `baseState` is the module-level `Pick<AppState, ...>` fixture already defined at the top of this test file. Re-use it rather than introducing new helpers. If you need a snapshot fallback, derive it inline via `serializeAppState(baseState).data`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/cloud/app-state.test.ts`
Expected: FAIL — `schemaVersion` is `2`, not `3`.

- [ ] **Step 3: Update the schema version + widen accepted versions**

In `src/lib/cloud/app-state.ts`:

```typescript
export const APP_STATE_SCHEMA_VERSION = 3;
```

Find the version check inside `parseSerializedAppState` and replace:

```typescript
  if (
    incoming.schemaVersion !== APP_STATE_SCHEMA_VERSION &&
    incoming.schemaVersion !== 2 &&
    incoming.schemaVersion !== 1
  ) {
    return {
      ok: false,
      error: `Unsupported cloud snapshot version: ${String(incoming.schemaVersion)}`,
    };
  }
```

Widen `SerializeAppStateInput` to allow optional `ftpHistory` / `weightHistory`:

```typescript
type SerializeAppStateInput = Pick<
  AppState,
  | 'products'
  | 'fuelPlans'
  | 'settings'
  | 'plannerDraft'
  | 'bikes'
  | 'serviceEntries'
> &
  Partial<
    Pick<
      AppState,
      | 'gearPartCatalog'
      | 'gearPartInstances'
      | 'gearInstallRecords'
      | 'gearServiceEvents'
      | 'gearSelectedBikeId'
      | 'ftpHistory'
      | 'weightHistory'
    >
  >;
```

Update `withGearHubStateDefaults` (or rename mentally; we'll keep the name since it now also defaults perf fields) to include the new arrays:

```typescript
function withGearHubStateDefaults(
  state: SerializeAppStateInput
): Pick<
    AppState,
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
    | 'gearSelectedBikeId'
    | 'ftpHistory'
    | 'weightHistory'
  > {
  return {
    ...state,
    gearPartCatalog: state.gearPartCatalog ?? [],
    gearPartInstances: state.gearPartInstances ?? [],
    gearInstallRecords: state.gearInstallRecords ?? [],
    gearServiceEvents: state.gearServiceEvents ?? [],
    gearSelectedBikeId: state.gearSelectedBikeId ?? null,
    ftpHistory: state.ftpHistory ?? [],
    weightHistory: state.weightHistory ?? [],
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/cloud/app-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. If the existing call sites of `serializeAppState` complain, follow the type errors and pass `ftpHistory: []` / `weightHistory: []` from the relevant store snapshots — but this should not happen because those fields are `Partial<>`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cloud/app-state.ts src/lib/cloud/app-state.test.ts
git commit -m "feat(cloud): bump schema to v3 with ftp/weight history"
```

---

## Task 7: Range toggle component

**Files:**
- Create: `src/components/performance/range-toggle.tsx`
- Test: `src/components/performance/range-toggle.test.tsx`

A horizontal segmented control: `3mo` / `6mo` / `12mo` / `All`. Reuses the existing `<Button>` primitive — do NOT introduce a new visual idiom.

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/range-toggle.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RangeToggle, type RangeKey } from './range-toggle';

describe('RangeToggle', () => {
  it('renders four options', () => {
    render(<RangeToggle value="12mo" onChange={() => {}} />);
    ['3mo', '6mo', '12mo', 'All'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('marks the current option as pressed', () => {
    render(<RangeToggle value="6mo" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '6mo' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: '12mo' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('calls onChange with the clicked key', () => {
    const onChange = vi.fn<(key: RangeKey) => void>();
    render(<RangeToggle value="12mo" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3mo' }));
    expect(onChange).toHaveBeenCalledWith('3mo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/performance/range-toggle.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/performance/range-toggle.tsx
import { clsx } from 'clsx';

export type RangeKey = '3mo' | '6mo' | '12mo' | 'all';

const OPTIONS: readonly { key: RangeKey; label: string }[] = [
  { key: '3mo', label: '3mo' },
  { key: '6mo', label: '6mo' },
  { key: '12mo', label: '12mo' },
  { key: 'all', label: 'All' },
];

interface RangeToggleProps {
  value: RangeKey;
  onChange: (key: RangeKey) => void;
}

export function RangeToggle({ value, onChange }: RangeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
      {OPTIONS.map((opt) => {
        const pressed = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(opt.key)}
            className={clsx(
              'px-3 py-1 text-sm font-medium rounded-sm transition-colors',
              pressed
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/performance/range-toggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/range-toggle.tsx src/components/performance/range-toggle.test.tsx
git commit -m "feat(performance): add range toggle component"
```

---

## Task 8: Trend trio chart (hand-rolled SVG)

**Files:**
- Create: `src/components/performance/trend-trio-chart.tsx`
- Test: `src/components/performance/trend-trio-chart.test.tsx`

Three overlaid lines: w/kg, FTP (watts), weight (kg). Each line has a normalized y-axis (we plot `% change from start of range`) so all three fit one axis without competing units. The component receives pre-computed `series` from the page, not raw history.

The chart is a fixed-viewBox SVG with simple linear interpolation between points. No tooltips for v0.1 — that's polish.

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/trend-trio-chart.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrendTrioChart } from './trend-trio-chart';

const series = {
  wkg: [
    { dateIso: '2025-01-01', value: 3.4 },
    { dateIso: '2025-06-01', value: 3.6 },
    { dateIso: '2025-12-01', value: 3.7 },
  ],
  ftp: [
    { dateIso: '2025-01-01', value: 250 },
    { dateIso: '2025-06-01', value: 270 },
    { dateIso: '2025-12-01', value: 270 },
  ],
  weight: [
    { dateIso: '2025-01-01', value: 75 },
    { dateIso: '2025-06-01', value: 75 },
    { dateIso: '2025-09-01', value: 73 },
  ],
};

describe('TrendTrioChart', () => {
  it('renders an SVG with three line paths', () => {
    const { container } = render(<TrendTrioChart series={series} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('path[data-series]')).toHaveLength(3);
  });

  it('renders a legend with all three labels', () => {
    render(<TrendTrioChart series={series} />);
    expect(screen.getByText(/W\/kg/)).toBeInTheDocument();
    expect(screen.getByText(/FTP/)).toBeInTheDocument();
    expect(screen.getByText(/Weight/)).toBeInTheDocument();
  });

  it('renders a hint when all three series are empty', () => {
    render(
      <TrendTrioChart
        series={{ wkg: [], ftp: [], weight: [] }}
      />
    );
    expect(screen.getByText(/log your ftp and weight/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/performance/trend-trio-chart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/performance/trend-trio-chart.tsx
import { useMemo } from 'react';

const WIDTH = 800;
const HEIGHT = 280;
const PLOT = { left: 40, right: 16, top: 16, bottom: 32 };

const PLOT_W = WIDTH - PLOT.left - PLOT.right;
const PLOT_H = HEIGHT - PLOT.top - PLOT.bottom;

export interface TrendPoint {
  dateIso: string;
  value: number;
}

export interface TrendSeries {
  wkg: TrendPoint[];
  ftp: TrendPoint[];
  weight: TrendPoint[];
}

interface TrendTrioChartProps {
  series: TrendSeries;
}

const COLORS = {
  wkg: '#f8622e',
  ftp: '#2563eb',
  weight: '#059669',
};

const LABELS = {
  wkg: 'W/kg',
  ftp: 'FTP (W)',
  weight: 'Weight (kg)',
};

type Key = keyof TrendSeries;

export function TrendTrioChart({ series }: TrendTrioChartProps) {
  const allEmpty = useMemo(
    () =>
      series.wkg.length === 0 &&
      series.ftp.length === 0 &&
      series.weight.length === 0,
    [series]
  );

  const xExtent = useMemo(() => extentDates(series), [series]);

  if (allEmpty || !xExtent) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-600">
        Log your FTP and weight to see your w/kg trend.
      </div>
    );
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="W/kg, FTP, and weight trend over time (normalized)"
        className="w-full h-auto"
      >
        {(['wkg', 'ftp', 'weight'] as Key[]).map((key) => {
          const points = normalize(series[key]);
          if (points.length === 0) return null;
          const d = pathFromPoints(points, xExtent);
          return (
            <path
              key={key}
              data-series={key}
              d={d}
              fill="none"
              stroke={COLORS[key]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <ul className="flex gap-4 px-2 pt-2 text-xs text-neutral-700">
        {(['wkg', 'ftp', 'weight'] as Key[]).map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[key] }}
            />
            {LABELS[key]}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface NormalizedPoint {
  dateIso: string;
  pct: number; // % change from first value in series
}

function normalize(points: TrendPoint[]): NormalizedPoint[] {
  if (points.length === 0) return [];
  const base = points[0].value;
  if (base === 0) return [];
  return points.map((p) => ({
    dateIso: p.dateIso,
    pct: (p.value - base) / base,
  }));
}

function extentDates(series: TrendSeries): [number, number] | null {
  const all: number[] = [];
  for (const key of ['wkg', 'ftp', 'weight'] as Key[]) {
    for (const p of series[key]) {
      all.push(Date.parse(p.dateIso));
    }
  }
  if (all.length === 0) return null;
  return [Math.min(...all), Math.max(...all)];
}

function pathFromPoints(
  points: NormalizedPoint[],
  xExtent: [number, number]
): string {
  const [xMin, xMax] = xExtent;
  const xSpan = xMax - xMin || 1;

  // Y-axis: ±15% as ±half-plot. Clamp.
  const yScale = (pct: number) => {
    const clamped = Math.max(-0.15, Math.min(0.15, pct));
    return PLOT.top + PLOT_H / 2 - (clamped / 0.15) * (PLOT_H / 2);
  };

  return points
    .map((p, i) => {
      const x = PLOT.left + ((Date.parse(p.dateIso) - xMin) / xSpan) * PLOT_W;
      const y = yScale(p.pct);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/performance/trend-trio-chart.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/trend-trio-chart.tsx src/components/performance/trend-trio-chart.test.tsx
git commit -m "feat(performance): add trend trio chart (svg)"
```

---

## Task 9: Hero strip component

**Files:**
- Create: `src/components/performance/hero-strip.tsx`
- Test: `src/components/performance/hero-strip.test.tsx`

Renders the big w/kg numeral, the delta label, and FTP+weight subtext. If `currentWkg` is `undefined`, renders the "log your FTP and weight" prompt.

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/hero-strip.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroStrip } from './hero-strip';

describe('HeroStrip', () => {
  it('renders the w/kg numeral with one decimal', () => {
    render(
      <HeroStrip
        currentWkg={4.07}
        delta90d={0.18}
        ftpWatts={285}
        weightKg={70}
      />
    );
    expect(screen.getByText('4.1')).toBeInTheDocument();
  });

  it('renders the delta with sign and arrow', () => {
    render(
      <HeroStrip
        currentWkg={4.0}
        delta90d={0.2}
        ftpWatts={280}
        weightKg={70}
      />
    );
    expect(screen.getByText(/↑\s*\+0\.2/)).toBeInTheDocument();
  });

  it('renders a downward arrow for negative deltas', () => {
    render(
      <HeroStrip
        currentWkg={4.0}
        delta90d={-0.1}
        ftpWatts={280}
        weightKg={70}
      />
    );
    expect(screen.getByText(/↓\s*0\.1/)).toBeInTheDocument();
  });

  it('omits delta when undefined', () => {
    render(
      <HeroStrip
        currentWkg={4.0}
        delta90d={undefined}
        ftpWatts={280}
        weightKg={70}
      />
    );
    expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
    expect(screen.queryByText(/↓/)).not.toBeInTheDocument();
  });

  it('renders FTP and weight subtext', () => {
    render(
      <HeroStrip
        currentWkg={4.0}
        delta90d={undefined}
        ftpWatts={280}
        weightKg={70}
      />
    );
    expect(screen.getByText(/280\s*W/)).toBeInTheDocument();
    expect(screen.getByText(/70\s*kg/)).toBeInTheDocument();
  });

  it('shows the log-your-FTP prompt when w/kg is undefined', () => {
    render(
      <HeroStrip
        currentWkg={undefined}
        delta90d={undefined}
        ftpWatts={undefined}
        weightKg={undefined}
      />
    );
    expect(screen.getByText(/log your ftp and weight/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/performance/hero-strip.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/performance/hero-strip.tsx
import { Link } from 'react-router-dom';

interface HeroStripProps {
  currentWkg: number | undefined;
  delta90d: number | undefined;
  ftpWatts: number | undefined;
  weightKg: number | undefined;
}

export function HeroStrip({
  currentWkg,
  delta90d,
  ftpWatts,
  weightKg,
}: HeroStripProps) {
  if (currentWkg === undefined) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
        <p className="text-sm text-neutral-700">
          Log your FTP and weight to see your w/kg.
        </p>
        <Link
          to="/account#athlete"
          className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline"
        >
          Go to Account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-6">
      <div>
        <div className="font-display text-6xl font-bold tabular-nums leading-none text-neutral-900">
          {currentWkg.toFixed(1)}
        </div>
        <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">
          W/kg at FTP
        </div>
      </div>
      <div className="space-y-1">
        {delta90d !== undefined && (
          <div className="text-sm font-medium text-neutral-700">
            {delta90d >= 0
              ? `↑ +${delta90d.toFixed(1)}`
              : `↓ ${Math.abs(delta90d).toFixed(1)}`}{' '}
            <span className="text-neutral-500">vs 90d ago</span>
          </div>
        )}
        <div className="text-sm text-neutral-600 tabular-nums">
          {ftpWatts ? `${ftpWatts} W` : '—'} · {weightKg ? `${weightKg} kg` : '—'}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/performance/hero-strip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/hero-strip.tsx src/components/performance/hero-strip.test.tsx
git commit -m "feat(performance): add hero strip component"
```

---

## Task 10: Empty-state component

**Files:**
- Create: `src/components/performance/empty-state.tsx`

A small static component used when the rider has neither connected Strava (Phase β) nor logged any FTP/weight (Phase α covers this case via the Hero strip's prompt — but the page chrome around the hero should still render). For Phase α the empty state is just a hint string; Phase β will replace its content with the Strava connect CTA.

- [ ] **Step 1: Implement**

```tsx
// src/components/performance/empty-state.tsx
interface EmptyStateProps {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-neutral-500">{hint}</p>}
    </div>
  );
}
```

No tests for this — it's a literal display component with no logic. Type-check covers it.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/performance/empty-state.tsx
git commit -m "feat(performance): add empty state component"
```

---

## Task 11: Performance page

**Files:**
- Create: `src/pages/performance.tsx`

Composes the page: `<PageIntro>` → `<HeroStrip>` → `<RangeToggle>` → `<TrendTrioChart>`. Reads from the store, builds `series` for the selected range.

- [ ] **Step 1: Implement the page**

```tsx
// src/pages/performance.tsx
import { useMemo, useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { HeroStrip } from '@/components/performance/hero-strip';
import {
  RangeToggle,
  type RangeKey,
} from '@/components/performance/range-toggle';
import {
  TrendTrioChart,
  type TrendSeries,
} from '@/components/performance/trend-trio-chart';
import {
  computeCurrentWkg,
  computeWkgAtDate,
  computeWkgDeltaVsDaysAgo,
} from '@/lib/performance/wkg';
import { closestPriorEntry } from '@/lib/performance/history';
import { useStore } from '@/store';

const RANGE_DAYS: Record<RangeKey, number | null> = {
  '3mo': 90,
  '6mo': 180,
  '12mo': 365,
  all: null,
};

const SAMPLE_POINTS = 48; // chart resolution

export function PerformancePage() {
  const [range, setRange] = useState<RangeKey>('12mo');
  const ftpHistory = useStore((s) => s.ftpHistory);
  const weightHistory = useStore((s) => s.weightHistory);
  const profile = useStore((s) => s.settings.athleteProfile);

  const currentWkg = computeCurrentWkg(profile.ftpWatts, profile.weightKg);

  const delta90d = useMemo(() => {
    if (currentWkg === undefined) return undefined;
    return computeWkgDeltaVsDaysAgo({
      ftpHistory,
      weightHistory,
      currentWkg,
      daysAgo: 90,
    });
  }, [currentWkg, ftpHistory, weightHistory]);

  const series = useMemo<TrendSeries>(() => {
    return buildSeries({
      ftpHistory,
      weightHistory,
      profile,
      range,
    });
  }, [ftpHistory, weightHistory, profile, range]);

  return (
    <div className="page-container space-y-6">
      <PageIntro
        eyebrow="Performance"
        title="Are you getting stronger?"
        description="Your w/kg trend, FTP, and weight in one glance. Manually log new values from Account."
      />

      <HeroStrip
        currentWkg={currentWkg}
        delta90d={delta90d}
        ftpWatts={profile.ftpWatts}
        weightKg={profile.weightKg}
      />

      <div className="flex justify-end">
        <RangeToggle value={range} onChange={setRange} />
      </div>

      <TrendTrioChart series={series} />
    </div>
  );
}

interface BuildSeriesArgs {
  ftpHistory: ReturnType<typeof useStore.getState>['ftpHistory'];
  weightHistory: ReturnType<typeof useStore.getState>['weightHistory'];
  profile: ReturnType<typeof useStore.getState>['settings']['athleteProfile'];
  range: RangeKey;
}

function buildSeries({
  ftpHistory,
  weightHistory,
  profile,
  range,
}: BuildSeriesArgs): TrendSeries {
  const days = RANGE_DAYS[range];
  const now = Date.now();
  const earliestEntry = Math.min(
    ...ftpHistory.map((e) => Date.parse(e.recordedAt)),
    ...weightHistory.map((e) => Date.parse(e.recordedAt)),
    now
  );
  const start =
    days === null ? earliestEntry : now - days * 24 * 60 * 60 * 1000;

  if (start >= now) {
    return { wkg: [], ftp: [], weight: [] };
  }

  const sampleStep = (now - start) / SAMPLE_POINTS;
  const samples: string[] = [];
  for (let i = 0; i <= SAMPLE_POINTS; i++) {
    const ts = start + i * sampleStep;
    samples.push(new Date(ts).toISOString().slice(0, 10));
  }

  const wkg = samples
    .map((iso) => {
      const value = computeWkgAtDate(ftpHistory, weightHistory, iso);
      return value === undefined ? null : { dateIso: iso, value };
    })
    .filter((p): p is { dateIso: string; value: number } => p !== null);

  const ftp = samples
    .map((iso) => {
      const entry = closestPriorEntry(ftpHistory, iso);
      return entry ? { dateIso: iso, value: entry.ftpWatts } : null;
    })
    .filter((p): p is { dateIso: string; value: number } => p !== null);

  const weight = samples
    .map((iso) => {
      const entry = closestPriorEntry(weightHistory, iso);
      return entry ? { dateIso: iso, value: entry.weightKg } : null;
    })
    .filter((p): p is { dateIso: string; value: number } => p !== null);

  // Append "today" with current profile values if they exist (so the line
  // ends at the most current value even if no history entry was logged today).
  const todayIso = new Date(now).toISOString().slice(0, 10);
  if (profile.ftpWatts && profile.weightKg) {
    wkg.push({ dateIso: todayIso, value: profile.ftpWatts / profile.weightKg });
  }
  if (profile.ftpWatts) {
    ftp.push({ dateIso: todayIso, value: profile.ftpWatts });
  }
  if (profile.weightKg) {
    weight.push({ dateIso: todayIso, value: profile.weightKg });
  }

  return { wkg, ftp, weight };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/performance.tsx
git commit -m "feat(performance): add performance page composition"
```

---

## Task 12: Routing and navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/navigation.ts`

- [ ] **Step 1: Register the route**

In `src/App.tsx` add the page import alongside the others:

```typescript
import { PerformancePage } from '@/pages/performance';
```

Add the route inside `<Routes>`, after the `/account` route:

```tsx
              <Route path="/performance" element={<PerformancePage />} />
```

- [ ] **Step 2: Add the nav item**

In `src/components/layout/navigation.ts` add a new entry to `primaryNavItems`. Place it between `/gear` and `/power-meter-analyzer`:

```typescript
  {
    path: '/performance',
    label: 'Performance',
    section: 'performance',
    matchPaths: ['/performance'],
  },
```

Extend the `NavSection` type at the top of the file:

```typescript
export type NavSection =
  | 'nutrition'
  | 'gear'
  | 'performance'
  | 'labs'
  | 'account';
```

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Expected: App boots. Navigate to `http://localhost:5173/performance`. Confirm:
- Page intro reads "Are you getting stronger?"
- Hero strip shows current w/kg if profile has FTP + weight, else the prompt
- Range toggle renders
- Trend chart shows the empty-state hint if no history exists yet

Stop the dev server (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/navigation.ts
git commit -m "feat(routing): mount /performance with nav item"
```

---

## Task 13: Account-side history editor

**Files:**
- Create: `src/components/account/history-editor.tsx`
- Test: `src/components/account/history-editor.test.tsx`
- Modify: `src/pages/account.tsx`

Lets the rider see and edit historical FTP and weight entries — useful when correcting a typo or backfilling old values from a coaching log. Lives on the Account page.

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/account/history-editor.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStore } from '@/store';
import { HistoryEditor } from './history-editor';

function resetStore() {
  useStore.setState({ ftpHistory: [], weightHistory: [] });
}

describe('HistoryEditor', () => {
  it('lists FTP entries newest-first', () => {
    resetStore();
    useStore.getState().addFtpEntry({ recordedAt: '2025-01-01', ftpWatts: 250 });
    useStore.getState().addFtpEntry({ recordedAt: '2025-06-01', ftpWatts: 270 });
    render(<HistoryEditor />);
    const rows = screen.getAllByTestId('ftp-history-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('270');
    expect(rows[1]).toHaveTextContent('250');
  });

  it('adds a new FTP entry from the form', () => {
    resetStore();
    render(<HistoryEditor />);
    fireEvent.change(screen.getByLabelText(/ftp date/i), {
      target: { value: '2025-09-01' },
    });
    fireEvent.change(screen.getByLabelText(/ftp watts/i), {
      target: { value: '275' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add ftp/i }));
    expect(useStore.getState().ftpHistory).toHaveLength(1);
    expect(useStore.getState().ftpHistory[0].ftpWatts).toBe(275);
  });

  it('removes an entry when delete is clicked', () => {
    resetStore();
    useStore.getState().addFtpEntry({ recordedAt: '2025-01-01', ftpWatts: 250 });
    render(<HistoryEditor />);
    fireEvent.click(screen.getByRole('button', { name: /delete ftp 250/i }));
    expect(useStore.getState().ftpHistory).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/account/history-editor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the editor**

```tsx
// src/components/account/history-editor.tsx
import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';
import { useStore } from '@/store';

export function HistoryEditor() {
  const ftpHistory = useStore((s) => s.ftpHistory);
  const weightHistory = useStore((s) => s.weightHistory);
  const addFtpEntry = useStore((s) => s.addFtpEntry);
  const removeFtpEntry = useStore((s) => s.removeFtpEntry);
  const addWeightEntry = useStore((s) => s.addWeightEntry);
  const removeWeightEntry = useStore((s) => s.removeWeightEntry);

  return (
    <div className="space-y-8">
      <FtpSection
        history={ftpHistory}
        onAdd={addFtpEntry}
        onRemove={removeFtpEntry}
      />
      <WeightSection
        history={weightHistory}
        onAdd={addWeightEntry}
        onRemove={removeWeightEntry}
      />
    </div>
  );
}

interface FtpSectionProps {
  history: FtpHistoryEntry[];
  onAdd: (e: Omit<FtpHistoryEntry, 'id'>) => void;
  onRemove: (id: string) => void;
}

function FtpSection({ history, onAdd, onRemove }: FtpSectionProps) {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [watts, setWatts] = useState('');

  const sorted = [...history].sort((a, b) =>
    a.recordedAt < b.recordedAt ? 1 : -1
  );

  return (
    <section>
      <h3 className="text-sm font-semibold text-neutral-900 mb-2">
        FTP history
      </h3>
      <ul className="space-y-1 mb-3">
        {sorted.map((entry) => (
          <li
            key={entry.id}
            data-testid="ftp-history-row"
            className="flex items-center justify-between text-sm text-neutral-700 tabular-nums"
          >
            <span>
              {entry.recordedAt} — {entry.ftpWatts} W
            </span>
            <button
              type="button"
              aria-label={`Delete FTP ${entry.ftpWatts}`}
              onClick={() => onRemove(entry.id)}
              className="text-xs text-neutral-500 hover:text-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = Number(watts);
          if (!parsed || parsed <= 0) return;
          onAdd({ recordedAt: date, ftpWatts: parsed });
          setWatts('');
        }}
      >
        <label className="text-xs text-neutral-700">
          FTP date
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-xs text-neutral-700">
          FTP watts
          <Input
            type="number"
            min={1}
            value={watts}
            onChange={(e) => setWatts(e.target.value)}
          />
        </label>
        <Button type="submit">Add FTP</Button>
      </form>
    </section>
  );
}

interface WeightSectionProps {
  history: WeightHistoryEntry[];
  onAdd: (e: Omit<WeightHistoryEntry, 'id'>) => void;
  onRemove: (id: string) => void;
}

function WeightSection({ history, onAdd, onRemove }: WeightSectionProps) {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [kg, setKg] = useState('');

  const sorted = [...history].sort((a, b) =>
    a.recordedAt < b.recordedAt ? 1 : -1
  );

  return (
    <section>
      <h3 className="text-sm font-semibold text-neutral-900 mb-2">
        Weight history
      </h3>
      <ul className="space-y-1 mb-3">
        {sorted.map((entry) => (
          <li
            key={entry.id}
            data-testid="weight-history-row"
            className="flex items-center justify-between text-sm text-neutral-700 tabular-nums"
          >
            <span>
              {entry.recordedAt} — {entry.weightKg} kg
            </span>
            <button
              type="button"
              aria-label={`Delete weight ${entry.weightKg}`}
              onClick={() => onRemove(entry.id)}
              className="text-xs text-neutral-500 hover:text-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = Number(kg);
          if (!parsed || parsed <= 0) return;
          onAdd({ recordedAt: date, weightKg: parsed });
          setKg('');
        }}
      >
        <label className="text-xs text-neutral-700">
          Weight date
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-xs text-neutral-700">
          Weight kg
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={kg}
            onChange={(e) => setKg(e.target.value)}
          />
        </label>
        <Button type="submit">Add weight</Button>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/account/history-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount the editor on the Account page**

Open `src/pages/account.tsx`. Find the existing athlete-profile section (look for where `weightKg` or `ftpWatts` is rendered) and append the new editor below it. Concretely, import:

```typescript
import { HistoryEditor } from '@/components/account/history-editor';
```

And inside the page JSX, after the existing athlete fields:

```tsx
<HistoryEditor />
```

If the Account page uses a card-based section pattern (e.g., `<Card>` wrappers), wrap `<HistoryEditor />` in the same `<Card>` shell used by the surrounding sections. If unsure, mirror the wrapper used by the closest existing section.

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`
- Visit `/account`. Confirm the FTP / Weight history editor renders.
- Add an FTP entry: 275 W on a date a week ago. Confirm it appears in the list.
- Visit `/performance`. Confirm the FTP line in the chart now reflects 275 → current.
- Edit the profile FTP field on Account — confirm a new history row is appended automatically.

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/account/history-editor.tsx src/components/account/history-editor.test.tsx src/pages/account.tsx
git commit -m "feat(account): mount FTP/weight history editor"
```

---

## Final pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test -- --run`
Expected: PASS, no broken tests.

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds, dist output produced.

- [ ] **Step 4: Manual validation (smoke)**

Run: `npm run dev`
- Empty install (clear localStorage): `/performance` shows the prompt + the chart empty hint.
- Set FTP and weight on `/account` (via existing inputs). Reload `/performance` — hero shows w/kg, chart shows three flat lines from history-append-on-edit.
- Add a backdated FTP entry on the editor (90+ days old, lower value). Check delta90d shows ↑ on the hero.

Stop the dev server.

- [ ] **Step 5: Final commit if anything is uncommitted**

Run: `git status`
If clean: nothing to do.
If files remain: review and commit (e.g., a stray formatter change).

---

## Done criteria

- All thirteen tasks committed.
- `/performance` route renders without errors.
- Hero strip + range toggle + trend chart compose correctly.
- FTP and weight edits on Account append history rows.
- Cloud sync round-trips both history arrays at schema v3.
- All tests pass; type-check and lint pass; production build succeeds.

What's next: **Phase β — Strava activity sync.** Will be written as `2026-MM-DD-performance-tracking-phase-beta.md` after Phase α lands.

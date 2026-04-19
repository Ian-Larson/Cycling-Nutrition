# Gear UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Gear page IA into two focused routes (`/gear` bike-centric, `/gear/inventory` parts-centric), collapse the Parts/Inventory confusion into one flat inventory list with auto-upserted catalog, add a faint life-remaining progress bar to due items, and close the CRUD gap with Edit/Delete on inventory instances and service events — per `docs/superpowers/specs/2026-04-19-gear-ux-redesign-design.md`.

**Architecture:** Split the current five-tab `/gear` route into (a) a bike-centric shell with three tabs (Active setup · Due · History) and an always-on Due-now preview band, and (b) a new `/gear/inventory` route with one flat physical-parts list. A `Gear | Inventory` sub-nav strip links them. The Parts tab disappears — the catalog remains in data, auto-upserted by the unified Add Part sheet via `(category, brand, model, attributes)` normalization. A small progress-bar primitive reads from `GearDueItem` and renders a monotone fill whose width comes from the axis (mi or days) closest to zero. CRUD additions use fork-on-edit for spec fields (mutate-in-place if sole owner, clone catalog row if shared) and enforce guardrails (no delete of actively-installed instances; category immutable once set).

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4, Zustand (+ persist), react-router-dom v6, vitest + @testing-library/react for tests.

---

## Spec reference

Source of truth: `docs/superpowers/specs/2026-04-19-gear-ux-redesign-design.md`. Each task below refers to a specific section or requirement in that spec. If anything contradicts, the spec wins — update the plan.

## File structure

### New files

- `src/components/gear/gear-sub-nav.tsx` — sub-nav strip (`Gear | Inventory`) shown at top of both routes.
- `src/components/gear/gear-life-bar.tsx` — monotone progress bar primitive used in Due-now band and Due tab rows.
- `src/components/gear/gear-due-preview-band.tsx` — always-on band under the sub-nav on `/gear`, showing top 2 most-urgent items.
- `src/components/gear/add-part-sheet.tsx` — unified Add/Edit sheet (Category → Spec with brand/model autocomplete → Physical details).
- `src/components/gear/edit-service-event-sheet.tsx` — edit-in-place sheet for a logged service event.
- `src/components/gear/overflow-menu.tsx` — tiny shared overflow (`⋯`) menu for cards (Edit/Delete actions).
- `src/pages/gear-inventory.tsx` — the new `/gear/inventory` route component.
- `src/lib/gear/life-bar.ts` — pure computation for `nearestRemaining`, `nearestInterval`, `pct` from a `GearDueItem` + source event.
- `src/lib/gear/life-bar.test.ts` — unit tests for the computation.
- `src/lib/gear/catalog-upsert.ts` — pure `findOrCreateCatalog(spec, catalog)` helper.
- `src/lib/gear/catalog-upsert.test.ts` — unit tests for normalization + lookup.

### Modified files

- `src/App.tsx` — add `/gear/inventory` route.
- `src/components/gear/gear-tabs.tsx` — drop `inventory` and `parts` from the tab array; keep `active | due | history`.
- `src/pages/gear.tsx` — remove inventory/parts modes and tabs, mount sub-nav + preview band, reduce state, route the `+ Add part` entry to `/gear/inventory`.
- `src/components/gear/gear-due-list.tsx` — render `<GearLifeBar />` on each card; accept new `limit` prop so preview band and full list share the component.
- `src/components/gear/gear-inventory.tsx` — become the flat-list body used by `/gear/inventory`; add per-card overflow (Edit/Delete); add filter row.
- `src/components/gear/gear-history-list.tsx` — add per-row overflow (Edit/Delete service event).
- `src/store/index.ts` — add `deleteGearPartInstance(id)` with guardrail, add `updateGearServiceEvent(id, updates)` action.
- `src/lib/gear/derive-gear-due.ts` — expose `intervalMi` / `intervalDays` on `GearDueItem` for the life-bar (currently kept only on the event).

### Deleted files

- `src/components/gear/parts-inventory.tsx` — no longer rendered anywhere (catalog page removed).
- `src/components/gear/part-catalog-form.tsx` — replaced by `add-part-sheet.tsx`.
- `src/components/gear/part-instance-form.tsx` — replaced by `add-part-sheet.tsx`.

Files changing together live together — components stay in `src/components/gear/`, pure helpers in `src/lib/gear/`.

---

## Task breakdown

Phases are ordered so each leaves the app shippable. Each task ends with its own commit.

### Task 1: Expose intervals on GearDueItem

**Files:**
- Modify: `src/lib/gear/derive-gear-due.ts`
- Test: `src/lib/gear/derive-gear-due.test.ts`

The life-bar computation needs the originating event's `intervalMi` / `intervalDays` on each item without every consumer digging into `item.event`. Pull them onto the shape directly.

- [ ] **Step 1: Add failing test**

Add to `src/lib/gear/derive-gear-due.test.ts`:

```ts
it('surfaces intervalMi and intervalDays on the due item', () => {
  const bikes = [makeBike({ id: 'b1', cachedOdometerMi: 1000 })];
  const events = [
    makeEvent({
      bikeId: 'b1',
      typeKey: 'chain_wax',
      dateIso: '2026-04-01',
      mileageMi: 900,
      intervalMi: 200,
      intervalDays: 30,
      nextDueMileageMi: 1100,
      nextDueDateIso: '2026-05-01',
    }),
  ];
  const [item] = deriveGearDue({
    bikes,
    installRecords: [],
    serviceEvents: events,
    today: '2026-04-19',
  });
  expect(item.intervalMi).toBe(200);
  expect(item.intervalDays).toBe(30);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/gear/derive-gear-due.test.ts`
Expected: FAIL (property `intervalMi` does not exist on `GearDueItem`).

- [ ] **Step 3: Add fields to the interface and the mapper**

In `src/lib/gear/derive-gear-due.ts`:

```ts
export interface GearDueItem {
  id: string;
  bike: Bike | null;
  bikeId: string;
  event: GearServiceEvent;
  typeKey: GearServiceEvent['typeKey'];
  label: string;
  remainingMi: number | null;
  remainingDays: number | null;
  intervalMi: number | null;
  intervalDays: number | null;
  urgency: GearUrgency;
}
```

In the `.map(...)` block, add:

```ts
intervalMi: event.intervalMi ?? null,
intervalDays: event.intervalDays ?? null,
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- src/lib/gear/derive-gear-due.test.ts`
Expected: PASS. Also confirm `npm run lint` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gear/derive-gear-due.ts src/lib/gear/derive-gear-due.test.ts
git commit -m "feat(gear): expose intervals on GearDueItem for life-bar"
```

---

### Task 2: Life-bar computation

**Files:**
- Create: `src/lib/gear/life-bar.ts`
- Create: `src/lib/gear/life-bar.test.ts`

Pure function. The spec's rule: `nearestRemaining` is the axis whose remaining value is smallest (furthest toward or past zero). `pct = clamp(1 − nearestRemaining / nearestInterval, 0, 1)`. Overdue caps at 1 (full bar).

- [ ] **Step 1: Write failing test**

`src/lib/gear/life-bar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeLifeBar } from './life-bar';

describe('computeLifeBar', () => {
  it('returns null when neither axis has a remaining value', () => {
    expect(
      computeLifeBar({ remainingMi: null, remainingDays: null, intervalMi: null, intervalDays: null })
    ).toBeNull();
  });

  it('picks mi axis when both present and mi is nearer zero', () => {
    const result = computeLifeBar({
      remainingMi: 20,
      remainingDays: 60,
      intervalMi: 200,
      intervalDays: 30,
    });
    expect(result).toEqual({ axis: 'mi', pct: 1 - 20 / 200 });
  });

  it('picks days axis when days is nearer zero', () => {
    const result = computeLifeBar({
      remainingMi: 120,
      remainingDays: 3,
      intervalMi: 200,
      intervalDays: 30,
    });
    expect(result).toEqual({ axis: 'days', pct: 1 - 3 / 30 });
  });

  it('caps pct at 1 when overdue', () => {
    const result = computeLifeBar({
      remainingMi: -50,
      remainingDays: 30,
      intervalMi: 200,
      intervalDays: 30,
    });
    expect(result).toEqual({ axis: 'mi', pct: 1 });
  });

  it('derives interval from next-due minus last-service if missing', () => {
    const result = computeLifeBar({
      remainingMi: 50,
      remainingDays: null,
      intervalMi: null,
      intervalDays: null,
      nextDueMileageMi: 1100,
      lastServiceMileageMi: 900,
    });
    expect(result).toEqual({ axis: 'mi', pct: 1 - 50 / 200 });
  });

  it('returns null when interval cannot be derived', () => {
    expect(
      computeLifeBar({
        remainingMi: 50,
        remainingDays: null,
        intervalMi: null,
        intervalDays: null,
      })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/gear/life-bar.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Minimal implementation**

`src/lib/gear/life-bar.ts`:

```ts
export interface LifeBarInput {
  remainingMi: number | null;
  remainingDays: number | null;
  intervalMi: number | null;
  intervalDays: number | null;
  nextDueMileageMi?: number;
  lastServiceMileageMi?: number;
  nextDueDateIso?: string;
  lastServiceDateIso?: string;
}

export interface LifeBarResult {
  axis: 'mi' | 'days';
  pct: number;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function daysBetween(startIso: string, endIso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.parse(`${startIso}T00:00:00.000Z`);
  const end = Date.parse(`${endIso}T00:00:00.000Z`);
  return Math.round((end - start) / msPerDay);
}

export function computeLifeBar(input: LifeBarInput): LifeBarResult | null {
  const candidates: Array<{ axis: 'mi' | 'days'; remaining: number; interval: number | null }> = [];
  if (input.remainingMi !== null) {
    let interval = input.intervalMi;
    if (interval === null && input.nextDueMileageMi !== undefined && input.lastServiceMileageMi !== undefined) {
      interval = input.nextDueMileageMi - input.lastServiceMileageMi;
    }
    candidates.push({ axis: 'mi', remaining: input.remainingMi, interval });
  }
  if (input.remainingDays !== null) {
    let interval = input.intervalDays;
    if (interval === null && input.nextDueDateIso !== undefined && input.lastServiceDateIso !== undefined) {
      interval = daysBetween(input.lastServiceDateIso, input.nextDueDateIso);
    }
    candidates.push({ axis: 'days', remaining: input.remainingDays, interval });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.remaining - b.remaining);
  const pick = candidates[0];
  if (pick.interval === null || pick.interval <= 0) return null;
  return { axis: pick.axis, pct: clamp01(1 - pick.remaining / pick.interval) };
}
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- src/lib/gear/life-bar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gear/life-bar.ts src/lib/gear/life-bar.test.ts
git commit -m "feat(gear): add life-bar computation"
```

---

### Task 3: Life-bar component

**Files:**
- Create: `src/components/gear/gear-life-bar.tsx`

Monotone fill, track `bg-shell-200`, fill `bg-ink-400`, height `h-1`, rounded. Respects `prefers-reduced-motion`.

- [ ] **Step 1: Write the component**

`src/components/gear/gear-life-bar.tsx`:

```tsx
import { clsx } from 'clsx';
import { computeLifeBar, type LifeBarInput } from '@/lib/gear/life-bar';

interface GearLifeBarProps extends LifeBarInput {
  className?: string;
}

export function GearLifeBar({ className, ...input }: GearLifeBarProps) {
  const result = computeLifeBar(input);
  if (!result) return null;

  const pctPercent = `${Math.round(result.pct * 100)}%`;

  return (
    <div
      className={clsx('h-1 w-full overflow-hidden rounded-full bg-shell-200', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(result.pct * 100)}
      aria-label="Service life remaining"
    >
      <div
        className="h-full rounded-full bg-ink-400 motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out"
        style={{ width: pctPercent }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Quick render smoke — optional**

Skip dedicated test (trivial render). Type-check via `npm run lint` and `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add src/components/gear/gear-life-bar.tsx
git commit -m "feat(gear): add faint life-remaining progress bar component"
```

---

### Task 4: Render life-bar in Due tab

**Files:**
- Modify: `src/components/gear/gear-due-list.tsx`

Place the bar below the mileage/days line on each Due row.

- [ ] **Step 1: Import + render**

Inside each due-item card in `gear-due-list.tsx`, after the text row that shows remaining mi/days, add:

```tsx
<GearLifeBar
  remainingMi={item.remainingMi}
  remainingDays={item.remainingDays}
  intervalMi={item.intervalMi}
  intervalDays={item.intervalDays}
  nextDueMileageMi={item.event.nextDueMileageMi}
  nextDueDateIso={item.event.nextDueDateIso}
  lastServiceMileageMi={item.event.mileageMi}
  lastServiceDateIso={item.event.dateIso}
  className="mt-2"
/>
```

Add import at the top:

```tsx
import { GearLifeBar } from './gear-life-bar';
```

- [ ] **Step 2: Visual confirm**

Run: `npm run dev`. Open `/gear`, switch to Due tab, verify thin dark bar renders under existing text; urgency pill colors unchanged; overdue items show full bar.

- [ ] **Step 3: Commit**

```bash
git add src/components/gear/gear-due-list.tsx
git commit -m "feat(gear): render life-remaining bar on due-list cards"
```

---

### Task 5: Reduce GearTabs to three tabs

**Files:**
- Modify: `src/components/gear/gear-tabs.tsx`
- Modify: `src/pages/gear.tsx`

Remove `inventory` and `parts` from the tab union and array. This will break the page temporarily — Task 6 reroutes Add-part entry.

- [ ] **Step 1: Narrow the union**

In `gear-tabs.tsx`:

```ts
export type GearTabValue = 'active' | 'due' | 'history';

const TABS: Array<{ id: GearTabValue; label: string }> = [
  { id: 'active', label: 'Active setup' },
  { id: 'due', label: 'Due' },
  { id: 'history', label: 'History' },
];
```

- [ ] **Step 2: Delete dead branches from gear.tsx**

Remove from `src/pages/gear.tsx`:
- `partsMode` and `inventoryMode` state and their setters.
- The `tab === 'inventory'` branches (both list and add).
- The `tab === 'parts'` branches (both list and catalog).
- Imports: `GearInventory`, `PartsInventory`, `PartCatalogForm`, `PartInstanceForm`, `addGearPartCatalogItem`, `addGearPartInstances` (the last two stay if needed later — remove only if unused after Task 6 lands too; OK to leave for now).
- The `catalogCount` / `inventoryCount` label cases — keep only `active`, `due`, `history`.

Leave `addGearPartInstances` and `addGearPartCatalogItem` untouched at the store level.

- [ ] **Step 3: Type-check, lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. If unused imports remain, remove them.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: existing suite passes. (No tests target the old tabs.)

- [ ] **Step 5: Commit**

```bash
git add src/components/gear/gear-tabs.tsx src/pages/gear.tsx
git commit -m "refactor(gear): reduce to three tabs (active, due, history)"
```

---

### Task 6: Add sub-nav strip

**Files:**
- Create: `src/components/gear/gear-sub-nav.tsx`

Links `Gear | Inventory`. Matches active route using `useLocation`.

- [ ] **Step 1: Write the component**

`src/components/gear/gear-sub-nav.tsx`:

```tsx
import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/gear', label: 'Gear', end: true },
  { to: '/gear/inventory', label: 'Inventory', end: false },
] as const;

export function GearSubNav() {
  return (
    <div
      role="navigation"
      aria-label="Gear sections"
      className="flex gap-1 rounded-lg border border-[color:var(--border-soft)] bg-white p-1 w-fit"
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            clsx(
              'min-h-9 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200',
              isActive ? 'bg-brand-100 text-brand-900' : 'text-ink-700 hover:bg-shell-50'
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gear/gear-sub-nav.tsx
git commit -m "feat(gear): add Gear | Inventory sub-nav strip"
```

---

### Task 7: Catalog auto-upsert helper

**Files:**
- Create: `src/lib/gear/catalog-upsert.ts`
- Create: `src/lib/gear/catalog-upsert.test.ts`

Normalizes `(category, brand, model, attributes)` and returns an existing `catalogItemId` or `null` when a new row is needed.

- [ ] **Step 1: Write failing tests**

`src/lib/gear/catalog-upsert.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findCatalogMatch, normalizeSpecKey } from './catalog-upsert';
import type { GearPartCatalogItem } from '@/types/gear';

function item(partial: Partial<GearPartCatalogItem>): GearPartCatalogItem {
  return {
    id: partial.id ?? 'a',
    category: partial.category ?? 'chain',
    model: partial.model ?? 'Dura-Ace',
    brand: partial.brand,
    weightGrams: partial.weightGrams,
    attributes: partial.attributes ?? { category: 'chain', speedCount: 12 },
    notes: partial.notes,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('normalizeSpecKey', () => {
  it('is case and whitespace insensitive', () => {
    const a = normalizeSpecKey({
      category: 'chain',
      brand: '  SHIMANO ',
      model: 'Dura-Ace  ',
      attributes: { category: 'chain', speedCount: 12 },
    });
    const b = normalizeSpecKey({
      category: 'chain',
      brand: 'shimano',
      model: 'dura-ace',
      attributes: { category: 'chain', speedCount: 12 },
    });
    expect(a).toBe(b);
  });

  it('includes attribute values in the key', () => {
    const k11 = normalizeSpecKey({
      category: 'chain',
      model: 'Dura-Ace',
      attributes: { category: 'chain', speedCount: 11 },
    });
    const k12 = normalizeSpecKey({
      category: 'chain',
      model: 'Dura-Ace',
      attributes: { category: 'chain', speedCount: 12 },
    });
    expect(k11).not.toBe(k12);
  });
});

describe('findCatalogMatch', () => {
  it('returns the matching catalog row', () => {
    const existing = item({ id: 'x', brand: 'Shimano', model: 'Dura-Ace' });
    const match = findCatalogMatch([existing], {
      category: 'chain',
      brand: 'shimano',
      model: 'dura-ace',
      attributes: { category: 'chain', speedCount: 12 },
    });
    expect(match?.id).toBe('x');
  });

  it('returns null when no match', () => {
    const existing = item({ id: 'x', model: 'Dura-Ace' });
    const match = findCatalogMatch([existing], {
      category: 'chain',
      model: 'Ultegra',
      attributes: { category: 'chain', speedCount: 12 },
    });
    expect(match).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/gear/catalog-upsert.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`src/lib/gear/catalog-upsert.ts`:

```ts
import type { GearPartAttributes, GearPartCatalogItem, GearPartCategory } from '@/types/gear';

export interface CatalogSpec {
  category: GearPartCategory;
  brand?: string;
  model: string;
  weightGrams?: number;
  attributes: GearPartAttributes;
}

function normText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeAttributes(attrs: GearPartAttributes): string {
  const entries = Object.entries(attrs as Record<string, unknown>)
    .filter(([key]) => key !== 'category')
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim().toLowerCase() : value] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

export function normalizeSpecKey(spec: CatalogSpec): string {
  return [
    spec.category,
    normText(spec.brand),
    normText(spec.model),
    normalizeAttributes(spec.attributes),
  ].join('\u0000');
}

export function findCatalogMatch(
  catalog: readonly GearPartCatalogItem[],
  spec: CatalogSpec
): GearPartCatalogItem | null {
  const key = normalizeSpecKey(spec);
  return catalog.find((item) => normalizeSpecKey(item) === key) ?? null;
}
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- src/lib/gear/catalog-upsert.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gear/catalog-upsert.ts src/lib/gear/catalog-upsert.test.ts
git commit -m "feat(gear): add catalog upsert helper"
```

---

### Task 8: Add `deleteGearPartInstance` and `updateGearServiceEvent` store actions

**Files:**
- Modify: `src/store/index.ts`
- Test: store test or new `src/store/gear-crud.test.ts`

Guardrail on delete: cannot delete an instance whose `status === 'installed'` with an active install record.

- [ ] **Step 1: Write failing test**

Create `src/store/gear-crud.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/store';

describe('gear CRUD additions', () => {
  beforeEach(() => {
    useStore.setState((state) => ({
      ...state,
      gearPartCatalog: [],
      gearPartInstances: [],
      gearInstallRecords: [],
      gearServiceEvents: [],
    }));
  });

  it('deletes a spare part instance', () => {
    useStore.setState((state) => ({
      ...state,
      gearPartCatalog: [{ id: 'c1', category: 'chain', model: 'x', attributes: { category: 'chain' }, createdAt: 0, updatedAt: 0 }],
      gearPartInstances: [{ id: 'i1', catalogItemId: 'c1', status: 'spare', createdAt: 0, updatedAt: 0 }],
    }));
    useStore.getState().deleteGearPartInstance('i1');
    expect(useStore.getState().gearPartInstances).toHaveLength(0);
  });

  it('refuses to delete an actively-installed instance', () => {
    useStore.setState((state) => ({
      ...state,
      gearPartCatalog: [{ id: 'c1', category: 'chain', model: 'x', attributes: { category: 'chain' }, createdAt: 0, updatedAt: 0 }],
      gearPartInstances: [{ id: 'i1', catalogItemId: 'c1', status: 'installed', createdAt: 0, updatedAt: 0 }],
      gearInstallRecords: [{ id: 'r1', bikeId: 'b1', partInstanceId: 'i1', slotKey: 'chain', installedAtMileageMi: 0, installedDateIso: '2026-01-01', createdAt: 0, updatedAt: 0 }],
    }));
    expect(() => useStore.getState().deleteGearPartInstance('i1')).toThrow();
    expect(useStore.getState().gearPartInstances).toHaveLength(1);
  });

  it('updates a service event in place', () => {
    useStore.setState((state) => ({
      ...state,
      gearServiceEvents: [{ id: 'e1', bikeId: 'b1', typeKey: 'chain_wax', dateIso: '2026-04-01', createdAt: 0, updatedAt: 0 }],
    }));
    useStore.getState().updateGearServiceEvent('e1', { notes: 'updated' });
    expect(useStore.getState().gearServiceEvents[0].notes).toBe('updated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/gear-crud.test.ts`
Expected: FAIL (actions missing).

- [ ] **Step 3: Add actions to the store**

In the `GearStateActions` interface in `src/store/index.ts`, add:

```ts
deleteGearPartInstance: (id: string) => void;
updateGearServiceEvent: (id: string, updates: Partial<GearServiceEvent>) => void;
```

In the `create(...)` body, alongside `deleteGearServiceEvent`:

```ts
deleteGearPartInstance: (id) => {
  const { gearPartInstances, gearInstallRecords } = get();
  const instance = gearPartInstances.find((i) => i.id === id);
  if (!instance) return;
  if (instance.status === 'installed') {
    const hasActive = gearInstallRecords.some(
      (r) => r.partInstanceId === id && isActiveGearInstall(r)
    );
    if (hasActive) {
      throw new Error('Cannot delete an installed part. Remove it from the bike first.');
    }
  }
  set((state) => ({
    gearPartInstances: state.gearPartInstances.filter((i) => i.id !== id),
    gearInstallRecords: state.gearInstallRecords.filter(
      (r) => r.partInstanceId !== id
    ),
  }));
},
updateGearServiceEvent: (id, updates) => {
  const now = Date.now();
  set((state) => ({
    gearServiceEvents: state.gearServiceEvents.map((event) =>
      event.id === id ? { ...event, ...updates, id: event.id, updatedAt: now } : event
    ),
  }));
},
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- src/store/gear-crud.test.ts`
Expected: PASS. Also `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/store/index.ts src/store/gear-crud.test.ts
git commit -m "feat(store): add deleteGearPartInstance + updateGearServiceEvent"
```

---

### Task 9: Unified Add Part sheet

**Files:**
- Create: `src/components/gear/add-part-sheet.tsx`

Single form with three sections (Category → Spec → Physical details). Brand/model typeaheads prefill from matching catalog. On submit, normalize and find-or-create catalog, then insert instance.

- [ ] **Step 1: Implement the sheet**

Keep the existing `Sheet` primitive (check `src/components/ui/` for current sheet/dialog pattern). Mirror `part-catalog-form.tsx` + `part-instance-form.tsx` structure but in one form. Use `findCatalogMatch` + `addGearPartCatalogItem` + `addGearPartInstances` from the store for submit.

Edit mode variant: accept an `instanceId` prop; when present, load existing instance + catalog, prefill, and apply the fork-on-edit rule in the submit handler:

- Spec fields changed AND instance is the only one pointing at its catalog row → call `updateGearPartCatalogItem(catalogItemId, updates)`.
- Spec fields changed AND siblings exist → normalize new spec, call `findCatalogMatch`; if null `addGearPartCatalogItem(...)`, then `updateGearPartInstance(instanceId, { catalogItemId: nextId })`.
- Instance fields changed → call `updateGearPartInstance(instanceId, { ... })` directly.
- Category field disabled in edit mode.

- [ ] **Step 2: Wire a basic render test**

Create a test that mounts `<AddPartSheet open />` and asserts the three section headings are present. Happy-path coverage only.

- [ ] **Step 3: Verify**

Run: `npm test` + visually on `npm run dev` once Task 10 lands.

- [ ] **Step 4: Commit**

```bash
git add src/components/gear/add-part-sheet.tsx
git commit -m "feat(gear): add unified Add/Edit Part sheet"
```

---

### Task 10: `/gear/inventory` route + page shell

**Files:**
- Create: `src/pages/gear-inventory.tsx`
- Modify: `src/App.tsx`

Page shell: `PageIntro` (title "Inventory", desc "Physical parts you own.", action `+ Add part`) → `GearSubNav` → summary strip → filter row → body (`GearInventory`).

- [ ] **Step 1: Create the page**

`src/pages/gear-inventory.tsx`:

```tsx
import { useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { Button } from '@/components/ui';
import { GearSubNav } from '@/components/gear/gear-sub-nav';
import { GearInventory } from '@/components/gear/gear-inventory';
import { AddPartSheet } from '@/components/gear/add-part-sheet';
import { useStore } from '@/store';

export function GearInventoryPage() {
  const bikes = useStore((s) => s.bikes);
  const gearPartCatalog = useStore((s) => s.gearPartCatalog);
  const gearPartInstances = useStore((s) => s.gearPartInstances);
  const gearInstallRecords = useStore((s) => s.gearInstallRecords);
  const [addOpen, setAddOpen] = useState(false);
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null);

  return (
    <div className="page-shell max-w-6xl space-y-4 md:space-y-6">
      <PageIntro
        title="Inventory"
        description="Physical parts you own."
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            + Add part
          </Button>
        }
      />

      <GearSubNav />

      <GearInventory
        catalog={gearPartCatalog}
        instances={gearPartInstances}
        installRecords={gearInstallRecords}
        bikes={bikes}
        onEdit={(id) => setEditInstanceId(id)}
      />

      <AddPartSheet
        open={addOpen || editInstanceId !== null}
        instanceId={editInstanceId}
        onClose={() => {
          setAddOpen(false);
          setEditInstanceId(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Register the route in `src/App.tsx`**

```tsx
import { GearInventoryPage } from '@/pages/gear-inventory';
// ...
<Route path="/gear/inventory" element={<GearInventoryPage />} />
```

- [ ] **Step 3: Run dev, click sub-nav, confirm routing**

Run: `npm run dev`. Click `Inventory` in the sub-nav — loads the new page. Click `Gear` — returns.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/gear-inventory.tsx
git commit -m "feat(gear): add /gear/inventory route"
```

---

### Task 11: GearInventory — flatten, filter row, overflow menu

**Files:**
- Modify: `src/components/gear/gear-inventory.tsx`
- Create: `src/components/gear/overflow-menu.tsx`

Replace the existing Add/Add-catalog buttons wiring with the `onEdit` / `onDelete` callbacks. Group cards by category with a filter-chip row above the body. Add `OverflowMenu` to each card for Edit/Delete.

- [ ] **Step 1: Overflow menu primitive**

`src/components/gear/overflow-menu.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface OverflowMenuProps {
  items: Array<{ label: string; onSelect: () => void; tone?: 'default' | 'danger' }>;
  label?: string;
}

export function OverflowMenu({ items, label = 'More' }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1 text-ink-500 hover:bg-shell-100 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={clsx(
                'block w-full px-3 py-2 text-left text-sm hover:bg-shell-50',
                item.tone === 'danger' ? 'text-rose-700' : 'text-ink-700'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Filter chips + overflow in `gear-inventory.tsx`**

Add at the top of the component a category-chip row (multi-select) and a status-chip row (multi-select within, single row). Filter instances before grouping. On each card: `<OverflowMenu items={[ { label: 'Edit', onSelect: () => onEdit(instance.id) }, { label: 'Delete', onSelect: handleDelete, tone: 'danger' } ]} />`. Delete path calls the store action inside a `window.confirm` (or an inline confirm); catches the guardrail Error and alerts the user.

Update the `GearInventoryProps` interface:

```ts
interface GearInventoryProps {
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  onEdit: (instanceId: string) => void;
}
```

Remove `onAddInstance` / `onAddCatalog` from the signature — that entry now lives on the page.

- [ ] **Step 3: Verify**

Run: `npm run dev`, go to `/gear/inventory`, confirm chips filter, overflow menu opens/closes, Edit opens sheet prefilled, Delete guards active installs.

- [ ] **Step 4: Commit**

```bash
git add src/components/gear/gear-inventory.tsx src/components/gear/overflow-menu.tsx
git commit -m "feat(gear): flat inventory list with filters and edit/delete"
```

---

### Task 12: Due-now preview band on `/gear`

**Files:**
- Create: `src/components/gear/gear-due-preview-band.tsx`
- Modify: `src/components/gear/gear-due-list.tsx` (accept `limit` prop OR extract a shared card)
- Modify: `src/pages/gear.tsx`

Preview band shows top 2 most-urgent items (already sorted by urgency in `deriveGearDue`). Each row: label, bike name (when viewing all bikes), urgency pill, thin progress bar, inline `Log` link. Header: `Due now · {N}`. `View all {N}` link switches to the Due tab. If `N === 0`, collapses to `Nothing due` one-liner.

- [ ] **Step 1: Refactor: extract a shared `<GearDueRow />` inside `gear-due-list.tsx`**

Export both `GearDueList` and `GearDueRow`. `GearDueRow` renders one card including the life-bar.

- [ ] **Step 2: Write the preview band**

```tsx
import { GearDueRow } from './gear-due-list';
import type { GearDueItem } from '@/lib/gear/derive-gear-due';
import type { Bike } from '@/types/gear';

interface GearDuePreviewBandProps {
  items: GearDueItem[];
  bikes: Bike[];
  onLogService: (item: GearDueItem) => void;
  onViewAll: () => void;
  selectedBikeId: string | null;
}

export function GearDuePreviewBand({
  items, bikes, onLogService, onViewAll, selectedBikeId,
}: GearDuePreviewBandProps) {
  if (items.length === 0) {
    return <p className="text-sm leading-5 text-ink-500">Nothing due.</p>;
  }
  const top = items.slice(0, 2);
  return (
    <section aria-label="Due now" className="surface-note space-y-2 p-3 md:p-4">
      <header className="flex items-center justify-between">
        <p className="section-kicker text-[0.68rem] text-ink-700">Due now · {items.length}</p>
        {items.length > 2 && (
          <button type="button" onClick={onViewAll} className="text-xs font-medium text-brand-700 hover:underline">
            View all {items.length}
          </button>
        )}
      </header>
      <ul className="space-y-2">
        {top.map((item) => (
          <li key={item.id}>
            <GearDueRow item={item} bikes={bikes} showBikeName={selectedBikeId === null} onLogService={onLogService} />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Mount it in `gear.tsx`**

Place under the sub-nav, above the tabs. `onViewAll={() => setTab('due')}`.

- [ ] **Step 4: Verify**

Run: `npm run dev`. Confirm band appears on `/gear`, shows top 2 items, progress bars render, `View all` switches tab, empty state reads "Nothing due."

- [ ] **Step 5: Commit**

```bash
git add src/components/gear/gear-due-preview-band.tsx src/components/gear/gear-due-list.tsx src/pages/gear.tsx
git commit -m "feat(gear): add due-now preview band"
```

---

### Task 13: Service event edit/delete

**Files:**
- Create: `src/components/gear/edit-service-event-sheet.tsx`
- Modify: `src/components/gear/gear-history-list.tsx`

History rows get the overflow menu (Edit / Delete). Edit sheet mirrors `LogGearServiceSheet` fields (date, mileage, service type, next-due mileage / date, notes); Save calls `updateGearServiceEvent(id, updates)`. Delete calls `deleteGearServiceEvent`.

- [ ] **Step 1: Write the edit sheet**

Borrow form from `log-gear-service-sheet.tsx`; accept `event: GearServiceEvent` + `onClose`; prefill fields from the event; on save, call the store's `updateGearServiceEvent`.

- [ ] **Step 2: Wire overflow in history list**

Add `<OverflowMenu />` to each history row. Edit opens the sheet. Delete confirms then calls `deleteGearServiceEvent`.

- [ ] **Step 3: Mount sheet from `gear.tsx`**

Hold `editEventId` state in `gear.tsx`; pass `onEdit={(id) => setEditEventId(id)}` to `GearHistoryList`; render `<EditServiceEventSheet />` alongside existing sheets.

- [ ] **Step 4: Verify**

Run: `npm run dev`. Open History tab, click `⋯ → Edit` on a row, change notes, confirm list + Due tab reflect the change. Delete confirms and removes.

- [ ] **Step 5: Commit**

```bash
git add src/components/gear/edit-service-event-sheet.tsx src/components/gear/gear-history-list.tsx src/pages/gear.tsx
git commit -m "feat(gear): edit/delete service events"
```

---

### Task 14: Remove dead components and add sub-nav to `/gear`

**Files:**
- Delete: `src/components/gear/parts-inventory.tsx`
- Delete: `src/components/gear/part-catalog-form.tsx`
- Delete: `src/components/gear/part-instance-form.tsx`
- Modify: `src/pages/gear.tsx`

`gear-inventory.tsx` already exists as the new flat-list body (Task 11). The three catalog/instance forms are no longer referenced. Also mount `<GearSubNav />` on `/gear`.

- [ ] **Step 1: Confirm no imports**

Run: `rg "parts-inventory|part-catalog-form|part-instance-form" src/`
Expected: no matches (after Task 5 cleanup).

- [ ] **Step 2: Delete files**

```bash
git rm src/components/gear/parts-inventory.tsx src/components/gear/part-catalog-form.tsx src/components/gear/part-instance-form.tsx
```

- [ ] **Step 3: Mount `<GearSubNav />` on `/gear`**

In `gear.tsx`, under `<PageIntro />` and above the bike-picker / content grid, render `<GearSubNav />`.

- [ ] **Step 4: Type-check + test + visual**

Run: `npx tsc --noEmit && npm test && npm run dev`. Confirm all gear flows reachable, sub-nav on both pages, no stray console errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(gear): remove old parts/catalog screens; mount sub-nav on /gear"
```

---

## Verification checklist

After Task 14, run:

- `npx tsc --noEmit` — no type errors.
- `npm run lint` — no lint errors.
- `npm test` — all tests pass.
- `npm run build` — production build succeeds.

Manual smoke (browser):

- `/gear` — shows sub-nav, bike picker, due-now band, three tabs, life-bars on due rows.
- `/gear/inventory` — shows sub-nav, summary strip, filter chips, flat parts list, `+ Add part`.
- Add a chain via Add Part sheet — catalog row auto-created; second chain with same brand/model reuses it (verify via dev store inspection).
- Edit a spare part — spec changes apply in place when sole owner; create sibling first, edit again, confirm fork.
- Try to delete an installed part — get guardrail error.
- Edit a service event — Due list updates.
- Delete a service event — removed from History and Due.

## Out of scope (per spec)

- Calculation engine, Strava sync, planner/nutrition changes.
- Bike nickname / override at Strava import (deferred).
- Install / remove / log-service sheet redesign (kept as-is).
- "Manage part types" admin drawer (deferred unless autocomplete proves insufficient after use).

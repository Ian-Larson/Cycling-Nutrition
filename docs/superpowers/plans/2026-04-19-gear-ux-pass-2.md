# Gear UX Pass #2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three gear-page annoyances: bike selection no longer resets to "All bikes" on navigation, the preview band separates Overdue from Due Soon correctly, and History is rendered as a compact sortable table with row-level delete.

**Architecture:**
- **Bike persistence:** promote `selectedBikeId` out of `GearPage` local state into the persisted Zustand store (`gearSelectedBikeId`) so navigation + reload both preserve it. Fall back to primary bike when the stored ID refers to a deleted bike.
- **Due Soon vs Due Now:** tighten `deriveUrgency`'s "soon" threshold to `max(intervalMi * 0.2, 100)` (chain wax @ 100 mi remaining stops being classified as OK) and rework `GearDuePreviewBand` to (a) only list `overdue`+`soon` rows and (b) split the header count into `Overdue · N` and `Due soon · M`.
- **History table:** replace the card list in `GearHistoryList` with a single responsive HTML table whose headers click to sort, with a delete icon per row (service events only). Row-building logic stays the same; only the render surface changes.

**Tech Stack:** React 19 + TypeScript + Zustand (persist + immer middleware), Tailwind v4, Vitest.

---

## File Structure

**Create:**
- `src/components/gear/gear-history-table.tsx` — new sortable-table renderer for history rows

**Modify:**
- `src/store/index.ts` — add `gearSelectedBikeId` field, `setGearSelectedBikeId` action, wire into persist allowlist and `AppDataSnapshot`
- `src/pages/gear.tsx` — read/write bike selection from store; remove local `selectedBikeId` + `hasUserSelectedBike` state
- `src/lib/gear/derive-gear-due.ts` — tighten `deriveUrgency` soon threshold
- `src/lib/gear/derive-gear-due.test.ts` — add chain-wax 100 mi regression test
- `src/components/gear/gear-due-preview-band.tsx` — filter to overdue+soon, split header counts
- `src/components/gear/gear-history-list.tsx` — delete (thin wrapper → re-export table or delete entirely; see Task 3)

---

## Task 1: Persist selected bike in the store

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/pages/gear.tsx`
- Test: `src/store/index.test.ts`

- [ ] **Step 1: Add the persisted field + action to the store interface**

In `src/store/index.ts`, add to `AppState` (alongside the other gear fields around line 108):

```ts
  gearSelectedBikeId: string | null;
```

And in the action list (near `setBikeOdometer` around line 140):

```ts
  setGearSelectedBikeId: (bikeId: string | null) => void;
```

- [ ] **Step 2: Initialize default and implement the action**

Add `gearSelectedBikeId: null` to the initial state block (where `gearServiceEvents: []` is initialized around line 660).

Add the action implementation near the other bike actions:

```ts
      setGearSelectedBikeId: (bikeId) =>
        set((state) => {
          state.gearSelectedBikeId = bikeId;
        }),
```

- [ ] **Step 3: Include the field in the snapshot + normalize it in the persist merge**

In `AppDataSnapshot` interface (around line 73), add:

```ts
  gearSelectedBikeId: string | null;
```

In the picked snapshot union in `snapshotAppData`'s signature (around line 525), add `'gearSelectedBikeId'`.

In `snapshotAppData` return (around line 528):

```ts
    gearSelectedBikeId: state.gearSelectedBikeId,
```

In `normalizeAppData` return (around line 560):

```ts
    gearSelectedBikeId:
      typeof incoming?.gearSelectedBikeId === 'string'
        ? incoming.gearSelectedBikeId
        : incoming?.gearSelectedBikeId === null
          ? null
          : fallback.gearSelectedBikeId,
```

In the zustand `persist` `merge` callback (around line 1318–1356), add an explicit line to the returned object so a malformed persisted value can't sneak into state:

```ts
          gearSelectedBikeId:
            typeof incoming.gearSelectedBikeId === 'string'
              ? incoming.gearSelectedBikeId
              : incoming.gearSelectedBikeId === null
                ? null
                : currentState.gearSelectedBikeId,
```

(The store uses `persist` with a `merge` callback, not `partialize` — the whole state is persisted by default, and `merge` sanitizes incoming fields. The `...incoming` spread near the top of `merge` already covers the happy path, but the explicit override keeps us aligned with how the other gear fields are handled.)

- [ ] **Step 4: Write the failing store test**

The tests in `src/store/index.test.ts` share one `useStore` singleton via `useStore.getState()` / `useStore.setState()`. Add a fresh `describe` block at the bottom of the file (matching the style of the gear blocks above):

```ts
describe('gearSelectedBikeId', () => {
  beforeEach(() => {
    useStore.setState({ gearSelectedBikeId: null });
  });

  it('defaults to null and is updated via setGearSelectedBikeId', () => {
    expect(useStore.getState().gearSelectedBikeId).toBe(null);
    useStore.getState().setGearSelectedBikeId('bike-123');
    expect(useStore.getState().gearSelectedBikeId).toBe('bike-123');
    useStore.getState().setGearSelectedBikeId(null);
    expect(useStore.getState().gearSelectedBikeId).toBe(null);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/store/index.test.ts -t "persists gearSelectedBikeId"`
Expected: FAIL — either "setGearSelectedBikeId is not a function" or snapshot missing the field.

- [ ] **Step 6: Run the full vitest gear suite to confirm prior tests still pass**

Run: `npx vitest run src/store src/lib/gear`
Expected: PASS with the new test now passing too.

- [ ] **Step 7: Wire `GearPage` to the store**

In `src/pages/gear.tsx`, replace the local state block:

```tsx
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(
    primaryBikeId
  );
  const [hasUserSelectedBike, setHasUserSelectedBike] = useState(false);
```

with:

```tsx
  const selectedBikeId = useStore((s) => s.gearSelectedBikeId);
  const setGearSelectedBikeId = useStore((s) => s.setGearSelectedBikeId);
```

Replace the `selectedBikeIdForView` memo with:

```tsx
  const selectedBikeIdForView = useMemo(() => {
    if (selectedBikeId && bikes.some((bike) => bike.id === selectedBikeId)) {
      return selectedBikeId;
    }
    if (selectedBikeId === null) return null;
    return primaryBikeId;
  }, [bikes, primaryBikeId, selectedBikeId]);
```

Replace `handleSelectBike`:

```tsx
  const handleSelectBike = (bikeId: string | null) => {
    setGearSelectedBikeId(bikeId);
  };
```

- [ ] **Step 8: Seed default on first mount when no selection has ever been made**

Add a `useEffect` just below the memo definitions so a brand-new user defaults to their primary bike instead of "All bikes":

```tsx
  useEffect(() => {
    if (selectedBikeId !== null) return;
    if (primaryBikeId === null) return;
    const stored = useStore.getState().gearSelectedBikeId;
    if (stored === null && !bikes.some((b) => b.id === primaryBikeId)) return;
    // Only seed if user has never made an explicit choice: stored === null and
    // there is a primary bike to default to. Null is a legitimate "All bikes"
    // choice once the user picks it, so we check getState() directly.
    if (stored === null) setGearSelectedBikeId(primaryBikeId);
  }, [bikes, primaryBikeId, selectedBikeId, setGearSelectedBikeId]);
```

*Why the `getState()` re-read:* Zustand subscriptions update on every change, and we only want to seed once at mount when the stored value is still `null`. Reading via `getState()` avoids an effect loop after the user later explicitly picks "All bikes".

- [ ] **Step 9: Manual verification**

Run: `npm run dev` and open the gear page. Select a non-primary bike, navigate to `/gear/inventory` and back, then reload the page. The same bike should stay selected in both cases.

- [ ] **Step 10: Commit**

```bash
git add src/store/index.ts src/store/index.test.ts src/pages/gear.tsx
git commit -m "feat(gear): persist selected bike across navigation and reload"
```

---

## Task 2: Tighten "soon" threshold and split preview band counts

**Files:**
- Modify: `src/lib/gear/derive-gear-due.ts:94-115`
- Modify: `src/lib/gear/derive-gear-due.test.ts`
- Modify: `src/components/gear/gear-due-preview-band.tsx`

- [ ] **Step 1: Write the failing regression test**

In `src/lib/gear/derive-gear-due.test.ts`, add inside the main `describe` block:

```ts
  it('classifies a 100 mi remaining chain wax on a 250 mi interval as soon, not ok', () => {
    const items = deriveGearDue({
      bikes: [bike({ cachedOdometerMi: 900 })],
      installRecords: [],
      serviceEvents: [
        serviceEvent({
          typeKey: 'chain_wax',
          intervalMi: 250,
          mileageMi: 750,
          nextDueMileageMi: 1000,
        }),
      ],
      today,
    });

    expect(items).toHaveLength(1);
    expect(items[0].remainingMi).toBe(100);
    expect(items[0].urgency).toBe('soon');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/gear/derive-gear-due.test.ts -t "100 mi remaining chain wax"`
Expected: FAIL — current code returns `'ok'` because `100 > 250 * 0.1`.

- [ ] **Step 3: Loosen the `soon` threshold**

In `src/lib/gear/derive-gear-due.ts`, change `deriveUrgency`:

```ts
function deriveUrgency(
  event: GearServiceEvent,
  remainingMi: number | null,
  remainingDays: number | null
): GearUrgency {
  if (
    (remainingMi !== null && remainingMi < 0) ||
    (remainingDays !== null && remainingDays < 0)
  ) {
    return 'overdue';
  }

  const mileageIsSoon =
    remainingMi !== null &&
    event.intervalMi !== undefined &&
    remainingMi <= Math.max(event.intervalMi * 0.2, 100);
  const dateIsSoon = remainingDays !== null && remainingDays <= 14;
  if (mileageIsSoon || dateIsSoon) return 'soon';

  if (remainingMi !== null || remainingDays !== null) return 'ok';
  return 'unknown';
}
```

*Why the floor at 100:* for short intervals like a 250 mi chain wax, 20% = 50 mi gives almost no warning. A 100 mi absolute floor matches rider expectations. Long intervals (e.g., 5000 mi cassette) still use 20% = 1000 mi.

Mirror the same expression in `derive-active-setup.ts`'s `deriveUrgency` (around line 98–103) to keep the two in sync:

```ts
  const mileageIsSoon =
    mileageRemaining !== null &&
    service.intervalMi !== undefined &&
    mileageRemaining <= Math.max(service.intervalMi * 0.2, 100);
```

- [ ] **Step 4: Run the vitest gear suite**

Run: `npx vitest run src/lib/gear src/store`
Expected: ALL PASS, including the new chain-wax test. Existing "overdue, soon, ok" ordering test still passes because 25 mi < 100 (soon) and 300 mi > 200 (ok).

- [ ] **Step 5: Rework `GearDuePreviewBand` to split counts and filter to overdue+soon**

Replace the body of `src/components/gear/gear-due-preview-band.tsx` with:

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
  items,
  bikes,
  onLogService,
  onViewAll,
  selectedBikeId,
}: GearDuePreviewBandProps) {
  const attention = items.filter(
    (item) => item.urgency === 'overdue' || item.urgency === 'soon'
  );
  if (attention.length === 0) {
    return (
      <p className="text-sm leading-5 text-ink-500">Nothing due soon.</p>
    );
  }

  const overdueCount = attention.filter((i) => i.urgency === 'overdue').length;
  const soonCount = attention.length - overdueCount;
  const top = attention.slice(0, 2);

  return (
    <section
      aria-label="Service attention"
      className="surface-note space-y-2 p-3 md:p-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem]">
          {overdueCount > 0 ? (
            <span className="section-kicker text-rose-700">
              Overdue · {overdueCount}
            </span>
          ) : null}
          {overdueCount > 0 && soonCount > 0 ? (
            <span aria-hidden className="text-ink-400">·</span>
          ) : null}
          {soonCount > 0 ? (
            <span className="section-kicker text-amber-700">
              Due soon · {soonCount}
            </span>
          ) : null}
        </div>
        {attention.length > 2 ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            View all {attention.length}
          </button>
        ) : null}
      </header>
      <ul className="space-y-2">
        {top.map((item) => (
          <li key={item.id}>
            <GearDueRow
              item={item}
              bikes={bikes}
              showBikeName={selectedBikeId === null}
              onLogService={onLogService}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`. With chain wax at ~100 mi remaining the preview band should now show `Due soon · 1` (amber), not `Due now`. An overdue item should show `Overdue · N` (rose). Both present should show `Overdue · N · Due soon · M`. With nothing overdue/soon, the band shows `Nothing due soon.`

- [ ] **Step 7: Commit**

```bash
git add src/lib/gear/derive-gear-due.ts src/lib/gear/derive-gear-due.test.ts src/lib/gear/derive-active-setup.ts src/components/gear/gear-due-preview-band.tsx
git commit -m "feat(gear): distinguish Overdue from Due soon and tighten soon threshold"
```

---

## Task 3: Replace history card list with a sortable table

**Files:**
- Create: `src/components/gear/gear-history-table.tsx`
- Modify: `src/components/gear/gear-history-list.tsx` (thin re-export or delete + update import in `gear.tsx`)
- Modify: `src/pages/gear.tsx` (import the new component)

- [ ] **Step 1: Create the new table component**

Create `src/components/gear/gear-history-table.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Card, CardContent } from '@/components/ui';
import { getBikeSlot, getGearServiceType } from '@/lib/gear/constants';
import { useStore } from '@/store';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';

interface GearHistoryTableProps {
  events: GearServiceEvent[];
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  onEditEvent?: (eventId: string) => void;
}

type RowKind = 'Service' | 'Install' | 'Remove';

interface HistoryRow {
  id: string;
  kind: RowKind;
  dateIso: string;
  sortTime: number;
  item: string;
  bike: string;
  part: string | null;
  mileageMi: number | null;
  notes: string[];
  eventId?: string;
}

type SortColumn = 'date' | 'kind' | 'item' | 'bike' | 'mileage';
type SortDirection = 'asc' | 'desc';

function formatDate(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

function formatMi(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value).toLocaleString()} mi`;
}

function partLabel(
  partInstanceId: string | undefined,
  instances: GearPartInstance[],
  catalog: GearPartCatalogItem[]
): string | null {
  if (!partInstanceId) return null;
  const instance = instances.find((c) => c.id === partInstanceId);
  const item = instance
    ? catalog.find((c) => c.id === instance.catalogItemId)
    : null;
  if (instance?.label) return instance.label;
  if (item) return [item.brand, item.model].filter(Boolean).join(' ') || item.model;
  return partInstanceId;
}

function buildRows(
  events: GearServiceEvent[],
  installRecords: GearInstallRecord[],
  bikes: Bike[],
  catalog: GearPartCatalogItem[],
  instances: GearPartInstance[]
): HistoryRow[] {
  const bikeName = (id: string) =>
    bikes.find((b) => b.id === id)?.name ?? 'Unknown bike';

  const serviceRows: HistoryRow[] = events.map((event) => ({
    id: `service:${event.id}`,
    kind: 'Service',
    dateIso: event.dateIso,
    sortTime: event.createdAt,
    item: getGearServiceType(event.typeKey).label,
    bike: bikeName(event.bikeId),
    part:
      partLabel(event.partInstanceId, instances, catalog) ??
      (event.slotKey ? getBikeSlot(event.slotKey).label : null),
    mileageMi: event.mileageMi ?? null,
    notes: [
      event.materialsNote ? `Materials: ${event.materialsNote}` : null,
      event.notes ? `Notes: ${event.notes}` : null,
    ].filter((v): v is string => v !== null),
    eventId: event.id,
  }));

  const installRows: HistoryRow[] = installRecords.map((record) => ({
    id: `install:${record.id}`,
    kind: 'Install',
    dateIso: record.installedDateIso,
    sortTime: record.createdAt,
    item: getBikeSlot(record.slotKey).label,
    bike: bikeName(record.bikeId),
    part: partLabel(record.partInstanceId, instances, catalog),
    mileageMi: record.installedAtMileageMi,
    notes: [],
  }));

  const removeRows: HistoryRow[] = installRecords.flatMap((record) => {
    if (!record.removedDateIso || record.removedAtMileageMi === undefined) {
      return [];
    }
    return [
      {
        id: `remove:${record.id}`,
        kind: 'Remove',
        dateIso: record.removedDateIso,
        sortTime: record.updatedAt,
        item: getBikeSlot(record.slotKey).label,
        bike: bikeName(record.bikeId),
        part: partLabel(record.partInstanceId, instances, catalog),
        mileageMi: record.removedAtMileageMi,
        notes: record.removeReason ? [`Reason: ${record.removeReason}`] : [],
      },
    ];
  });

  return [...serviceRows, ...installRows, ...removeRows];
}

function compareBy(column: SortColumn, a: HistoryRow, b: HistoryRow): number {
  if (column === 'date') {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    return a.sortTime - b.sortTime;
  }
  if (column === 'kind') return a.kind.localeCompare(b.kind);
  if (column === 'item') return a.item.localeCompare(b.item);
  if (column === 'bike') return a.bike.localeCompare(b.bike);
  if (column === 'mileage') {
    const av = a.mileageMi ?? Number.NEGATIVE_INFINITY;
    const bv = b.mileageMi ?? Number.NEGATIVE_INFINITY;
    return av - bv;
  }
  return 0;
}

export function GearHistoryTable({
  events,
  installRecords,
  bikes,
  catalog,
  instances,
  onEditEvent,
}: GearHistoryTableProps) {
  const deleteGearServiceEvent = useStore((s) => s.deleteGearServiceEvent);
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: 'date',
    direction: 'desc',
  });

  const rows = useMemo(
    () => buildRows(events, installRecords, bikes, catalog, instances),
    [events, installRecords, bikes, catalog, instances]
  );
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp = compareBy(sort.column, a, b);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-5 md:py-6">
          <p className="text-sm leading-5 text-ink-600">
            No gear service history yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleHeaderClick = (column: SortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: column === 'date' || column === 'mileage' ? 'desc' : 'asc' }
    );
  };

  const handleDelete = (eventId: string) => {
    const confirmed = window.confirm(
      'Delete this service event? This cannot be undone.'
    );
    if (!confirmed) return;
    deleteGearServiceEvent(eventId);
  };

  const sortIndicator = (column: SortColumn) =>
    sort.column === column ? (sort.direction === 'asc' ? '▲' : '▼') : '';

  const headerButton = (column: SortColumn, label: string, align: 'left' | 'right' = 'left') => (
    <button
      type="button"
      onClick={() => handleHeaderClick(column)}
      className={clsx(
        'flex w-full items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide text-ink-600 hover:text-ink-900',
        align === 'right' ? 'justify-end' : 'justify-start'
      )}
    >
      <span>{label}</span>
      <span aria-hidden className="text-[0.6rem] text-ink-500">
        {sortIndicator(column)}
      </span>
    </button>
  );

  return (
    <div className="surface-note overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-shell-50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left">
              {headerButton('date', 'Date')}
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              {headerButton('kind', 'Type')}
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              {headerButton('item', 'Item')}
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              {headerButton('bike', 'Bike')}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {headerButton('mileage', 'Mileage', 'right')}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr
              key={row.id}
              className={clsx(
                'align-top',
                index % 2 === 1 ? 'bg-white' : 'bg-shell-50/30'
              )}
            >
              <td className="whitespace-nowrap px-3 py-2 text-ink-700 tabular-nums">
                {formatDate(row.dateIso)}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    row.kind === 'Service' && 'bg-brand-100 text-brand-900',
                    row.kind === 'Install' && 'bg-emerald-100 text-emerald-800',
                    row.kind === 'Remove' && 'bg-amber-100 text-amber-800'
                  )}
                >
                  {row.kind}
                </span>
              </td>
              <td className="px-3 py-2 text-ink-900">
                <div className="font-medium">{row.item}</div>
                {row.part ? (
                  <div className="text-xs text-ink-600">{row.part}</div>
                ) : null}
                {row.notes.map((note) => (
                  <div key={note} className="text-xs text-ink-500">
                    {note}
                  </div>
                ))}
              </td>
              <td className="px-3 py-2 text-ink-700">{row.bike}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right text-ink-700 tabular-nums">
                {formatMi(row.mileageMi)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                {row.eventId ? (
                  <div className="flex justify-end gap-1">
                    {onEditEvent ? (
                      <button
                        type="button"
                        onClick={() => onEditEvent(row.eventId as string)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-ink-700 hover:bg-shell-100"
                        aria-label="Edit service event"
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDelete(row.eventId as string)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      aria-label="Delete service event"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

*Why a real `<table>` vs divs:* semantic HTML gives keyboard/AT users correct row/column announcements for free, and `white-space: nowrap` + `tabular-nums` give a visually aligned result without any hand-measured grid.

- [ ] **Step 2: Point `GearPage` at the new component**

In `src/pages/gear.tsx`, replace the import:

```tsx
import { GearHistoryList } from '@/components/gear/gear-history-list';
```

with:

```tsx
import { GearHistoryTable } from '@/components/gear/gear-history-table';
```

Replace the JSX usage (around line 302):

```tsx
          {tab === 'history' ? (
            <GearHistoryTable
              events={filteredServiceEvents}
              installRecords={
                selectedBikeIdForView
                  ? gearInstallRecords.filter(
                      (record) => record.bikeId === selectedBikeIdForView
                    )
                  : gearInstallRecords
              }
              bikes={bikes}
              catalog={gearPartCatalog}
              instances={gearPartInstances}
              onEditEvent={(id) => setEditEventId(id)}
            />
          ) : null}
```

- [ ] **Step 3: Delete the old `GearHistoryList`**

Delete `src/components/gear/gear-history-list.tsx` entirely. Verify with:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run lint + tests**

```bash
npm run lint
npx vitest run
```

Expected: all pass.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`. On the History tab:
- Default sort is Date desc.
- Click each header to toggle asc/desc; active column shows ▲/▼.
- Delete button on Service rows removes the event after confirmation.
- Install/Remove rows have no delete action (they're tied to install records).
- Table scrolls horizontally on narrow screens; header stays legible.

- [ ] **Step 6: Commit**

```bash
git add src/components/gear/gear-history-table.tsx src/pages/gear.tsx
git rm src/components/gear/gear-history-list.tsx
git commit -m "feat(gear): replace history cards with sortable table + row delete"
```

---

## Final verification

- [ ] **Step 1: Full check**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
```

Expected: lint clean, typecheck clean, all tests pass.

- [ ] **Step 2: Push**

```bash
git push origin main
```

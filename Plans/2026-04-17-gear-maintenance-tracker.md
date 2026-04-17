# Gear & Service Tracking — Design

**Status:** Design approved, ready for implementation planning
**Date:** 2026-04-17
**Owner:** Ian

## Problem

Ian currently tracks chain-wax lifecycles (and eventually other maintenance) in a spreadsheet. For each wax he checks his bike's odometer in Strava, records `(date, mileage)`, and computes a `service at: mileage + 250 mi` target to know when the next wax is due. The workflow is manual, requires cross-referencing Strava, and only surfaces "am I overdue?" when he looks at the sheet.

We want to pull this into the Cycling Nutrition app as a first-class feature with:

1. A **"what's due"** view that computes urgency automatically.
2. A **quick-add** flow that takes 2–3 taps to log a completed service.
3. **Strava odometer** auto-fill so mileage isn't re-entered by hand.
4. **Multi-bike** support, with a default/primary bike for the fast path.
5. **Preset service types** with editable intervals per entry.

## Scope

### In scope (v1)

- A new `/gear` area reachable from the main nav.
- Bike management (auto-import from Strava, manual bikes allowed).
- Four preset service types: Chain wax, Chain, Brake pads, Tires.
- Quick-add sheet with Strava-backed mileage pre-fill.
- "What's due" view + component-oriented history tab.
- Local persistence via Zustand + localStorage (same pattern as existing slices).

### Out of scope (v1)

- Supabase cloud sync (data shape compatible; follow-up PR).
- Push notifications / OS-level reminders.
- User-defined service types or per-bike interval customization (per entry is enough).
- Multi-bike primary switching (exactly one primary).
- CSV import.

## Product decisions (from brainstorm)

| Decision | Choice | Why |
|---|---|---|
| Service-type model | Preset-driven, small fixed set | Fast picker, covers ~90% of use; extensible later |
| Bike model | Multi-bike with one primary | Keeps fast path for primary, scales to 2nd bike |
| Bike source | Auto-sync from Strava, editable after | Zero friction for common case, not locked in |
| Mileage sync | On-demand + auto-refresh on quick-add open | Fresh when it matters, no background infra |
| Page shape | "Due" on top, component-oriented history below | Action-forward, but keeps spreadsheet-like log |
| Reminders | Passive only (no push, no badges) | Minimal infra for v1 |
| Preset set | Chain wax (250), Chain (2,000), Brake pads (1,500), Tires (2,500) | Minimal, intervals overridable per entry |

## Architecture

### Routing & navigation

- New route: `/gear`.
- Mobile nav gains a 6th slot (`grid-cols-6`) in `src/components/layout/mobile-nav.tsx`. Items: Plan, Athlete, Inventory, Plans, **Gear**, Account.
- Desktop header: same link set.
- Single page in v1. `Due` / `History` tabs use the Planner's existing tab styling pattern.

### Data model

Three entity types, added to the existing Zustand store in `src/store/index.ts`.

```ts
// src/types/gear.ts (new)

export interface Bike {
  id: string;
  name: string;
  stravaGearId: string | null;       // null for manual bikes
  cachedOdometerMi: number | null;
  odometerSyncedAtIso: string | null;
  isPrimary: boolean;                // exactly one bike = true
  createdAt: number;
  updatedAt: number;
}

export type ServiceTypeKey =
  | 'chain_wax'
  | 'chain'
  | 'brake_pads'
  | 'tires';

export interface ServiceEntry {
  id: string;
  bikeId: string;
  typeKey: ServiceTypeKey;
  dateIso: string;
  mileageMi: number;                 // odometer at time of service
  intervalMi: number;                // copied from preset, editable per entry
  serviceAtMi: number;               // = mileageMi + intervalMi (stored, not recomputed on read)
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

**Preset service types** live in `src/lib/gear/service-types.ts` — a constants file, not user-editable in v1:

```ts
export const SERVICE_TYPES = [
  { key: 'chain_wax',  label: 'Chain wax',  defaultIntervalMi: 250 },
  { key: 'chain',      label: 'Chain',      defaultIntervalMi: 2000 },
  { key: 'brake_pads', label: 'Brake pads', defaultIntervalMi: 1500 },
  { key: 'tires',      label: 'Tires',      defaultIntervalMi: 2500 },
] as const;
```

**Store slices** (extend `src/store/index.ts`):

- `bikes: Bike[]`
- `serviceEntries: ServiceEntry[]`
- Actions: `addBike`, `updateBike`, `deleteBike`, `setPrimaryBike`, `upsertBikesFromStrava`, `addServiceEntry`, `updateServiceEntry`, `deleteServiceEntry`, `setBikeOdometer`.
- Persistence: existing localStorage mechanism (the Zustand `persist` middleware already covers the store).

### Deriving "what's due"

Pure function in `src/lib/gear/derive-due.ts`:

```ts
interface DueItem {
  bikeId: string;
  typeKey: ServiceTypeKey;
  lastEntry: ServiceEntry;
  remainingMi: number;              // can be negative
  urgency: 'overdue' | 'soon' | 'ok';
}

function deriveDue(bikes: Bike[], entries: ServiceEntry[]): DueItem[]
```

- For each `(bike, typeKey)` that has ≥1 prior entry, find the latest entry, compute `remainingMi = entry.serviceAtMi - bike.cachedOdometerMi`.
- `urgency`: `overdue` if `remainingMi < 0`; `soon` if `remainingMi ≤ 0.1 * intervalMi`; else `ok`.
- Sort ascending by `remainingMi`.
- A `(bike, typeKey)` pair with no prior entry does NOT appear in Due — it appears on first log.

### Strava gear integration

**Endpoint:** `GET /athlete` (Strava API). Returns the athlete including `bikes[]`: `{ id, nickname, distance, primary }`. `distance` is meters (lifetime).

**Scope:** `profile:read_all`. Verify `strava-provider.ts` already requests it; if not, add and require re-consent.

**Edge function:** new `strava-gear-list` Supabase edge function, mirroring `exchangeStravaCode` / `disconnectStrava`. Keeps client secret server-side.

**Client code:**

- `src/lib/gear/strava-gear.ts` — `fetchStravaBikes(supabase)` → `{ stravaGearId, name, odometerMi, isPrimary }[]`. Converts meters → miles, shapes response.
- `src/hooks/use-strava-gear.ts` — React hook wrapping the fetch with a 10-minute cache, `refresh()`, `lastSyncedAt`, `isFetching`, `error`.

**When fetch fires:**

- `/gear` mount if cache >10 min stale.
- Quick-add sheet open (non-blocking — render with cached value, patch field if fresh value arrives before submit).

**Failure handling:**

- Strava disconnected → fall back to cached odometer, show "Strava not connected" hint under the mileage field.
- Fetch fails → use cached, show "last synced Xh ago" subtitle.
- Bike deleted in Strava → mark app bike as "link broken"; user can remap or unlink.

## UI

### `/gear` page

```
┌─────────────────────────────────────────┐
│ Gear                   [+ Log service]  │   ← PageIntro
│ Track maintenance and service intervals │
├─────────────────────────────────────────┤
│ [Force E1] [Allied ABLE]      ↻ 3m ago │   ← bike pill row
├─────────────────────────────────────────┤
│ [ Due ]  History                        │   ← tab control
├─────────────────────────────────────────┤
│ ⚠  Chain wax · Force E1                 │
│    −12 mi  (1,827 / 1,815)              │   ← overdue: red
│                          [Mark done ▸]  │
├─────────────────────────────────────────┤
│    Tires · Force E1                     │
│    1,247 mi (2,500 interval)            │   ← ok: ink
│                          [Mark done ▸]  │
└─────────────────────────────────────────┘
```

Visual system: existing Tailwind tokens (`shell`, `brand`, `ink`, `surface-note`, `border-soft`). No new colors or components beyond composition of existing primitives.

### History tab

- Grouped by service type. Collapsible sections: `Chain wax (7)`, `Tires (2)`, etc.
- Compact row: `04/12/2026 · 1,815 mi → 2,065 · Force E1`
- Tap row → edit sheet (same form as quick-add, with Delete).

### Quick-add sheet

Bottom sheet on mobile, modal on desktop. Single column.

```
Log service                           ×

Service
[🧼 Chain wax]  [⛓  Chain]
[🛑 Brake pads] [🛞 Tires]

Bike      Force E1                  ▼
Date      Today (Apr 17)           📅
Mileage   1,815 mi                  ↻
          (synced 3 min ago)

▸ Advanced
    Interval   250 mi

Next service at 2,065 mi

        [ Save service ]
```

- Service chip preselected from trigger context; otherwise first chip.
- Bike defaults to primary.
- Date defaults to today.
- Mileage: cached Strava value, live-refreshed on sheet open.
- Interval hidden under "Advanced" disclosure (preset default).
- "Next service at" is derived live from `mileage + interval`.

### Manage bikes page

Behind a link at the bottom of `/gear` or from the bike pill menu. Small page:

- List of bikes: rename, set primary, unlink from Strava, delete (with confirm).
- "Add manual bike" button → name + starting odometer.
- "Refresh from Strava" button → upserts Strava bikes (adds new, updates odometer on existing).

## Validation

- **Mileage ≥ last entry mileage** for the same bike. Inline error: "Mileage must be ≥ your last logged mileage (1,815)."
- **Interval > 0.**
- **Date not in future.**
- **Exactly one primary bike** at all times. Setting primary on another bike clears the previous.
- **Mileage monotonicity on Strava sync:** if a fetch returns a lower odometer than cached (rare; can happen on re-uploads), keep cached value and surface a warning rather than silently overwriting.

## Testing

- **Unit — `derive-due.ts`**: empty store, single entry per type, multiple types, overdue detection, `soon` threshold, sort order.
- **Unit — `strava-gear.ts` mapper**: meters → miles, primary flag, nickname fallback, error cases.
- **Store** (`src/store/index.test.ts` pattern): bike CRUD, `setPrimaryBike` invariant, entry CRUD, `upsertBikesFromStrava` merge semantics.
- **Component tests**: kept light, consistent with existing app conventions.

## Implementation order

1. **Foundation** — types, store slices, service-type constants, routing, nav slot. No user-visible change yet.
2. **Strava gear fetch** — edge function + `fetchStravaBikes` + hook.
3. **Gear page skeleton** — PageIntro, bike pills, tabs, empty states.
4. **Due tab** — `derive-due` + card list.
5. **History tab** — grouped collapsible list.
6. **Quick-add sheet** — form, defaults, validation, save.
7. **Manage bikes page** — CRUD + Strava upsert button.
8. **Edit sheet** — reuse quick-add for history row editing.

Each step should be a separate commit; steps 1–6 are the minimum viable shippable unit.

## Follow-ups (not in v1)

- Supabase cloud sync for `bikes` and `serviceEntries` (data shape is already compatible).
- Push notifications for overdue services.
- User-defined service types / per-bike interval defaults.
- CSV import from existing spreadsheets.
- Cost tracking per service (parts, labor).

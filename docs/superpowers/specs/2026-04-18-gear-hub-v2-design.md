# Gear Hub V2 Design

**Date:** 2026-04-18
**Status:** Approved for implementation planning
**Owner:** Ian

## Problem

The current gear page tracks maintenance as service entries against bikes. That works for simple intervals like chain wax, but it does not track the physical parts that are being maintained. Ian wants the gear page to answer questions like:

- Which exact chain is installed right now?
- How many miles does this chain have on it?
- Which tire, cassette, brake pad set, or chainring is installed on each bike?
- What spare parts are in gear inventory?
- Which services were performed on a specific component?

The app now also has Strava sync and Supabase cloud sync. Gear Hub V2 should use Strava odometer data for mileage-based lifecycles and keep syncing through Supabase without introducing unnecessary database administration work.

## Product Scope

`/gear` becomes the mechanical maintenance hub. It owns bikes, active installed setup, mechanical parts inventory, due items, and service history. The existing `/inventory` remains nutrition-only for bottles and fuel.

Core concepts:

1. **Part catalog**: reusable descriptions of parts, such as `Continental GP5000 S TR, tire, 28mm, 280g`.
2. **Part instances**: physical items the user owns, such as `GP5000 rear tire #1`, with lifecycle status.
3. **Bike slots**: installed positions on a bike, starting with fixed core slots.
4. **Service events**: maintenance logs attached to a bike and optionally to a specific part instance.

Lifecycle actions are explicit: add part, create instance, install instance, remove instance, retire instance, and log service. Component changes are infrequent enough that explicit lifecycle actions are clearer than bundling install/remove behavior into generic service logging.

### In Scope

- Gear-specific inventory inside `/gear`.
- Core wear-part categories: chains, tires, brake pads, cassettes, and chainrings.
- Category-specific attributes, plus `weightGrams` for all catalog parts.
- Active setup table per selected bike.
- Mileage-based and time-based due tracking.
- Service logs that can reference specific installed parts.
- Supabase sync through the existing app snapshot with a schema bump.
- Dev reset path for old gear service data.

### Out of Scope

- Normalized Supabase gear tables.
- Consumable inventory for wax, lube, sealant, bar tape, plugs, or brake fluid.
- Purchase history, cost tracking, and vendor tracking.
- User-facing custom slot management.
- Preloaded component database.

Consumables can be recorded in service `materialsNote` and `notes` fields for now.

## Data Model

The current `Bike` type largely remains. New gear entities sit next to bikes in the Zustand store and Supabase app snapshot.

### Gear Part Catalog Item

Describes a reusable product or part.

```ts
export type GearPartCategory =
  | 'chain'
  | 'tire'
  | 'brake_pad'
  | 'cassette'
  | 'chainring';

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
```

Category-specific attributes are intentionally small:

- Tire: `widthMm`, optional `diameter`, optional `tubelessReady`.
- Chain: optional `speedCount`.
- Brake pad: optional `compound`, optional `padShape`.
- Cassette: `range`, optional `speedCount`, for example `10-44`.
- Chainring: `toothCount`, optional `position`, optional `mount`.

```ts
export type GearPartAttributes =
  | { category: 'tire'; widthMm: number; diameter?: string; tubelessReady?: boolean }
  | { category: 'chain'; speedCount?: number }
  | { category: 'brake_pad'; compound?: string; padShape?: string }
  | { category: 'cassette'; range: string; speedCount?: number }
  | { category: 'chainring'; toothCount: number; position?: string; mount?: string };
```

### Gear Part Instance

Represents one physical item owned by the user.

```ts
export interface GearPartInstance {
  id: string;
  catalogItemId: string;
  label?: string;
  status: 'spare' | 'installed' | 'removed' | 'retired';
  acquiredDateIso?: string;
  retiredDateIso?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

Examples:

- `Chain A`
- `Front GP5000 #1`
- `Rear GP5000 #2`
- `Force XPLR 10-44 cassette`

### Bike Slot

The first UI ships with fixed core slots. The type leaves space for custom slots later.

```ts
export type BikeSlotKey =
  | 'chain'
  | 'front_tire'
  | 'rear_tire'
  | 'cassette'
  | 'front_brake_pads'
  | 'rear_brake_pads'
  | 'chainrings'
  | `custom:${string}`;
```

The fixed-slot implementation should validate compatible categories. For example, `front_tire` and `rear_tire` accept tire instances, and `chain` accepts chain instances.

### Gear Install Record

Tracks where a physical instance was installed over time.

```ts
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
```

An active install record has no `removedAtMileageMi` and no `removedDateIso`.

### Gear Service Event

Replaces the current maintenance `ServiceEntry` model.

```ts
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
```

Service events can be bike-only, slot-specific, or part-instance-specific. Chain wax should normally attach to the installed chain instance.

## Derived State

The UI should not manually maintain active setup or due status. These should be derived from the canonical arrays.

### Active Setup

`deriveActiveSetup(bikes, catalog, instances, installRecords, serviceEvents)` returns one row per fixed slot for the selected bike:

- slot key and label
- installed instance, if any
- catalog item details, if installed
- miles since install, if the bike has an odometer
- latest relevant service event
- next due mileage/date, if available
- urgency: `overdue`, `soon`, `ok`, or `unknown`

### Due Items

`deriveGearDue(...)` derives due items from:

- active install records
- bike cached odometer
- latest service events with `nextDueMileageMi` or `nextDueDateIso`
- category defaults where useful

Due logic:

- Mileage item is overdue when `currentBikeMileage > nextDueMileageMi`.
- Mileage item is soon when remaining mileage is at or below 10% of the interval.
- Date item is overdue when today is after `nextDueDateIso`.
- Date item is soon when due within 14 days.
- Items with missing odometer/date data are `unknown`, not hidden.

## UI and Workflows

### Gear Page Layout

`/gear` uses a hub layout:

1. **Bike selector/sidebar**
   - Existing Strava bike sync remains.
   - Bike odometer remains the mileage source.
   - Manual bikes remain allowed.

2. **Active Setup**
   - Primary view for a selected bike.
   - Shows fixed slots: chain, front tire, rear tire, cassette, front brake pads, rear brake pads, chainrings.
   - Each row shows installed part, miles since install, latest relevant service, due status, and actions.
   - Empty slots show `Install part`.

3. **Due**
   - Derived list of mileage and time due items.
   - Examples: `Chain A wax overdue by 12 mi`, `Rear tire inspection due in 9 days`, `Cassette at 2,410 mi`.
   - `Log service` opens with bike, slot, and part preselected when launched from a due item.

4. **Parts Inventory**
   - Gear-specific inventory inside `/gear`.
   - Supports catalog items and physical instances.
   - Add catalog part: category, brand, model, weight, category attributes.
   - Add instances from a catalog item, either one at a time or with quantity.
   - Filter by category and instance status.

5. **History**
   - Shows service events and install/remove events.
   - Can filter by bike, part category, exact part instance, and service type.
   - A part detail view can show installed periods, services, total mileage, and retirement.

### Main Flows

**Add new parts**

1. Create or select a catalog item.
2. Create one or more physical instances.
3. New instances start as `spare`.

**Install part**

1. Pick bike slot.
2. Pick a compatible `spare` or `removed` instance.
3. Record install date and mileage.
4. Create an active install record.
5. Set instance status to `installed`.

If the slot already has an installed part, the user must remove or retire that part first.

**Remove or retire part**

1. Select active installed part.
2. Record removal date and mileage.
3. Complete the active install record.
4. Set instance status to `removed` or `retired`.

`removed` means the part can be reinstalled later. `retired` means the part is done.

**Log service**

1. Pick bike.
2. Optionally pick slot and installed part instance.
3. Pick service type.
4. Record date, mileage, optional mileage interval, optional time interval, materials note, and notes.
5. Compute `nextDueMileageMi` and/or `nextDueDateIso` when interval fields are present.

## Sync and Migration

The build keeps the current cloud-sync approach:

- Supabase table remains `user_state`.
- The app continues writing one JSON snapshot to `user_state.app_state`.
- `APP_STATE_SCHEMA_VERSION` increments from `1` to `2`.
- The new snapshot fields are:
  - `gearPartCatalog`
  - `gearPartInstances`
  - `gearInstallRecords`
  - `gearServiceEvents`
- `serializeAppState`, `parseSerializedAppState`, `normalizeAppData`, and persisted-store merge logic all support the new fields.

This avoids new RLS policies, normalized table migrations, and database-admin work for this build. Entity IDs and relationships should still be clean so normalized tables can be added later without redesigning the feature.

### Dev Reset Policy

There are no production users, so old maintenance entries do not need a careful migration.

- Schema v1 data can load with empty new gear arrays.
- Existing `bikes` may be preserved when possible, but they can also be re-synced from Strava.
- Existing `serviceEntries` can be dropped during schema v2 normalization.
- If cloud data blocks development due to schema mismatch, it is acceptable to delete `user_state` rows or local storage and re-sync.

After Gear Hub V2 lands, the old `ServiceEntry` model should be removed or kept only behind a short implementation bridge if needed.

## Validation and Error Handling

- Installing into an occupied slot is blocked until the current part is removed or retired.
- Removing a part requires an active install record.
- Retiring a part completes any active install record first.
- Service events may be bike-only, but part-specific service events must reference an existing part instance.
- Part-specific service events should warn if the selected part is not currently installed on the selected bike.
- Mileage cannot go backward for install/remove/service events on the same bike unless a future edit flow explicitly allows correction.
- `intervalMi` and `intervalDays` must be positive when provided.
- `weightGrams`, if provided, must be positive.
- Required category attributes must be present: tire width, cassette range, and chainring tooth count.
- A retired part cannot be installed unless restored to `removed` or `spare` in a later edit action.

## Testing

### Unit Tests

- Catalog normalization and required category attributes.
- Part instance lifecycle status transitions.
- Install/remove record validation.
- Active setup derivation per bike.
- Due derivation from mileage intervals and date intervals.
- Snapshot schema v2 serialization and parsing.
- Store actions for adding catalog items, adding instances, installing, removing, retiring, and logging service.

### Component or Integration Tests

- Active setup renders empty slots.
- Install flow populates active setup.
- Log service with preselected bike, slot, and part.
- Due list updates after service.
- Inventory list filters by status and category.

### Manual Verification

- Strava sync updates bike odometer.
- Active component mileage updates after odometer refresh.
- Cloud sync writes and restores new gear arrays.
- Local reset and cloud reset paths work cleanly during development.

## Implementation Boundary

The first implementation plan should deliver the core Gear Hub V2 model and workflows in focused slices:

1. Types, store fields, normalization, and schema v2 snapshot support.
2. Pure derivation functions for active setup and due items.
3. Gear page tab structure for Active Setup, Due, Parts, and History.
4. Catalog and instance inventory forms.
5. Install, remove, retire, and log-service flows.
6. Validation, tests, and cloud sync verification.

Normalized Supabase tables, custom slot management UI, consumable inventory, and purchase/cost tracking should stay out of this implementation plan.

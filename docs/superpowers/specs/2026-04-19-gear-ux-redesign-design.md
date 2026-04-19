# Gear UX Redesign

**Date:** 2026-04-19
**Status:** Design approved, ready for implementation plan
**Scope:** UX / information-architecture redesign of the Gear feature. No calculation-engine or Strava-sync changes. One small feature addition (progress bar). New CRUD (edit / delete) to close gaps in the existing model.

## Problem

The current Gear page is a single route with five tabs — Active setup, Due, Inventory, Parts, History — that mix two conceptually different things on one surface:

- *Bike-centric* information (what's on a bike, what's due, history)
- *Parts-centric* information (what parts I own, reusable specs)

Two specific pain points:

1. **Parts (catalog) vs Inventory (instances) confuses the user.** The split is a faithful reflection of the data model (reusable specs vs physical things) but it leaks into the UI as two near-identical tabs, and the user has to remember to add a catalog entry *before* adding a physical part.
2. **Service tracking and parts-ownership bleed together.** A user opening the page to see "what's due" has to scroll past or tab-switch around inventory concerns.

Plus one explicit feature ask: a faint, compact *life-remaining* progress bar on items in the Due list, so the remaining mileage or days is visible at a glance.

## Goals

- Collapse the parts / inventory distinction into one list of physical parts.
- Separate bike-focused service work from parts-focused inventory work at the route level.
- Add a quiet "how much life is left" progress bar to due items.
- Close the CRUD gap: inventory items and service events can be edited and deleted.

**Non-goals:** calculation-engine changes, Strava sync changes, install / remove / log-service sheet redesign, bike nickname / override at Strava import (deferred to a future pass).

## Information architecture

Two pages, one new route, one fewer tab.

- **`/gear`** — bike-centric. Active setup, Due, History.
- **`/gear/inventory`** — parts-centric. A single flat list of physical parts.

A small sub-nav strip (`Gear · Inventory`) lives at the top of both pages so users can switch contexts without going through global nav. No new top-level nav entries.

The `Parts` (catalog) tab is **removed**. Part types continue to exist in data but are never rendered as a page. They are auto-upserted from the spec fields in the Add Part form (see *Add Part flow* below).

## `/gear` page layout

**Always visible at the top of the page:**

- `PageIntro` — unchanged. Title "Gear", description, `+ Log service` action.
- Sub-nav strip — `Gear | Inventory`.
- Bike picker — left-sidebar pill row on desktop, existing pill row on mobile. Unchanged.
- **Due-now preview band.** A compact always-on surface under the sub-nav:
  - Header: `Due now · {N}` where `N` is filtered to the currently selected bike (or all bikes if none selected).
  - Top 2 most-urgent items, each rendered as a compact row: label, bike name (when viewing all bikes), urgency pill, thin progress bar, inline `Log` action link.
  - If `N > 2`, a `View all {N}` link switches to the Due tab and scrolls to the top.
  - If `N == 0`, the band collapses to a single-line empty state ("Nothing due") and does not dominate vertical space.

**Below the preview band — three tabs** (down from five): `Active setup · Due · History`.

- **Active setup** — unchanged layout (slot rows, install / remove / service actions per part).
- **Due** — the full list of due items, each with the progress bar (see *Progress bar* below).
- **History** — existing layout, now with inline edit / delete (see *Editing*).

**Shared behaviors:**

- The bike filter applies consistently to the preview band and all three tabs.
- The preview band and the Due tab **share one card component** — the preview band is the same component rendering with `limit=2`. No double maintenance.

## `/gear/inventory` page layout

One flat list of physical parts, one add flow, one edit flow.

**Page shell:**

- `PageIntro` — title "Inventory", description "Physical parts you own.", action `+ Add part`.
- Sub-nav strip — `Gear | Inventory`.
- Summary strip (unchanged): Total · Spare · Installed · Removed · Retired.
- Filter row — category chips (Chain, Tire, Brake pad, Cassette, Chainring, …) with an optional status chip row. Multi-select within a row, single-select across rows.
- Body — parts grouped by category as today. Each card shows: label / title, spec summary (attributes + weight), status pill, install context ("on Rocket"), acquired / retired dates, notes. Overflow menu with `Edit` / `Delete` (see *Editing*).

### Add Part flow

`+ Add part` opens one sheet with one unified form. No separate "Add catalog" step.

Form sections:

1. **Category** (required) — chain, tire, brake pad, cassette, chainring, …
2. **Spec** — brand, model, weight, and the category-specific attributes for the selected category (speed-count for chain, width + diameter + tubeless-ready for tire, etc.).
   - As the user types brand / model, an **autocomplete** suggests existing catalog specs of that category. Tapping a suggestion prefills the spec fields, enabling two-tap add of a second chain of the same model.
3. **Physical details** — optional label, acquired date, initial status (defaults to `spare`), notes.

On submit, the app normalizes `(category + brand + model + attributes)` and looks up the catalog:

- **Match found** — reuse the existing `catalogItemId` and insert the instance.
- **No match** — insert a new catalog row, then insert the instance pointing at it.

The user never sees the distinction.

### Data model

Unchanged. `gearPartCatalog`, `gearPartInstances`, `gearInstallRecords`, `gearServiceEvents` remain as-is. The only behavioral change is: the catalog is no longer a page, and catalog rows are auto-upserted from the Add / Edit flows.

Orphaned catalog rows (no instances pointing to them) remain in data, invisible, and are reused the next time a matching spec is entered.

## Editing

### Inventory instance edit

Each inventory card has an overflow menu with `Edit` and `Delete`.

`Edit` opens the same sheet as Add, pre-filled, with fields split into two groups:

- **Spec fields** (brand, model, weight, category-specific attributes) — follow a **fork-on-edit** rule:
  - If this instance is the **only** one pointing at its catalog row, edit the catalog row in place.
  - If other instances share the catalog row, create a new catalog row with the edited values and point this instance at the new row. The original catalog row and its siblings are untouched.
- **Instance fields** (label, acquired date, status, notes) — always edit in place on the instance.

Category cannot be changed on an existing instance — category determines which `attributes` schema the catalog row uses, and silently rewriting that schema would corrupt sibling instances. If a user needs to reclassify, they delete and re-add.

### Inventory instance delete

Confirms, then removes the instance.

**Guardrail:** cannot delete an instance whose `status === 'installed'` and has an active install record. The user must remove it from the bike first. This prevents dangling install / service history.

Orphaned catalog rows after delete stay in data (invisible, reusable).

### Service event edit / delete

Each row in History gets the same overflow pattern:

- `Edit` opens a sheet pre-filled with the event fields (date, mileage, service type, next-due mileage / date, notes). Saves through the existing `logGearServiceEvent` path (updated to support update-in-place) or a new action.
- `Delete` confirms, then removes the event.

Editing a service event may change what appears in the Due list (by updating `nextDueMileageMi` / `nextDueDateIso`) and potentially the urgency / progress-bar rendering for that target — this is the correct behavior and requires no special handling.

### Bike editing

**Out of scope for this pass.** Bikes currently mirror Strava. A future pass can introduce local overrides (nickname, display attributes) at the Strava-import boundary; not addressed here.

## Progress bar

A monotone, faint bar on each card in the Due tab and in the Due-now preview band. Track `bg-shell-200`, fill `bg-ink-400`, height `h-1`, rounded. Placed below the mileage / days text row, no inline label (the text above already reads "125 mi remaining").

### Computation

For a due item with `remainingMi`, `remainingDays`, and the originating event's `intervalMi` / `intervalDays`:

- `nearestRemaining` = the axis (mi or days) with the **smallest** signed value — i.e. the one furthest along toward or past zero. Example: with `remainingMi = −50` and `remainingDays = 30`, the mileage axis wins because `−50 < 30`, and the bar shows the overdue state. With `remainingMi = 20` and `remainingDays = 60`, the mileage axis still wins because it's nearer zero.
- `nearestInterval` = the interval for that same axis (`intervalMi` when mi wins, `intervalDays` when days wins).
- `pct = clamp(1 − nearestRemaining / nearestInterval, 0, 1)`.

If the event doesn't carry an interval for the chosen axis, derive it as `nextDueValue − lastServiceValue`. If that can't be derived either (event is truly unscheduled), the bar does not render; the urgency pill still reads `Unscheduled`.

### Overdue handling

When `nearestRemaining < 0`, the bar renders at full (`pct === 1`). The urgency pill already turns rose and the numeric label already reads `X mi overdue`, so the bar does not need a colored variant.

### Colors and motion

- Single monotone fill — urgency color lives in the pill, not the bar. This was the deliberate choice; duplicating color on the bar added noise.
- Respects `prefers-reduced-motion`. When animated, width transitions in 150ms ease-out.

## Out of scope

- Bike nickname / override at Strava import.
- Redesign of install / remove / log-service sheets.
- Surfacing catalog ("manage part types") as an admin drawer — deferred unless autocomplete proves insufficient after use.
- Calculation engine, Strava sync, or planning / nutrition changes.

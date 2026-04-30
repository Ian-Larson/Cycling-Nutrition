---
id: 03-02
phase: 3
plan: 02
status: complete
completed: 2026-04-30
---

# Plan 03-02 Summary — Inventory dense layout (drop counter cards + DividedRowList swap)

## What Was Built

Single file: `src/components/gear/gear-inventory.tsx` — net **−85 lines** (143 deletions, 58 insertions).

### GEAR-03 — Top counter cards removed

Deleted the 5-card grid at the top of the Inventory sub-page:

- The grid wrapper `<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">` and its 5 stat cards (Total + Spare/Installed/Removed/Retired counts).
- Orphaned constants whose only consumers were the grid:
  - `STATUS_STAT_CLASSES` (per-status border/bg classes)
  - `STATUS_STAT_ACCENT` (per-status text-color classes)
  - `summaryCounts` memo (derived from `statusCounts`)

Status counts remain visible in the existing Status `ChipRow` filter labels — no information lost.

### GEAR-04 — Per-instance Card map → DividedRowList

Replaced the per-category-group `<div className="grid gap-3 md:grid-cols-2">{group.instances.map(...)}</div>` rendering each instance as a full `<Card><CardContent>` block with a single `<DividedRowList>` (the same primitive `src/components/gear/active-setup-list.tsx` uses).

Each row now renders as:
- **Top line:** title (truncated) + status pill + OverflowMenu — `flex items-start justify-between gap-2 px-3 py-2 md:px-4 md:py-2.5`.
- **Below (when catalog missing):** `<p>Catalog part unavailable</p>` warning in `text-error-700 text-xs`.
- **Summary line (text-xs):** all secondary fields joined by `·`:
  - Attributes (from `formatAttributes`)
  - Weight grams (`{N} g`)
  - Lifetime miles (or `Never installed` fallback)
  - Installed-bike name (when applicable)
  - Date entry (Installed/Retired/Removed/Acquired with formatted date)

Per-row vertical padding: `py-2 md:py-2.5` — same rhythm as `active-setup-list.tsx`. Substantially denser than the prior `<Card><CardContent className="space-y-3 py-3.5 md:py-4">` per-instance block.

### Preserved

- Empty-state Card (`No parts in inventory yet. Tap + Add part to track one.`)
- No-matches Card (filtered to zero results)
- Category section headers + `pluralize(count, 'part', 'parts')` labels
- Both ChipRow filters (Category + Status)
- Sort comparator + STATUS_ORDER
- All OverflowMenu actions (Edit + Delete)
- All summary fields and helper functions (`formatDate`, `formatMileage`, `formatAttributes`, `catalogTitle`, `findActiveInstall`, `findLatestRemoval`, `computePartLifetimeMileage`)

## Acceptance Evidence

```
$ grep -c "STATUS_STAT_CLASSES\|STATUS_STAT_ACCENT\|summaryCounts" src/components/gear/gear-inventory.tsx
0
$ grep -c "sm:grid-cols-2 lg:grid-cols-5" src/components/gear/gear-inventory.tsx
0
$ grep -c "<DividedRowList" src/components/gear/gear-inventory.tsx
1
$ grep -c 'CardContent className="space-y-3 py-3.5' src/components/gear/gear-inventory.tsx
0   # per-instance Card map gone
$ grep -c 'CardContent className="space-y-3 py-5 md:py-6"' src/components/gear/gear-inventory.tsx
1   # empty-state Card preserved
$ grep -c "STATUS_CLASSES\b" src/components/gear/gear-inventory.tsx
2   # constant + per-instance pill consumer
$ grep -c "statusCounts" src/components/gear/gear-inventory.tsx
2   # memo + ChipRow consumer
$ grep -c "pluralize" src/components/gear/gear-inventory.tsx
2   # helper + category-section consumer
$ npm run lint
exit 0
$ npm run build
exit 0
```

## Plan Quality Note

The plan-checker reported 4 BLOCKERs against Plan 03-02 about `old_string` indentation (planner-added 4-space prose-indent didn't match source-file columns). Inline execution sidestepped this by reading live file content for byte-exact matching — the plan's design intent was correct on all other dimensions (12/12 in 03-01; the 4 blockers in 03-02 were format-only). Future re-execution from this plan would need indent fixes; for this run, the work is done correctly.

## Commits

| Hash | Type | Message |
|------|------|---------|
| `62883f8` | refactor | refactor(03-02): garage inventory — drop counter cards, dense rows |

## Self-Check

PASSED. No deviations from plan intent. The plan-checker's reported BLOCKERs were format-only (markdown indent), not design-level — work executed correctly using live file content.

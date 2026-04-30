---
phase: 1
plan: 02
subsystem: layout-foundations
tags: [layout, tabs, canonical-primitive, polish, foundations, layout-02]
requires:
  - .planning/phases/01-layout-tab-foundations/01-UI-SPEC.md
  - .planning/phases/01-layout-tab-foundations/01-01-SUMMARY.md
  - src/components/ui/tabs.tsx (canonical Tabs/TabList/Tab/TabPanel primitive)
provides:
  - Garage in-page tab UI rendered from the canonical Tabs primitive in @/components/ui
  - Foundation for LAYOUT-02 (single shared tab component across Fuel Plan + Garage)
  - Foundation for ROADMAP success criterion 3 (one canonical tablist primitive across Fuel Plan and Garage)
  - Foundation for ROADMAP success criterion 4 (identical tab behavior across surfaces — same component literally)
affects:
  - src/pages/gear.tsx
tech_stack:
  added: []
  patterns:
    - "In-page tab views consume Tabs/TabList/Tab/TabPanel from @/components/ui (UI-SPEC §Foundation 2 binding rule). No surface in src/pages or src/components implements its own tablist UI."
key_files:
  created:
    - .planning/phases/01-layout-tab-foundations/01-02-SUMMARY.md
  modified:
    - src/pages/gear.tsx
decisions:
  - "Define GearTabValue inline in gear.tsx as `type GearTabValue = 'active' | 'due' | 'history'` so the import from gear-tab-ids can be dropped this plan; Plan 03 deletes the orphaned source files."
  - "Bridge canonical Tabs onChange (string) to existing handleTabChange (GearTabValue) via `(v) => handleTabChange(v as GearTabValue)` cast — safe because the only Tab values are exactly 'active' | 'due' | 'history'."
  - "Drop the hand-rolled `{tab === '...' ? (...) : null}` guards entirely — canonical TabPanel handles conditional mount internally (default keepMounted=false)."
  - "Preserve `<GearDuePreviewBand>` rendering above the tablist row unchanged — visibility logic is GEAR-02 / Phase 3 scope, not Phase 1."
metrics:
  duration: "~1m 33s"
  tasks_completed: 1
  files_modified: 1
  commits: 1
  completed_date: 2026-04-30
---

# Phase 1 Plan 02: Garage Tabs — Canonical Primitive Migration Summary

Migrated `src/pages/gear.tsx` from the hand-rolled `GearTabs` component + three `<div role="tabpanel">` blocks to the canonical `Tabs / TabList / Tab / TabPanel` primitives from `@/components/ui`. The Garage in-page tab UI now renders from the same primitive as Fuel Plan (LAYOUT-02 — partial; Plan 03 closes by deleting the orphaned source files).

## Objective Recap

UI-SPEC §Foundation 2 designates `src/components/ui/tabs.tsx` as the canonical tab primitive and `src/components/gear/gear-tabs.tsx` as the deprecation target. After Wave 1 (Plan 01) consolidated `.page-shell` width into a single source, Wave 2 collapses the second tab style: Garage's in-page tabs (Active setup / Service / History) now render from the canonical primitive — identical implementation to Fuel Plan's existing canonical-Tabs usage. Tab labels are preserved verbatim per UI-SPEC §Copywriting Contract: **"Active setup"**, **"Service"**, **"History"**. ARIA, keyboard nav, focus, panel association, active styling, height, and spacing are all delegated to the canonical primitive.

## Implementation Details

### Task 1: Migrate gear.tsx tab UI to canonical Tabs/TabList/Tab/TabPanel

Four-edit sequence per the plan, all on `src/pages/gear.tsx`:

**Edit 1 — Imports + local type.**
- Removed `import { GearTabs } from '@/components/gear/gear-tabs';` and the `gearPanelId / gearTabId / type GearTabValue` import block from `'@/components/gear/gear-tab-ids'`.
- Extended `import { Card, CardContent } from '@/components/ui';` to `import { Card, CardContent, Tab, TabList, TabPanel, Tabs } from '@/components/ui';` (alphabetical).
- Added local `type GearTabValue = 'active' | 'due' | 'history';` declaration directly above `function todayIso()` so `useState<GearTabValue>('active')` (line 57) and `handleTabChange(nextTab: GearTabValue)` (line 166) still type-check.

**Edit 2 — Wrap the section in `<Tabs>` and replace `<GearTabs>` with `<TabList>` + three `<Tab>`.**
- Opened `<Tabs value={tab} onChange={(v) => handleTabChange(v as GearTabValue)}>` just above the divider row (line 259) and closed it after the History TabPanel.
- Replaced the `<GearTabs value={tab} onChange={handleTabChange} />` invocation with `<TabList label="Gear view"><Tab value="active">Active setup</Tab><Tab value="due">Service</Tab><Tab value="history">History</Tab></TabList>`.
- Preserved the divider-row outer `<div className="flex flex-col gap-2 border-b ...">` and the right-aligned `<p className="section-kicker">{activeCountLabel}</p>` indicator in the same row as the tablist (UI-SPEC requirement).

**Edit 3 — Three TabPanels replace three hand-rolled tabpanel divs.**
- Edit 3a: Active panel. Removed the `{tab === 'active' ? ( ... ) : null}` guard and the hand-rolled `<div role="tabpanel" id={gearPanelId('active')} aria-labelledby={gearTabId('active')}>`. Wrapped contents in `<TabPanel value="active">…</TabPanel>`.
- Edit 3b: Due panel. Same pattern → `<TabPanel value="due">`.
- Edit 3c: History panel. Same pattern → `<TabPanel value="history">`. Closing `</Tabs>` lands at the end of this edit, closing the wrapper opened in Edit 2.

The canonical `<TabPanel>` (default `keepMounted=false`) handles the conditional mount internally and emits the full ARIA contract (`role="tabpanel"`, `id`, `aria-labelledby`, `hidden`, `tabIndex={0}`), so the outer `{tab === ...}` guards and hand-rolled ARIA wiring are no longer needed.

### Behavior preservation

The migration is mechanical — observable behavior is unchanged:

| Concern | Before (gear-tabs.tsx) | After (canonical tabs.tsx) |
|---------|------------------------|----------------------------|
| ARIA tablist | `role="tablist" aria-label="Gear view"` | `role="tablist" aria-label="Gear view"` (via `label` prop) ✓ |
| Tab role | `role="tab" aria-selected aria-controls` | identical ✓ |
| Roving tabindex | `tabIndex={selected ? 0 : -1}` | identical ✓ |
| Keyboard | Arrow ↔ / Home / End | identical ✓ |
| Touch target | `min-h-9` (~36px) | `min-h-11 md:min-h-10` (44px mobile / 40px desktop) — **improved** to UI-SPEC §Foundation 3 floor |
| Active styling | `bg-brand-100 text-brand-900` (rect rounded-md) | `bg-brand-500 text-white shadow-...` (rounded-full pill) — **canonical brand fill** per UI-SPEC §Color accent reservation #1 |
| Tab labels | Active setup / Service / History | identical ✓ (UI-SPEC §Copywriting locked) |

Net visual change: tabs become the canonical orange pill (`bg-brand-500 text-white`) with the soft drop shadow, and minimum height bumps from 36px to 44px on mobile. Both are intended outcomes of LAYOUT-02 — the Fuel Plan Pack/Ride guide/Stats tabs already render this way, and the Garage now matches.

## Verification

### Acceptance criteria (all 15 grep checks PASS)

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -c 'GearTabs' src/pages/gear.tsx` | 0 | 0 ✓ |
| `grep -cE 'gearTabId\|gearPanelId' src/pages/gear.tsx` | 0 | 0 ✓ |
| `grep -c "from '@/components/gear/gear-tab-ids'" src/pages/gear.tsx` | 0 | 0 ✓ |
| `grep -c "from '@/components/gear/gear-tabs'" src/pages/gear.tsx` | 0 | 0 ✓ |
| `grep -c '<Tabs ' src/pages/gear.tsx` | 1 | 1 ✓ |
| `grep -c '<TabList ' src/pages/gear.tsx` | 1 | 1 ✓ |
| `grep -c '<Tab value=' src/pages/gear.tsx` | 3 | 3 ✓ |
| `grep -c '<TabPanel value=' src/pages/gear.tsx` | 3 | 3 ✓ |
| `grep -c 'role="tabpanel"' src/pages/gear.tsx` | 0 | 0 ✓ |
| `grep -c 'label="Gear view"' src/pages/gear.tsx` | 1 | 1 ✓ |
| `grep -c '>Active setup<' src/pages/gear.tsx` | 1 | 1 ✓ |
| `grep -c '>Service<' src/pages/gear.tsx` | 1 | 1 ✓ |
| `grep -c '>History<' src/pages/gear.tsx` | 1 | 1 ✓ |
| `grep -c "type GearTabValue = 'active' \| 'due' \| 'history'" src/pages/gear.tsx` | 1 | 1 ✓ |
| `grep -c 'Tab, TabList, TabPanel, Tabs' src/pages/gear.tsx` | 1 | 1 ✓ |
| `git diff --stat src/components/gear/gear-tabs.tsx src/components/gear/gear-tab-ids.ts src/components/ui/tabs.tsx` | empty | empty ✓ |

### Build gates

| Command | Exit |
|---------|------|
| `npm run lint` | 0 ✓ |
| `npm run build` | 0 ✓ (224 modules transformed, dist/index.html + 74.23 kB CSS bundle generated, 759.13 kB JS bundle, build in 840ms) |

### Orphan-status confirmation

Post-migration grep across `src/`:
- `grep -rn "from '@/components/gear/gear-tabs'" src/` → no matches.
- `grep -rn "from './gear-tabs'" src/components/gear/` → no matches.
- `grep -rn "gear-tab-ids" src/` → only `src/components/gear/gear-tabs.tsx:3` (the orphaned consumer of the orphaned helper). No other files in `src/` import either.

Both `src/components/gear/gear-tabs.tsx` and `src/components/gear/gear-tab-ids.ts` are now true orphans — Plan 01-03 deletes them.

## Deviations from Plan

None — plan executed exactly as written. The 4 Edit calls each succeeded on the first try with verbatim `old_string` matches from the plan's spec. No Rule 1 (bug), Rule 2 (missing critical functionality), or Rule 3 (blocker) deviations were triggered. No checkpoints reached. No auth gates.

## Risk / Threat Coverage

Plan threat register (from `<threat_model>` in 01-02-PLAN.md):
- **T-02-01 Tampering — a11y regression — mitigated.** Acceptance criteria grep confirmed `<TabList label="Gear view">` (1 match) and three `<Tab value="...">` (3 matches). Canonical `Tabs` implements roles, `aria-selected`, `aria-controls`, `aria-labelledby`, `hidden`, roving tabindex internally — verified by inspection of `src/components/ui/tabs.tsx`.
- **T-02-02 Tampering — focus management — mitigated.** Canonical `Tabs.focusTab()` (line 66 of `src/components/ui/tabs.tsx`) implements Arrow/Home/End with focus + selection both moving — identical key bindings to the previous hand-rolled implementation.
- **T-02-03 DoS — visual layout shift — mitigated.** Wave 1's `.page-shell` consolidation already removed the only structural shift source. This plan preserved the row layout (`flex flex-col gap-2 ... sm:flex-row sm:items-center sm:justify-between`) verbatim and the canonical `Tab` pill is `min-h-11 md:min-h-10` (matches/exceeds the touch-target floor). Build exit 0 confirms no className typo.
- **T-02-08 Tampering — state desync — mitigated.** The `(v) => handleTabChange(v as GearTabValue)` cast is safe: only three `<Tab value="">` strings exist, all matching the `GearTabValue` union exactly. Acceptance grep verified all three (`>Active setup<`, `>Service<`, `>History<` and `<Tab value=` × 3).
- **T-02-04 / T-02-05 / T-02-06 / T-02-07 — accept.** No data, identity, auth, or permission surface touched.

No new threat surfaces introduced. No `threat_flag` additions required.

## Working-Tree Hygiene

The working tree contained two unrelated user-state changes at plan start (`D .impeccable.md`, untracked `PRODUCT.md`). Per plan instruction these were excluded from staging — `git add` was called with the single explicit path `src/pages/gear.tsx`, never `git add .` or `git add -A`. `git status --short` post-commit shows the unrelated state still pending, untouched by this plan.

Post-commit deletion check confirmed the commit added no accidental file deletions (`git diff --diff-filter=D --name-only HEAD~1 HEAD` returned empty).

## Commits

| Hash | Type | Message |
|------|------|---------|
| `31dfc6d` | refactor | refactor(01-02): migrate gear page tabs to canonical Tabs primitive |

1 file changed, 21 insertions(+), 37 deletions(-).

## Downstream Impact

- **Plan 01-03 (Wave 3 — orphan cleanup + no-shift acceptance test)**: ready to proceed. Deletes `src/components/gear/gear-tabs.tsx` and `src/components/gear/gear-tab-ids.ts` (now true orphans, verified above). Runs the manual no-shift acceptance test from UI-SPEC §Foundation 4 across 375px / 768px / 1280px breakpoints.
- **REQ-LAYOUT-02**: partially satisfied — Garage now consumes the canonical Tabs primitive. Full satisfaction lands once Plan 01-03 deletes the orphaned hand-rolled implementation.
- **ROADMAP success criterion 3** ("Every tab/segmented switcher across Fuel Plan and Garage renders from one canonical UI primitive in `src/components/ui/`"): partially satisfied — Fuel Plan (already canonical) + Garage (now canonical) = both render tabs from `src/components/ui/tabs.tsx`. Closes when orphan deletion lands in Plan 03.
- **ROADMAP success criterion 4** ("canonical tab control behaves identically across surfaces"): satisfied — Garage and Fuel Plan are now literally the same component. Same active styling (`bg-brand-500 text-white`), same keyboard interaction, same height/spacing.
- **Phase 3 / GEAR-02**: untouched scope. The `<GearDuePreviewBand>` rendered above the tablist row continues to be visible on `active` and `history` tabs. Phase 3 owns the visibility-on-Service-only toggle.

## Self-Check: PASSED

- File `.planning/phases/01-layout-tab-foundations/01-02-SUMMARY.md` exists ✓
- Commit `31dfc6d` exists in `git log` ✓
- `src/pages/gear.tsx` contains all required canonical-tab usages (15 grep checks all pass) ✓
- `src/components/gear/gear-tabs.tsx` and `src/components/gear/gear-tab-ids.ts` untouched and orphaned ✓
- `src/components/ui/tabs.tsx` untouched ✓
- Lint + build green ✓

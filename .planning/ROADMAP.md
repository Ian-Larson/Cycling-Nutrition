# Roadmap: Domestique — Polish & Redesign Sweep v1

## Overview

This milestone is a polish-only sweep across the shipped Domestique surfaces — Fuel Plan, Garage, and Account — plus a documentation realignment. The goal is consistency: same controls in the same places with the same spacing, so a rider can produce a precise fueling plan and confirm kit readiness in seconds. We do foundations first (page-shell padding + a single canonical tab switcher) so per-surface work becomes mechanical reuse, then clean each surface in parallel, then realign docs to shipped reality. No new features, no backend changes, no new UI primitives — reuse what's in `src/components/ui/`.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Layout & Tab Foundations** - Cross-cutting page-shell padding + a single canonical tab/segmented switcher that every surface consumes (completed 2026-04-30)
- [x] **Phase 2: Fuel Plan Cleanup** - Right-rail simplification, setup-flow label renames, and quick-counter copy fixes (completed 2026-04-30)
- [ ] **Phase 3: Garage Cleanup** - Service-only "Due Soon," pinned tab strip, and a denser Inventory sub-page
- [ ] **Phase 4: Account Consolidation** - Single 2-pane Athlete + Account/Sync/Login page replacing the dedicated sync route
- [ ] **Phase 5: Documentation Realignment** - PRODUCT.md rewritten to shipped reality and CLAUDE.md font reference corrected

## Phase Details

### Phase 1: Layout & Tab Foundations
**Goal**: Every primary tab and sub-tab in the app shares one page-shell padding rhythm and one canonical tab/segmented control, so per-surface phases become mechanical reuse.
**Depends on**: Nothing (first phase)
**Requirements**: LAYOUT-01, LAYOUT-02
**Success Criteria** (what must be TRUE):
  1. Switching between primary tabs (Fuel Plan, Garage, Account) and between sub-tabs within each surface produces no horizontal layout shift — the content edge stays at the same x-position on every screen size.
  2. Page-shell side padding is identical across every primary route and every sub-route, sourced from a single shared layout primitive.
  3. Every tab/segmented switcher across Fuel Plan and Garage renders from one canonical UI primitive in `src/components/ui/` — there is no second tab style anywhere in the app.
  4. The canonical tab control behaves identically across surfaces (same active-state styling, same keyboard interaction, same height/spacing).
**Plans**: 3 plans
Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Page-shell padding consolidation (strip max-w-6xl from 8 pages) ✓ 2026-04-30 (a8991b5)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Migrate Garage tabs to canonical Tabs/TabList/Tab/TabPanel ✓ 2026-04-30 (31dfc6d)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-03-PLAN.md — Delete deprecated gear-tabs.tsx and gear-tab-ids.ts; manual no-shift acceptance test
**UI hint**: yes

### Phase 2: Fuel Plan Cleanup
**Goal**: The Fuel Plan page reads cleanly — one Fuel Inventory section in the right rail, plain-language setup labels, and quick-counter copy that matches what a rider would actually say out loud.
**Depends on**: Phase 1
**Requirements**: FUEL-01, FUEL-02, FUEL-03, FUEL-04
**Success Criteria** (what must be TRUE):
  1. The right-side Fuel Inventory rail shows a single "Fuel Inventory" section — no "bottles" item, no nested subsections, no extra headers.
  2. Bottle quantity is captured exactly once, in the setup flow, under the label "Available bottles."
  3. The setup flow's fuel-selection label reads "Fuel selections" (not "Fuel").
  4. Quick-counter copy uses correct singular/plural forms and the phrase "drink mix" (e.g., a rider sees `1 drink mix · 2 solids`, `2 drink mix · 1 solid`, or `1 solid` — never `mix` and never `1 solids`).
**Plans**: 2 plans
Plans:
**Wave 1**
- [x] 02-01-PLAN.md — Right-rail simplification + quick-counter copy fix (FUEL-01-rail, FUEL-03, FUEL-04)
- [x] 02-02-PLAN.md — Setup flow label renames: "Available bottles" + "Fuel selections" (FUEL-01-setup, FUEL-02)
**UI hint**: yes

### Phase 3: Garage Cleanup
**Goal**: The Garage feels stable and dense — the tab strip never jumps, "Due Soon" only appears where it makes sense, and the Inventory sub-page fits substantially more components per scroll.
**Depends on**: Phase 1
**Requirements**: GEAR-01, GEAR-02, GEAR-03, GEAR-04
**Success Criteria** (what must be TRUE):
  1. The "Due Soon" service card renders only on the Service tab — it is not visible on Active Setup or History.
  2. The Active Setup / Service / History tab strip stays in a fixed vertical position regardless of which sub-tab is active; switching tabs never pushes the tab strip up or down.
  3. The Garage → Inventory sub-page no longer shows the top counter cards.
  4. The Garage → Inventory sub-page uses a denser component-card layout (reusing an existing leaner card style from elsewhere in the app), so noticeably more parts fit per scroll height than before this phase.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Account Consolidation
**Goal**: The Account section is one 2-pane page — Athlete information on top, condensed Account/Sync/Login below — replacing the previously separate sync route, with spacing matching the rest of the app.
**Depends on**: Phase 1
**Requirements**: ACCT-01
**Success Criteria** (what must be TRUE):
  1. The Account page presents Athlete information as the top pane and Account / Sync / Login as a condensed bottom pane on a single route.
  2. The previously separate sync/login page is gone — no nav entry, no working URL — and any legacy link redirects to the consolidated Account page.
  3. Page-shell side padding on the Account page matches every other primary route (per Phase 1) — switching to Account from Fuel Plan or Garage produces no horizontal shift.
  4. Sign-in, sign-out, Strava connect/disconnect, and cloud-sync status indicators all function from this single page with no regressions versus the prior dedicated sync route.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Documentation Realignment
**Goal**: PRODUCT.md and CLAUDE.md describe the product as it actually ships after Phases 1–4 — orange `#f8622e` brand, light-mode only, IBM Plex Sans, real primitives — so future work starts from accurate context.
**Depends on**: Phase 4 (soft preference — runs last so docs reflect post-sweep reality)
**Requirements**: DOC-01, DOC-02
**Success Criteria** (what must be TRUE):
  1. PRODUCT.md is committed (no longer untracked) and contains no references to a `#547597`-anchored palette or to dark-mode parity; the orange `#f8622e` brand is documented as the shipped identity.
  2. PRODUCT.md is grounded in the actual codebase — referenced primitives exist in `src/components/ui/`, referenced tokens exist in the `@theme` block of `src/index.css`, and IA descriptions match the post-sweep Fuel Plan / Garage / Account surfaces.
  3. CLAUDE.md's font reference reads "IBM Plex Sans" — the strings "Outfit" and "Source Sans 3" no longer appear as the project's typography.
**Plans**: TBD
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5. With `parallelization: true`, Phases 2, 3, and 4 may run concurrently after Phase 1 completes (they touch disjoint surfaces). Phase 5 runs after 4 so docs reflect post-sweep reality.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Layout & Tab Foundations | 3/3 | Complete   | 2026-04-30 |
| 2. Fuel Plan Cleanup | 2/2 | Complete   | 2026-04-30 |
| 3. Garage Cleanup | 0/TBD | Not started | - |
| 4. Account Consolidation | 0/TBD | Not started | - |
| 5. Documentation Realignment | 0/TBD | Not started | - |

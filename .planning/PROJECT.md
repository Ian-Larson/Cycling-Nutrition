# Domestique

## What This Is

Domestique is a cyclist's assistant web app — a single home for planning, training, and maintaining the rider and the bike. It's used by experienced self-coached cyclists, often on mobile right before a ride, to build a fast, reliable fueling plan and keep tabs on gear without doing nutrition math or maintenance bookkeeping by hand. Current capabilities ship and work: fuel planning, Gear Hub, ride history & athlete profile, power meter analyzer, Strava sync, and Supabase-backed cloud sync (with local-first storage).

## Core Value

When a rider opens Domestique, every screen feels consistent, dense, and dependable — the same controls in the same places with the same spacing — so they can produce a precise fueling plan and confirm kit readiness in seconds, not minutes.

## Requirements

### Validated

<!-- Existing capabilities inferred from the codebase map. These ship today. -->

- ✓ Fuel planning engine — carb/hydration calc by duration/intensity/heat, optimal bottle selection, drink-mix allocation, timed consumption guide — existing
- ✓ Gear Hub — bike & component inventory, weight tracking, maintenance/service records, due-soon signals — existing
- ✓ Ride history & athlete profile — existing
- ✓ Power meter analyzer — existing
- ✓ Strava OAuth sync — existing (via Supabase Edge Functions for token exchange)
- ✓ Cloud sync — Supabase auth + Postgres, local-first with cloud backup, "guest mode" fallback — existing

### Active

<!-- Milestone: Polish & Redesign Sweep v1. Foundations-first phasing. -->

**Cross-cutting foundations**
- [ ] **REQ-LAYOUT-01**: Page-shell side padding is identical across all primary tabs (Fuel Plan, Garage, Account) and all sub-tabs within each surface — no horizontal shift when switching tabs.
- [ ] **REQ-LAYOUT-02**: Tab switchers across Fuel Plan and Garage use a single shared component with consistent styling and behavior.

**Fuel Plan**
- [ ] **REQ-FUEL-01**: Right rail no longer contains a separate "bottles" inventory item; bottle quantity is captured only in the setup flow under the renamed label "Available bottles."
- [ ] **REQ-FUEL-02**: Setup flow's fuel-selection label reads "Fuel selections."
- [ ] **REQ-FUEL-03**: Right rail collapses to a single "Fuel Inventory" section with no subsections.
- [ ] **REQ-FUEL-04**: Quick-counter copy uses correct singular/plural forms and "drink mix" instead of "mix" (e.g., "1 drink mix · 2 solids", "1 solid").

**Garage**
- [ ] **REQ-GEAR-01**: "Due soon" service card is shown only on the Service tab; hidden on Active Setup and History.
- [ ] **REQ-GEAR-02**: Tab strip stays in a fixed vertical position when switching between Active Setup / Service / History — the "Due soon" card cannot push it down.
- [ ] **REQ-GEAR-03**: Inventory sub-page no longer shows the top counter cards.
- [ ] **REQ-GEAR-04**: Inventory sub-page component cards use a denser layout (reusing an existing leaner card style from elsewhere in the app) so significantly more items fit per scroll height.

**Account**
- [ ] **REQ-ACCT-01**: Account sync/login is consolidated into a single 2-pane page — Athlete information on top, condensed Account/Sync/Login section below — replacing the dedicated sync page.

**Docs**
- [ ] **REQ-DOC-01**: PRODUCT.md is rewritten to match shipped reality (orange `#f8622e` brand, light-mode only, grounded in current primitives and IA) and committed.
- [ ] **REQ-DOC-02**: CLAUDE.md font reference is updated to match the code (IBM Plex Sans, not Outfit / Source Sans 3).

### Out of Scope

- **Dark mode** — deferred to a future milestone. PRODUCT.md's earlier "plan for both light and dark" intent is rolled back for this sweep.
- **Palette migration to `#547597`** — rejected. The shipped orange brand `#f8622e` stays. PRODUCT.md is being rewritten to reflect this rather than the code being migrated.
- **New features** — this milestone is polish-only. No new fuel-planning logic, no new gear capability, no new analyzer features.
- **Backend / Supabase changes** — sync schema, edge functions, and Strava integration stay as they are.
- **New UI primitives** — reuse what's already in `src/components/ui/` (alert, badge, button, card, checkbox, collapsible, dialog, divided-row-list, icon-button, input, preset-buttons, segmented-control, select, spec-row, stepper, tabs, toast, toggle). Net-new primitives only if foundation work absolutely requires it.
- **Performance work** — beyond what naturally falls out of the cleanup, no targeted perf phase.

## Context

**Brownfield, mid-life app.** Domestique has shipped real features through ~v4 (cloud sync) and has a mapped codebase as of 2026-04-30 (`.planning/codebase/`). The `Plans/` directory holds historical implementation plans (v1.1 → v4); they are reference material, not active scope.

**Technical environment.** React 19 + TypeScript + Vite SPA, Tailwind CSS v4 with `@theme` tokens in `src/index.css`, Zustand (persist + immer) state, React Router DOM 7, Vitest. Backend is Supabase (Postgres + Edge Functions for Strava token exchange). Deployed to GitHub Pages at the `/Cycling-Nutrition/` subpath. App falls back to a guest/localStorage-only mode when Supabase env vars are absent.

**Design language reality.** Brand is anchored on `--color-brand-500: #f8622e` (orange). Neutrals are split between `shell` (warm whites/grays) and `ink` (cool grays). Typography is IBM Plex Sans across sans / body / display. UI primitives exist and are healthy; the gap is in *consistency of application*, not in primitive coverage.

**The papercut list (recorded in conversation, 2026-04-30).** Source of truth for active scope. Specific items are mapped to REQ-IDs above. The user wants `/impeccable` as the planning lens for each phase.

**Stale documentation.** PRODUCT.md (untracked) currently describes a different brand direction (`#547597` palette, dark-mode parity) that does not match shipped reality. CLAUDE.md mentions Outfit / Source Sans 3 fonts which are no longer used. Both get corrected in this milestone (REQ-DOC-01, REQ-DOC-02).

## Constraints

- **Tech stack**: React 19 + Tailwind v4 + Zustand — Locked. Polish work stays inside the existing stack.
- **Visual identity**: Orange `#f8622e` brand, light mode only — Confirmed by user; do not migrate to `#547597` or introduce dark variants in this milestone.
- **Design lens**: Each phase will be planned with the `/impeccable` skill — User preference for design-quality framing during planning.
- **No new primitives**: Reuse existing `src/components/ui/*` — Keeps surface area small; foundations work consolidates rather than expands.
- **Mobile-first usage pattern**: Riders use the app on phones before rides — Layout/spacing/density decisions optimize for one-thumb mobile use first.
- **Compatibility**: Cloud sync (Supabase) and local-first storage must keep working unchanged — Polish must not regress data flow or auth.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep orange `#f8622e` brand | User confirmed; avoids large-scale token churn during a polish-only milestone | — Pending |
| Defer dark mode | Out of scope for this sweep; reduces design surface area | — Pending |
| Foundations-first phasing | Layout shell + tab component changes propagate to every per-surface phase, so doing them first makes the per-surface work mechanical | — Pending |
| Update PRODUCT.md to reality (not the other way around) | The shipped product is the source of truth; aspirational palette/dark-mode language was creating drift | — Pending |
| `/impeccable` as the per-phase planning lens | User preference; matches the design-quality nature of the work | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-30 after initialization*

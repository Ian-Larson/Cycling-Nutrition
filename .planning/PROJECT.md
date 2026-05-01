# Domestique

## What This Is

Domestique is a cyclist's assistant web app — a single home for planning, training, and maintaining the rider and the bike. It's used by experienced self-coached cyclists, often on mobile right before a ride, to build a fast, reliable fueling plan and keep tabs on gear without doing nutrition math or maintenance bookkeeping by hand. Current capabilities ship and work: fuel planning, Gear Hub, ride history & athlete profile, power meter analyzer, Strava sync, and Supabase-backed cloud sync (with local-first storage).

## Core Value

When a rider opens Domestique, every screen feels consistent, dense, and dependable — the same controls in the same places with the same spacing — so they can produce a precise fueling plan and confirm kit readiness in seconds, not minutes.

## Current State

**Shipped:** v1.0 — Polish & Redesign Sweep (2026-04-30). Foundations-first cleanup across Fuel Plan, Garage, Account, plus documentation realignment. See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

**Post-v1.0 polish (this session):** Drop redundant section nav from Fuel Plan; flatten Inventory rail and add type filter pills; move Metric/Imperial to Preferences and tighten Account page; reserve stable width for the sync-status badge slot; **manage fuel inline in the rail** (click name to edit, "+" to add) and retire the standalone fuel inventory page. These are net cleanup landing on top of v1.0; tracked here pending the next milestone scope.

**No active milestone.** Use `/gsd-new-milestone` to scope the next one.

## Next Milestone Goals

_To be defined when the next milestone is scoped._

Possible directions surfaced during v1.0 work and the post-v1.0 polish:

- **Bottle inventory access from the planner** — `/inventory` (now bottles-only) is reachable only from the section nav on `/history` or by direct URL. A native bottle-management affordance on the planner would close the last "kind of hidden" gap from v1.0.
- **Dark mode** — explicitly deferred from v1.0. PRODUCT.md is light-mode only today.
- **Performance work** — not pursued in v1.0; bundle size warnings on production build (≈749 kB / 214 kB gzipped, single chunk) suggest code-splitting could be valuable.
- **Backend / Strava deepening** — sync schema, edge functions, and Strava integration stayed unchanged in v1.0.

## Validated Capabilities

<!-- Existing capabilities, verified to ship and work. -->

- ✓ Fuel planning engine — carb/hydration calc by duration / intensity / heat, optimal bottle selection, drink-mix allocation, timed consumption guide
- ✓ Gear Hub — bike & component inventory, weight tracking, maintenance/service records, due-soon signals (Service tab only post-v1.0)
- ✓ Ride history & athlete profile (consolidated into `/account` two-pane page in v1.0)
- ✓ Power meter analyzer
- ✓ Strava OAuth sync (via Supabase Edge Functions for token exchange)
- ✓ Cloud sync — Supabase auth + Postgres, local-first with cloud backup, "guest mode" fallback when env vars are absent

## Constraints (carried forward)

- **Tech stack:** React 19 + Tailwind v4 + Zustand — Locked.
- **Visual identity:** Orange `#f8622e` brand, light mode only — Confirmed; do not migrate to `#547597`, do not introduce dark variants.
- **Design lens:** `/impeccable` skill for design-quality framing on per-phase planning.
- **No new primitives:** Reuse what's already in `src/components/ui/`. Net-new primitives only if foundation work absolutely requires it.
- **Mobile-first usage pattern:** Riders use the app on phones before rides; layout / spacing / density decisions optimize for one-thumb mobile use first.
- **Compatibility:** Cloud sync (Supabase) and local-first storage must keep working unchanged.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep orange `#f8622e` brand | User confirmed; avoided large-scale token churn during a polish-only milestone | ✓ Shipped (v1.0) |
| Defer dark mode | Out of scope for v1.0; reduces design surface area | ✓ Deferred — still pending |
| Foundations-first phasing | Layout shell + tab component changes propagate to every per-surface phase | ✓ Validated — per-surface phases were mechanical |
| Update PRODUCT.md to reality (not the other way around) | The shipped product is the source of truth; aspirational palette / dark-mode language was creating drift | ✓ Shipped (DOC-01) |
| `/impeccable` as the per-phase planning lens | User preference; matches the design-quality nature of the work | ✓ Adopted |
| Manage fuel inline in the planner rail (post-v1.0) | The standalone fuel-inventory page was hidden and rarely visited; click-to-edit + "+" in the rail eliminates a navigation hop | ✓ Shipped post-v1.0 |

## Context

**Brownfield, mid-life app.** Domestique has shipped real features through ~v4 (cloud sync) and has a mapped codebase (`.planning/codebase/`). The `Plans/` directory holds historical implementation plans (v1.1 → v4); reference material, not active scope.

**Technical environment.** React 19 + TypeScript + Vite SPA, Tailwind CSS v4 with `@theme` tokens in `src/index.css`, Zustand (persist + immer) state, React Router DOM 7, Vitest. Backend is Supabase (Postgres + Edge Functions for Strava token exchange). Deployed to GitHub Pages at the `/Cycling-Nutrition/` subpath. App falls back to a guest/localStorage-only mode when Supabase env vars are absent.

**Design language reality (post-v1.0).** Brand anchored on `--color-brand-500: #f8622e` (orange). Neutrals split between `shell` (warm whites/grays) and `ink` (cool grays). Typography is IBM Plex Sans across sans / body / display. UI primitives healthy and canonical — `<Tabs>`, `<DividedRowList>`, `<Card>`, etc. The Phase-1 page-shell / tab consolidation closed the historical "consistency of application" gap.

## Evolution Notes

<details>
<summary>v1.0 active scope (archived)</summary>

The v1.0 milestone tracked 13 requirements (LAYOUT-01/02, FUEL-01..04, GEAR-01..04, ACCT-01, DOC-01/02), all shipped. See [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) for the archived requirements with outcomes.

The "papercut list" (recorded in conversation 2026-04-30) was the source of truth for active scope during v1.0 — every requirement traced back to it.

</details>

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
*Last updated: 2026-05-01 — v1.0 milestone archived; PROJECT.md evolved to shipped-state form.*

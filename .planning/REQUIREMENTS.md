# Requirements: Domestique — Polish & Redesign Sweep v1

**Defined:** 2026-04-30
**Core Value:** Every screen feels consistent, dense, and dependable — same controls in the same places with the same spacing — so a rider can produce a precise fueling plan and confirm kit readiness in seconds.

## v1 Requirements

Requirements for this milestone. Each maps to one roadmap phase.

### Foundations

Cross-cutting fixes that propagate to every per-surface phase.

- [ ] **LAYOUT-01**: Page-shell side padding is identical across all primary tabs (Fuel Plan, Garage, Account) and all sub-tabs within each surface. Switching tabs must not produce any horizontal shift.
- [ ] **LAYOUT-02**: Tab switchers across Fuel Plan and Garage use a single shared component with consistent styling, sizing, and behavior. Existing primitives in `src/components/ui/` (e.g. `segmented-control`, `tabs`) consolidate to one canonical control.

### Fuel Plan

- [ ] **FUEL-01**: Remove the separate "bottles" item from the right-side Fuel Inventory rail. Bottle quantity is captured only in the setup flow, where the field is renamed to **"Available bottles"** to clarify intent.
- [ ] **FUEL-02**: The setup-flow label currently shown as "Fuel" is renamed to **"Fuel selections"**.
- [ ] **FUEL-03**: The right rail collapses to a single "Fuel Inventory" section — no subsections, no nested headers — once bottles are removed.
- [ ] **FUEL-04**: Quick-counter copy in Fuel Inventory uses correct singular/plural forms and "drink mix" instead of "mix" (e.g., `2 drink mix · 1 solid`, `1 drink mix · 2 solids`, `1 solid`).

### Garage

- [ ] **GEAR-01**: The "Due Soon" service card renders only on the Service tab. It is hidden on Active Setup and History.
- [ ] **GEAR-02**: The Active Setup / Service / History tab strip stays in a fixed vertical position regardless of which tab is active. The "Due Soon" card (or any other content) cannot push the tab strip down.
- [ ] **GEAR-03**: The Garage → Inventory sub-page no longer shows the top counter cards.
- [ ] **GEAR-04**: The Garage → Inventory sub-page component cards use a denser layout (reusing an existing leaner card style from elsewhere in the app) so significantly more items fit per scroll height. Reduce padding and increase information density.

### Account

- [ ] **ACCT-01**: The Account section consolidates into a single 2-pane page — **Athlete information** on top, **Account / Sync / Login** as a condensed bottom section. The previously separate sync/login page is replaced. Spacing matches the rest of the app (per LAYOUT-01).

### Docs

- [ ] **DOC-01**: PRODUCT.md is rewritten to match shipped reality. The orange `#f8622e` brand stays. References to a `#547597`-anchored palette and dark-mode parity are removed. The document is grounded in actual primitives (`src/components/ui/`), actual tokens (`src/index.css` `@theme` block), and actual IA. Once accurate, PRODUCT.md is committed (currently untracked).
- [ ] **DOC-02**: CLAUDE.md's font reference is updated to match the code. "Outfit, Source Sans 3" is replaced with "IBM Plex Sans" (the actual `--font-sans / --font-body / --font-display` values).

## v2 Requirements

No deferred-but-tracked requirements for this milestone. Future polish/redesign work will be scoped as a new milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dark mode | Deferred to a future milestone. PRODUCT.md's earlier "plan for both light and dark" intent is rolled back for this sweep. |
| Palette migration to `#547597` | Rejected. The shipped orange brand `#f8622e` stays. PRODUCT.md is being rewritten to reflect this rather than the code being migrated. |
| New features (fuel-planning logic, gear capability, analyzer features) | This is a polish-only milestone; no functional additions. |
| Backend / Supabase changes | Cloud sync, edge functions, and Strava integration stay as they are. |
| New UI primitives | Reuse what's already in `src/components/ui/`. Net-new primitives only if foundation work absolutely requires it. |
| Targeted performance work | Beyond what naturally falls out of the cleanup, no perf phase. |
| Project-level domain research (4-agent spawn) | `/impeccable` and its subskills will provide the design lens during per-phase planning, replacing the project-level research subagents. |

## Traceability

Filled in during roadmap creation by `gsd-roadmapper`.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | TBD | Pending |
| LAYOUT-02 | TBD | Pending |
| FUEL-01 | TBD | Pending |
| FUEL-02 | TBD | Pending |
| FUEL-03 | TBD | Pending |
| FUEL-04 | TBD | Pending |
| GEAR-01 | TBD | Pending |
| GEAR-02 | TBD | Pending |
| GEAR-03 | TBD | Pending |
| GEAR-04 | TBD | Pending |
| ACCT-01 | TBD | Pending |
| DOC-01 | TBD | Pending |
| DOC-02 | TBD | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: pending roadmap
- Unmapped: pending roadmap

---
*Requirements defined: 2026-04-30*
*Last updated: 2026-04-30 after initial definition*

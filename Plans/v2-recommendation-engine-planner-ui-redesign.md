# v2 Recommendation Engine & Planner UI Redesign

## Context

The current recommendation engine has a fundamental flaw: it decides solid food quantity first (using a rigid `ceil(1 solid/hour × duration)` formula), then fills the remaining carbs with drink mix. This produces poor results — on a 75-min ride at 75g/h, it recommends 2 chews (60g) leaving only 34g for drink mix at a watery 0.045 g/ml concentration. A better plan would be 1 chew + 2 scoops in a single bottle at a normal concentration.

Additionally, the Ride Details UI has cluttered inputs (separate text boxes, preset chips, range labels, and formatted displays all competing for space) and offers no way to adjust the plan after generation.

**Goal:** Build a concentration-first engine that produces sensible defaults, and a clean UI that lets users adjust the plan inline.

---

## Implementation Order

1. **Product model** — Add concentration field to types + product form (small, foundational)
2. **Engine rewrite** — Concentration-first solver + `recalculatePlan()` function
3. **Ride Details UI** — Presets + inline edit pattern for Duration/Carbs, side-by-side dropdowns
4. **Results with inline adjustments** — Stepper controls, target bar, real-time recalc
5. **Integration & verification** — End-to-end testing with scenarios

# v3 Science-Backed Fueling Engine Rewrite

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the carb-and-hydration-only calculator with a full fueling-protocol engine grounded in peer-reviewed endurance-nutrition science (Jeukendrup 2011/2014, Alghannam 2018, Murray & Rosenbloom 2018, Kato 2016, Baar 2014, Ivy 2004, Atherton & Smith 2012, Arent 2020). The new engine prescribes **pre-ride, during-ride, and post-ride** fueling for any rider/session/environment combination, modeling carbohydrate, fluid, sodium, caffeine, and protein, while respecting individual gut capacity, sex, age, training status, and session purpose.

**Architecture:** A new pure-function module `src/lib/fueling/` built alongside the existing `src/lib/calculator/` (kept as fallback until parity is proven). The engine is organized into six compositional layers — **context → targets → protocol → inventory → timeline → validation** — with every magic number carrying a JSDoc citation to its source paper. The existing Zustand store, types, and UI are extended (not replaced) and feature-flagged via `settings.engineVersion: 'v2' | 'v3'`. A migration function upgrades persisted v2 `FuelPlan` records to v3 shape on read.

**Tech Stack:** TypeScript (strict), Vitest for unit tests, existing React 19 / Zustand / Tailwind 4 stack. No new runtime dependencies. Tests colocated in `src/lib/fueling/**/__tests__/*.test.ts`.

---

## Table of Contents

- [Why rewrite](#why-rewrite)
- [Science anchor (consensus numbers)](#science-anchor-consensus-numbers)
- [Engine architecture](#engine-architecture)
- [Rider stories the engine must handle](#rider-stories-the-engine-must-handle)
- [Phase 0 — Scaffolding & science constants](#phase-0--scaffolding--science-constants)
- [Phase 1 — Extended domain types](#phase-1--extended-domain-types)
- [Phase 2 — Context resolution](#phase-2--context-resolution)
- [Phase 3 — During-ride nutrient targets](#phase-3--during-ride-nutrient-targets)
- [Phase 4 — Pre-ride protocol](#phase-4--pre-ride-protocol)
- [Phase 5 — Post-ride protocol](#phase-5--post-ride-protocol)
- [Phase 6 — Caffeine protocol](#phase-6--caffeine-protocol)
- [Phase 7 — Daily targets & multi-day periodization](#phase-7--daily-targets--multi-day-periodization)
- [Phase 8 — Inventory allocation](#phase-8--inventory-allocation)
- [Phase 9 — Timeline synthesis](#phase-9--timeline-synthesis)
- [Phase 10 — Validation & warnings](#phase-10--validation--warnings)
- [Phase 11 — Orchestrator + feature flag + migration](#phase-11--orchestrator--feature-flag--migration)
- [Phase 12 — UI integration (deferred to follow-up plan)](#phase-12--ui-integration-deferred-to-follow-up-plan)
- [Risks and open decisions](#risks-and-open-decisions)

---

## Why rewrite

The current engine (`src/lib/calculator/`) is a well-built **carbohydrate + fluid allocator** for a single ride. Its real ceiling is the scope of its model. Concretely:

| Gap in v2 | Evidence-based consequence |
|---|---|
| Intensity is a 5-bucket enum (recovery…race) in manual mode | Continuous IF, duration, and session purpose each change the prescription (Jeukendrup 2014 table, Baar 2014 adaptation framing) — bucketing erases the signal |
| Heat is a 4-bucket enum (cool/moderate/warm/hot) with no humidity | Sweat rate scales with wet-bulb, not dry-bulb temperature; a single multiplier misallocates 300–1000 ml/h on hot rides |
| `sweatRateLph` used for volume, but sweat sodium concentration is a fixed 500 mg/h base | Individual sweat [Na] ranges 300–1800 mg/L; prescription error can be 2× |
| Caffeine and sodium are fields on `Product`, never used in targets, timing, or warnings | Caffeine timing (3 mg/kg, 30–60 min pre) is a well-validated ergogenic untouched; sodium shortfalls drive GI distress and cramping |
| Protein not modeled at all | Endurance athletes need 1.6–1.8 g/kg/day (Kato 2016); recovery glycogen benefits from 0.3–0.4 g/kg when CHO is sub-optimal (Alghannam 2018); omission makes the app useless for recovery planning |
| No pre-ride or post-ride output | The canonical "window of opportunity" (Ivy 2004, revised by Arent 2020) is where fueling matters most for multi-session days |
| `gutTrainingTargetGph` is one static slider | Gut training is a progressive, weekly-adjustable adaptation (Jeukendrup 2011); a single number neither tracks progression nor protects the user from overshoot |
| No session-purpose concept (adaptation vs. quality vs. race) | Baar 2014 explicitly: fueling strategy should differ for train-low vs. performance sessions; the same 90-min session gets different prescriptions by purpose |
| Single-session only | Stage races, back-to-back workouts, and carb-loading protocols (36–48 h at 10 g/kg/day) are invisible |
| Timing algorithm is fixed round-robin | Real strategies: top-of-hour feed, pre-climb gel, 15-min bottle sips, caffeine stack at 2h-to-go — none expressible |

A rewrite is warranted because the mental model of the engine — "allocate carbs into bottles to meet an hourly target" — is too small. The rewrite's model is: **given who you are, what you're doing, and when, prescribe a complete protocol of what to eat and drink before, during, and after, using what's in your pantry.**

---

## Science anchor (consensus numbers)

These are the numerical anchors extracted from the eight source papers plus the TrainerRoad article. Every constant in the engine must reference one of these rows in a JSDoc comment.

### During-ride carbohydrate (Jeukendrup 2011/2014 — the canonical duration table)
| Planned ride duration | Target CHO g/h | Notes |
|---|---|---|
| < 30 min | 0 | No benefit |
| 30–75 min | 0 or mouth rinse | 5–10 s swill of CHO drink; oral-receptor benefit only |
| 75–120 min | 30 g/h | Any single source |
| 120–150 min | 30–60 g/h | Ramp |
| 150–180 min | 60 g/h | Any single source (SGLT1 ceiling) |
| > 180 min | 90 g/h | Must use glucose:fructose ~2:1 (or 1:0.8) — adds GLUT5 pathway |
| Elite / fully gut-trained race | 100–120 g/h | Only with sustained practice; GI-distress risk |

### During-ride hydration & sodium (Jeukendrup 2011, Murray & Rosenbloom 2018)
- Individualize from rider's measured sweat rate; default bracket 500–1000 ml/h when unknown.
- Cap body-mass loss at 2–3% to avoid performance drop.
- Sodium in bottles: 300–800 mg/L for rides >2 h; up to 1000 mg/L for heavy sweaters / hot days.
- Drink rate rarely exceeds ~1.2 L/h in most riders without GI distress.

### Pre-ride (Jeukendrup 2011, Arent 2020, TrainerRoad)
- 1–4 h before: **1–4 g CHO/kg** (fewer g/kg closer to start).
- Low-fiber, low-fat if ≤2 h out.
- Optional 0.3 g/kg protein (Arent 2020).

### Carb-loading protocol for events >90 min (Jeukendrup 2014, Murray & Rosenbloom 2018)
- **10–12 g CHO/kg/day × 36–48 h** pre-event, spread across meals.
- No depletion phase needed (modern taper-only).
- Per-hour cap: 1.2 g/kg/h during loading days.

### Post-ride (Alghannam 2018, Ivy 2004, Arent 2020, Murray & Rosenbloom 2018)
- **If next session <8 h away (rapid recovery):**
  - 1.0–1.2 g CHO/kg/h × first 4 h, feedings every 15–30 min.
  - If CHO shortfall (<0.8 g/kg/h possible): add 0.3–0.4 g protein/kg/h.
- **If next session 8–24 h away (normal recovery):**
  - Prioritize total daily CHO + 0.25–0.40 g/kg protein within 2 h.
- **If next session >24 h away:** daily totals suffice.
- Protein "anabolic window" is 24–48 h, not 30 min — **soft gradient, not hard cutoff** (Arent 2020, Atherton 2012).

### Daily targets (Kato 2016, Murray & Rosenbloom 2018, Baar 2014)
- Daily protein (endurance): **1.6–1.8 g/kg/day** (EAR 1.65, RDA 1.83 from Kato); push to 1.8–2.0 for masters/concurrent strength.
- Daily CHO tiered by training load:
  - Light (<1 h/day): 3–5 g/kg/day
  - Moderate (1 h/day): 5–7 g/kg/day
  - High (1–3 h/day): 6–10 g/kg/day
  - Very high (3+ h/day, stage race): 8–12 g/kg/day
- Per-meal protein: 0.25–0.40 g/kg (≈20 g at baseline, up to 40 g for masters / 90 kg riders); 4 meals/day, 3–4 h apart (Atherton 2012).

### Caffeine (Jeukendrup 2011, Baar 2014)
- Ergogenic dose: **3 mg/kg**, 30–60 min pre-event.
- Adaptation-session dose (fasted low-CHO): **200 mg flat**, no concurrent CHO (Baar).
- Daily ceiling: ~400 mg; warn above.
- Half-life ~5 h; flag if dosing after 14:00 for riders with evening sleep concerns.

### Gut training (Jeukendrup 2011, Murray & Rosenbloom 2018)
- Progressive: start at 30 g/h, add 10 g/h per 2-week block, target 90–120 g/h.
- Regress during detraining weeks (illness, travel, taper).

---

## Engine architecture

```
src/lib/fueling/
├── constants/
│   ├── science.ts           # Every citable number; JSDoc references
│   ├── defaults.ts          # Non-citation defaults (UI-level, replaceable)
│   └── __tests__/
├── types/
│   ├── rider.ts             # RiderProfile (expanded)
│   ├── session.ts           # SessionPlan (the "ride" but richer)
│   ├── environment.ts       # Weather, altitude, terrain
│   ├── purpose.ts           # SessionPurpose enum + classifier
│   ├── prescription.ts      # Output: FuelingPrescription
│   └── index.ts             # Re-exports
├── context/
│   ├── resolve-rider.ts     # Normalize rider inputs, infer defaults
│   ├── resolve-session.ts   # Solve duration/IF/TSS triangle, classify
│   ├── resolve-environment.ts  # Dry-bulb + humidity → effective heat
│   ├── resolve-purpose.ts   # Session-purpose classifier
│   ├── build-context.ts     # Orchestrator → FuelingContext
│   └── __tests__/
├── targets/
│   ├── carb-target.ts       # Duration-bucketed CHO g/h, IF-adjusted, gut-capped
│   ├── hydration-target.ts  # Sweat rate × heat × intensity → ml/h
│   ├── sodium-target.ts     # Sweat volume × [Na] → mg/h
│   ├── caffeine-target.ts   # 3 mg/kg ergogenic / 200 mg adaptation
│   ├── pre-ride-target.ts   # g/kg CHO by time-to-start
│   ├── post-ride-target.ts  # Recovery-window CHO + protein
│   ├── daily-target.ts      # Daily CHO + protein by training load
│   └── __tests__/
├── inventory/
│   ├── score-product.ts     # Product-to-target fitness score
│   ├── select-bottles.ts    # (ported + extended from v2 bottles.ts)
│   ├── allocate-mix.ts      # Drink-mix allocation w/ glucose:fructose check
│   ├── allocate-solids.ts   # Multi-nutrient solid allocation
│   └── __tests__/
├── timeline/
│   ├── pre-ride-timeline.ts # T-4h, T-2h, T-1h events
│   ├── during-timeline.ts   # Sips + feeds + caffeine stack + refuel stops
│   ├── post-ride-timeline.ts  # 0–2h, 2–4h events
│   ├── merge.ts             # Merge → single sorted timeline
│   └── __tests__/
├── validation/
│   ├── warnings.ts          # GI, hyponatremia, caffeine, concentration, ratio
│   ├── confidence.ts        # Confidence score (data completeness)
│   └── __tests__/
├── migration/
│   ├── v2-to-v3.ts          # Upgrade persisted FuelPlan records
│   └── __tests__/
├── index.ts                 # buildPrescription(input) → FuelingPrescription
└── README.md                # Quickstart + citation index
```

**Key design rules:**

1. **Pure functions only** — no I/O, no dates-from-`new Date()`, no randomness. Everything takes explicit inputs. Time is passed in as `ISO string | null`.
2. **JSDoc citation on every magic number.** Example:
   ```ts
   /** 3 mg/kg pre-ride caffeine. Source: Jeukendrup 2011 (J Sports Sci 29); confirmed Burke 2008. */
   export const ERGOGENIC_CAFFEINE_MG_PER_KG = 3;
   ```
3. **Targets are independent of inventory.** You can compute the prescribed g/h CHO with no bottles in the database.
4. **Inventory is independent of timeline.** A rider can pick a pack list without a time-stamped guide and vice versa.
5. **Discrete `FuelingContext` object flows through layers.** No re-derivation.
6. **Result type is a union-free `FuelingPrescription`** with optional `pre`, `during`, `post`, `daily`, `warnings[]`, `confidence`.
7. **Citation constants live only in `constants/science.ts`.** Calculator files import; test files assert both logic and that the citation constant is what's referenced.

---

## Rider stories the engine must handle

These anchor the tests. Every phase must keep all stories green.

| # | Story | Must exercise |
|---|---|---|
| 1 | 70 kg rider, 45-min recovery spin | <30 min branch of CHO table; no during-ride fuel |
| 2 | 70 kg rider, 90-min threshold workout at 0.88 IF | 75–120 min branch; 30 g/h; sodium low; caffeine optional |
| 3 | 70 kg rider, 2.5 h tempo ride, 22 °C 50% humidity | 2–3 h branch; 60 g/h; individualized sweat; sodium 500–800 mg/L |
| 4 | 70 kg rider, 4 h hilly race Saturday, 30 °C 70% humidity | >3 h branch; 90 g/h, glucose:fructose enforced; pre-ride carb load; full recovery protocol; caffeine stack |
| 5 | 70 kg rider, 2 h fasted Z2 ride, session purpose "adaptation" | Train-low branch: minimal during-ride fuel; 200 mg caffeine allowed; normal post-ride |
| 6 | New 85 kg rider, first century, self-reports 50 g/h max gut tolerance | Gut-training ceiling respected; warnings about ramp; refuel stops emphasized |
| 7 | 62 kg female, 3 h ride back-to-back tomorrow (8 h gap) | Rapid-recovery branch: 1.0–1.2 g/kg/h CHO for 4 h; feedings every 15–30 min |
| 8 | 70 kg rider, 3-day gravel stage race | Multi-day periodization: carb load, per-stage fuel, aggressive between-stage recovery |
| 9 | 48-year-old master, 2 h threshold | Age-adjusted per-meal protein (0.4 g/kg ceiling); caffeine timing flag if late afternoon |
| 10 | 70 kg rider, sweat rate 1.5 L/h, sweat [Na] 1200 mg/L | Heavy-sweater sodium path; bottle [Na] target 800–1000 mg/L; warning if products can't meet |

---

## Phase 0 — Scaffolding & science constants

**Goal:** Stand up the folder, introduce `science.ts` as the single source of citable numbers, wire tests.

### Task 0.1 — Create folder and README

**Files:**
- Create: `src/lib/fueling/README.md`
- Create: `src/lib/fueling/index.ts` (empty stub exporting `{}`)

**Steps:**
1. Write a short README explaining layer structure and the "citation on every magic number" rule. Link this plan file.
2. Commit: `chore(fueling): scaffold v3 engine folder`

### Task 0.2 — Science constants module

**Files:**
- Create: `src/lib/fueling/constants/science.ts`
- Create: `src/lib/fueling/constants/__tests__/science.test.ts`

**Step 1 — Write the failing test:**

```ts
// src/lib/fueling/constants/__tests__/science.test.ts
import { describe, it, expect } from 'vitest';
import * as S from '../science';

describe('science constants', () => {
  it('duration→CHO table covers the full Jeukendrup bracket set', () => {
    expect(S.DURATION_CHO_BRACKETS).toHaveLength(6);
    // <30, 30-75, 75-120, 120-180, 180-indefinite, elite
    expect(S.DURATION_CHO_BRACKETS[0].maxMinutes).toBe(30);
    expect(S.DURATION_CHO_BRACKETS.at(-1)?.ceilingGph).toBeGreaterThanOrEqual(100);
  });

  it('recovery window thresholds match Alghannam/Arent consensus', () => {
    expect(S.RAPID_RECOVERY_MAX_HOURS).toBe(8);
    expect(S.RAPID_RECOVERY_CHO_G_PER_KG_PER_HOUR.min).toBe(1.0);
    expect(S.RAPID_RECOVERY_CHO_G_PER_KG_PER_HOUR.max).toBe(1.2);
  });

  it('caffeine dosing matches Jeukendrup/Baar', () => {
    expect(S.ERGOGENIC_CAFFEINE_MG_PER_KG).toBe(3);
    expect(S.ADAPTATION_CAFFEINE_MG_FLAT).toBe(200);
    expect(S.DAILY_CAFFEINE_CEILING_MG).toBe(400);
  });

  it('endurance daily protein RDA equals Kato 2016 upper CI', () => {
    expect(S.DAILY_PROTEIN_G_PER_KG.rda).toBe(1.83);
    expect(S.DAILY_PROTEIN_G_PER_KG.ear).toBe(1.65);
  });
});
```

**Step 2 — Run, confirm fail** (`vitest run src/lib/fueling/constants` → "Cannot find module ../science").

**Step 3 — Implement** — see scope below.

```ts
// src/lib/fueling/constants/science.ts
/**
 * All numerical constants used by the fueling engine MUST be defined here,
 * each with a JSDoc citation naming its primary source. Engine code imports
 * from this module only; never inline numbers.
 */

/** During-ride CHO by planned duration. Source: Jeukendrup 2011/2014 table. */
export const DURATION_CHO_BRACKETS = [
  { maxMinutes: 30,  ceilingGph: 0,   label: 'minimal',         requiresFructoseMix: false },
  { maxMinutes: 75,  ceilingGph: 0,   label: 'mouth-rinse',     requiresFructoseMix: false },
  { maxMinutes: 120, ceilingGph: 30,  label: 'single-source',   requiresFructoseMix: false },
  { maxMinutes: 180, ceilingGph: 60,  label: 'single-source',   requiresFructoseMix: false },
  { maxMinutes: 360, ceilingGph: 90,  label: 'multi-transport', requiresFructoseMix: true  },
  { maxMinutes: Infinity, ceilingGph: 120, label: 'elite',      requiresFructoseMix: true  },
] as const;

/** Max CHO concentration safe for most GI systems. Source: Maurten / Jeukendrup. */
export const MAX_BOTTLE_CONC_G_PER_ML = 0.16;

/** Rapid recovery window: next session within this many hours → aggressive CHO. Source: Alghannam 2018, Ivy 2004. */
export const RAPID_RECOVERY_MAX_HOURS = 8;
export const RAPID_RECOVERY_CHO_G_PER_KG_PER_HOUR = { min: 1.0, max: 1.2 };
export const RAPID_RECOVERY_FEED_INTERVAL_MIN = { min: 15, max: 30 };
export const RAPID_RECOVERY_PROTEIN_RESCUE_G_PER_KG_PER_HOUR = 0.35;
export const RAPID_RECOVERY_PROTEIN_TRIGGER_CHO_SHORTFALL = 0.8;

/** Pre-ride CHO window. Source: Jeukendrup 2011, Arent 2020. */
export const PRE_RIDE_WINDOWS = [
  { hoursBeforeStart: 4, choGPerKg: 4.0 },
  { hoursBeforeStart: 2, choGPerKg: 2.0 },
  { hoursBeforeStart: 1, choGPerKg: 1.0 },
] as const;

/** Carb load protocol for events >90 min. Source: Jeukendrup 2014, Murray & Rosenbloom 2018. */
export const CARB_LOAD_G_PER_KG_PER_DAY = { min: 10, max: 12 };
export const CARB_LOAD_DAYS = 2;
export const CARB_LOAD_HOURLY_CEILING_G_PER_KG = 1.2;

/** Caffeine. Source: Jeukendrup 2011, Baar 2014. */
export const ERGOGENIC_CAFFEINE_MG_PER_KG = 3;
export const ADAPTATION_CAFFEINE_MG_FLAT = 200;
export const DAILY_CAFFEINE_CEILING_MG = 400;
export const CAFFEINE_HALF_LIFE_HOURS = 5;
export const CAFFEINE_PRE_RIDE_WINDOW_MIN = { min: 30, max: 60 };

/** Endurance daily protein. Source: Kato 2016 IAAO. */
export const DAILY_PROTEIN_G_PER_KG = { ear: 1.65, rda: 1.83, mastersCeiling: 2.0 };
export const PER_MEAL_PROTEIN_G_PER_KG = { min: 0.25, max: 0.40 };
export const PROTEIN_MEAL_SPACING_HOURS = { min: 3, max: 4 };

/** Daily CHO tiers by training load. Source: Murray & Rosenbloom 2018. */
export const DAILY_CHO_G_PER_KG_BY_LOAD = {
  light:    { min: 3, max: 5 },   // <1 h/day
  moderate: { min: 5, max: 7 },   // ~1 h/day
  high:     { min: 6, max: 10 },  // 1–3 h/day
  veryHigh: { min: 8, max: 12 },  // 3+ h/day
};

/** Hydration caps. Source: Jeukendrup 2011. */
export const MAX_BM_LOSS_PERCENT = 2.5;
export const DEFAULT_SWEAT_RATE_LPH_BY_HEAT = {
  cold: 0.4, cool: 0.5, moderate: 0.7, warm: 1.0, hot: 1.4, extreme: 1.8,
};
export const DEFAULT_SWEAT_SODIUM_MG_PER_L = 900;
export const HEAVY_SWEATER_SODIUM_MG_PER_L = 1400;
export const BOTTLE_SODIUM_MG_PER_L_RANGE = { min: 300, max: 1000 };

/** Sex, age adjustments. Sources: various; conservative defaults. */
export const MASTERS_AGE_THRESHOLD = 40;

/** Gut training. Source: Jeukendrup 2011, Murray & Rosenbloom 2018. */
export const GUT_TRAINING = {
  startGph: 30,
  ceilingGph: 120,
  incrementGph: 10,
  blockWeeks: 2,
};

/** Wet-bulb temperature derivation. Source: Stull 2011 approximation. */
export const WET_BULB_STULL_COEFFICIENTS = {
  a: 0.151977, b: 8.313659, c: 1.676331, d: 0.00391838, e: 0.023101, f: 4.686035,
};
```

**Step 4 — Run test, confirm pass.**

**Step 5 — Commit:** `feat(fueling): add citable science constants`

### Task 0.3 — Vitest config check

**Files:**
- Inspect: `vite.config.ts`, `package.json`

Confirm Vitest is already wired (it should be — v2 has tests). If not, add `vitest` + `@testing-library/react` to `devDependencies` and a `test` script. Commit with `chore(deps): add vitest` if changes.

**Exit criteria for Phase 0:**
- [ ] `src/lib/fueling/` exists with README
- [ ] `constants/science.ts` exports all anchored numbers with citations
- [ ] `constants/__tests__/science.test.ts` green
- [ ] `npm run lint` clean
- [ ] Committed

---

## Phase 1 — Extended domain types

**Goal:** Introduce v3-shaped types for rider, session, environment, purpose, and prescription output. These extend rather than replace v2 types; a migration function translates.

### Task 1.1 — `RiderProfile` (extends v2 `AthleteProfile`)

**Files:**
- Create: `src/lib/fueling/types/rider.ts`
- Create: `src/lib/fueling/types/__tests__/rider.test.ts`

**Shape to produce:**

```ts
// src/lib/fueling/types/rider.ts
export type Sex = 'male' | 'female' | 'unspecified';

export interface RiderProfile {
  // identity
  name?: string;
  sex?: Sex;
  age?: number;                      // years
  massKg?: number;
  ftpWatts?: number;

  // training context
  trainingLoad: 'light' | 'moderate' | 'high' | 'veryHigh';
  weeklyHoursAverage?: number;
  doesConcurrentStrength: boolean;

  // sweat / fluids (individualized if known)
  sweatRateLph?: number;            // measured or estimated
  sweatSodiumMgPerL?: number;       // measured or estimated
  heavySweater: boolean;

  // gut / adaptation
  currentGutCeilingGph: number;     // 30–120, user-adjustable
  gutTrainingStartedAt?: string;    // ISO date; drives progression suggestions

  // caffeine
  caffeineSensitive: boolean;       // halves ergogenic dose
  avoidsCaffeineAfterHour?: number; // 0–23 (local time)

  // dietary constraints
  dietaryFlags: Array<'vegetarian' | 'vegan' | 'gluten-free' | 'lactose-free' | 'low-fodmap'>;

  // units
  anthropometricsUnit: 'metric' | 'imperial';
}
```

**Tests to write:**
- Type is structurally valid (TS compile).
- `trainingLoad` has exactly 4 tiers matching `DAILY_CHO_G_PER_KG_BY_LOAD` keys.
- `dietaryFlags` is an array with enumerated allowed values.

Include a **discriminator test** that builds a sample rider for each of stories 1–10 and asserts a type guard `isRiderProfile()` returns `true`.

**Commit:** `feat(fueling): RiderProfile type`

### Task 1.2 — `SessionPlan`

**Files:**
- Create: `src/lib/fueling/types/session.ts`

```ts
// src/lib/fueling/types/session.ts
export type SessionInputMode =
  | { kind: 'duration_if'; durationMinutes: number; intensityFactor: number }
  | { kind: 'duration_tss'; durationMinutes: number; tss: number }
  | { kind: 'if_tss'; intensityFactor: number; tss: number }
  | { kind: 'duration_rpe'; durationMinutes: number; rpe: 1|2|3|4|5|6|7|8|9|10 };

export interface SessionPlan {
  id: string;
  startAtIso?: string;              // optional; enables timeline anchoring
  inputMode: SessionInputMode;
  purposeOverride?: SessionPurpose; // if user manually picks
  terrain?: 'flat' | 'rolling' | 'hilly' | 'mountainous';
  elevationGainMeters?: number;
  refuelStopOffsets?: number[];     // offsets in minutes
  nextSessionAtIso?: string;        // drives recovery aggressiveness
  priorSessionEndedAtIso?: string;  // drives pre-ride glycogen state
}
```

### Task 1.3 — `Environment`

**Files:**
- Create: `src/lib/fueling/types/environment.ts`

```ts
export interface Environment {
  dryBulbCelsius?: number;
  relativeHumidityPercent?: number;
  windKph?: number;
  altitudeMeters?: number;
  heatAcclimatized?: boolean;   // 7–10 days in heat
}
```

### Task 1.4 — `SessionPurpose` and classifier enum

**Files:**
- Create: `src/lib/fueling/types/purpose.ts`

```ts
export type SessionPurpose =
  | 'recovery'        // Zone 1; minimal fuel
  | 'adaptation'      // Z2, deliberately train-low OK
  | 'endurance'       // Z2–3 steady
  | 'tempo'           // Z3 sustained
  | 'threshold'       // Z4 intervals
  | 'vo2'             // Z5 intervals
  | 'race'            // event day — max fueling
  | 'stage_race_day'; // part of multi-day block
```

### Task 1.5 — `FuelingPrescription` (the output)

**Files:**
- Create: `src/lib/fueling/types/prescription.ts`

```ts
export interface FuelingPrescription {
  contextSummary: {
    rider: Pick<RiderProfile, 'massKg' | 'sex' | 'age' | 'trainingLoad' | 'currentGutCeilingGph'>;
    durationMinutes: number;
    intensityFactor: number;
    tss: number;
    effectiveHeat: 'cold' | 'cool' | 'moderate' | 'warm' | 'hot' | 'extreme';
    purpose: SessionPurpose;
  };
  pre?: PreRidePrescription;
  during: DuringRidePrescription;
  post?: PostRidePrescription;
  daily?: DailyTargets;
  packList?: PackList;               // populated after inventory step
  timeline?: TimelineItem[];
  warnings: Warning[];
  confidence: { score: number; missing: string[] }; // 0–1, list of data gaps
  engineVersion: 'v3';
}

export interface PreRidePrescription {
  carbsGrams: number;
  carbsGPerKg: number;
  windowHoursBefore: number;        // how early to start
  proteinGrams?: number;
  caffeineMg?: number;
  notes: string[];                  // e.g., "low-fiber preferred"
}

export interface DuringRidePrescription {
  carbsGPerHour: number;
  totalCarbsGrams: number;
  hydrationMlPerHour: number;
  totalHydrationMl: number;
  sodiumMgPerHour: number;
  sodiumMgPerLiterTargetInBottles: number;
  bottleConcentrationGPerMl: number;
  usesMultiTransportableCarbs: boolean;
  caffeineMg?: number;
  caffeineTimingOffsetMinutes?: number;
  strategy: 'steady' | 'top-of-hour' | 'pre-climb-stack' | 'refuel-anchored';
}

export interface PostRidePrescription {
  mode: 'rapid' | 'normal' | 'relaxed';
  window1: { // 0–2h
    carbsGrams: number;
    proteinGrams: number;
    fluidsMl: number;
    sodiumMg: number;
  };
  window2?: { // 2–4h, only if rapid
    carbsGrams: number;
    proteinGrams: number;
  };
  recommendRecoveryDrink: boolean;
  notes: string[];
}

export interface DailyTargets {
  carbsGramsTotal: number;
  carbsGPerKg: number;
  proteinGramsTotal: number;
  proteinGPerKg: number;
  caffeineMgCeiling: number;
}
```

### Task 1.6 — Barrel `types/index.ts`

Re-export everything. Add one compile-time test (`src/lib/fueling/types/__tests__/exports.test.ts`) that imports from the barrel.

**Commit per subtype. Exit criteria for Phase 1:**
- [ ] All types compile (`tsc --noEmit`)
- [ ] Each type has at least one "build sample from story N" test
- [ ] No v2 types were modified (additive only)

---

## Phase 2 — Context resolution

**Goal:** Take raw user inputs and produce a normalized, fully-resolved `FuelingContext` that downstream layers never have to second-guess.

### Task 2.1 — `resolveSessionMetrics`

**Files:**
- Create: `src/lib/fueling/context/resolve-session.ts`
- Create: `src/lib/fueling/context/__tests__/resolve-session.test.ts`

**Behavior:** Given any 2 of {duration, IF, TSS} or {duration, RPE}, fill the other two. Uses `TSS = 100·IF²·hours` (v2 formula). RPE→IF mapping table: 1→0.45, 2→0.55, …, 10→1.1 (citation needed; use Foster 2001).

**Test matrix** — one test per `SessionInputMode` variant, plus an edge case:
- duration 90 + IF 0.88 → TSS 116, NP = 0.88·FTP
- duration 240 + TSS 280 → IF 0.68, NP = 0.68·FTP
- IF 0.75 + TSS 140 → duration 150

**Commit:** `feat(fueling): resolveSessionMetrics`

### Task 2.2 — `resolveEnvironment` (effective heat)

**Files:**
- Create: `src/lib/fueling/context/resolve-environment.ts`

**Behavior:**
1. If dry-bulb + humidity present, compute wet-bulb via Stull 2011 closed form.
2. Map wet-bulb to effective-heat band:
   - < 10 °C → cold
   - 10–15 → cool
   - 15–22 → moderate
   - 22–28 → warm
   - 28–31 → hot
   - > 31 → extreme
3. If only dry-bulb present, use dry-bulb with ±1 band widening on humid defaults.
4. If acclimatized, shift one band cooler (sweat loss lower).

**Tests:** golden-file table of (T, RH) → effective heat for 10 cases spanning the matrix.

### Task 2.3 — `classifyPurpose`

**Files:**
- Create: `src/lib/fueling/context/resolve-purpose.ts`

**Behavior:**
- If `purposeOverride` set → use it.
- Else map from IF:
  - < 0.60 → recovery
  - 0.60–0.70 → adaptation if `adaptation=true` flag else endurance
  - 0.70–0.82 → endurance
  - 0.82–0.90 → tempo
  - 0.90–0.97 → threshold
  - ≥ 0.97 → vo2 or race (race if duration >120 min)

**Tests:** 10 IF values → expected purpose. Override always wins.

### Task 2.4 — `resolveRider` (defaults and inference)

**Files:**
- Create: `src/lib/fueling/context/resolve-rider.ts`

**Behavior:**
- If `sweatRateLph` missing, infer from `DEFAULT_SWEAT_RATE_LPH_BY_HEAT[effectiveHeat]`.
- If `sweatSodiumMgPerL` missing, use `HEAVY_SWEATER_SODIUM_MG_PER_L` when `heavySweater`, else `DEFAULT_SWEAT_SODIUM_MG_PER_L`.
- Clamp `currentGutCeilingGph` to [30, 120].
- Derive `isMasters` = `age ≥ MASTERS_AGE_THRESHOLD`.
- Record a list of inferred-vs-provided fields into `confidence.missing`.

**Tests:** 6 inputs × (provided / missing) → expected defaults.

### Task 2.5 — `buildContext` orchestrator

**Files:**
- Create: `src/lib/fueling/context/build-context.ts`

Combines the above into a single `FuelingContext` object:

```ts
export interface FuelingContext {
  rider: Required<RiderProfile>;     // post-inference
  session: {
    durationMinutes: number;
    intensityFactor: number;
    tss: number;
    normalizedPowerWatts?: number;
    kjPerHour?: number;
    startAtIso?: string;
    terrain?: SessionPlan['terrain'];
    refuelStopOffsets: number[];
    nextSessionAtIso?: string;
    priorSessionEndedAtIso?: string;
  };
  environment: {
    effectiveHeat: 'cold' | 'cool' | 'moderate' | 'warm' | 'hot' | 'extreme';
    dryBulbCelsius?: number;
    relativeHumidityPercent?: number;
    wetBulbCelsius?: number;
    altitudeMeters?: number;
    heatAcclimatized: boolean;
  };
  purpose: SessionPurpose;
  confidence: { score: number; missing: string[] };
}
```

**Tests — one per rider story.** For story 4 (4 h race at 30°C 70% RH), assert:
- `session.durationMinutes === 240`
- `environment.effectiveHeat === 'hot'`
- `purpose === 'race'`
- `rider.sweatRateLph === 1.4` (inferred default for hot)

**Commit after each sub-task.** Exit criteria for Phase 2:
- [ ] All 10 rider stories successfully build a context
- [ ] Confidence score computes and reports missing inputs
- [ ] 100% branch coverage on the 4 context resolvers

---

## Phase 3 — During-ride nutrient targets

**Goal:** Pure functions that turn `FuelingContext` into hourly/total targets for carbs, hydration, sodium.

### Task 3.1 — `carbTarget(context)` → `DuringRidePrescription['carbsGPerHour'|'totalCarbsGrams'|'usesMultiTransportableCarbs']`

**Algorithm:**
1. Look up bracket in `DURATION_CHO_BRACKETS` by `durationMinutes`.
2. Apply intensity modifier: below tempo (IF < 0.82), reduce ceiling 20%; at race IF ≥ 0.97, push to bracket ceiling.
3. Apply purpose modifier: `adaptation` → 0; `recovery` → 0; `race` → at ceiling; `stage_race_day` → at ceiling.
4. Cap at `rider.currentGutCeilingGph`. Emit warning if cap applied.
5. Set `usesMultiTransportableCarbs = bracket.requiresFructoseMix` (true when >60 g/h prescribed).
6. Total = hourly × (durationMinutes / 60), minus refuel-stop resets if any (refuel stops allow fresh bottles → implicit "new budget" segment).

**Tests — one per rider story, plus edge cases:**
- Story 1 (45 min recovery) → 0 g/h, 0 total.
- Story 2 (90 min threshold) → 30 g/h, 45 total.
- Story 4 (4 h race, hot) → 90 g/h, 360 total, `usesMultiTransportableCarbs = true`.
- Story 5 (2 h adaptation) → 0 g/h.
- Story 6 (100 mi century, 50 g/h gut ceiling) → min(bracket, 50) = 50 g/h, warning `"gut-cap-applied"`.

### Task 3.2 — `hydrationTarget(context)`

**Algorithm:**
1. Base `mlPerHour = rider.sweatRateLph * 1000`.
2. Intensity adjustment: `* (0.9 + 0.5 * (IF - 0.5))` clamped [0.8, 1.4] (minor — most variance comes from heat/sweat).
3. Cap at 1200 ml/h (GI limit, Jeukendrup).
4. Total fluid = hourly × hours.
5. Emit warning if total would exceed `rider.massKg * 1000 * MAX_BM_LOSS_PERCENT/100` inverse — i.e., if hydration < 60% of sweat loss, flag deficit; if hydration > sweat loss + 3%, flag hyponatremia risk.

**Tests:** stories 3 (mild day), 4 (hot day), 10 (heavy sweater).

### Task 3.3 — `sodiumTarget(context, hydrationMlPerHour)`

**Algorithm:**
1. `sweatVolumeLph = hydrationMlPerHour / 1000`.
2. `sodiumLossMgPerHour = sweatVolumeLph * rider.sweatSodiumMgPerL`.
3. Target ≈ 50–70% of loss (typical recommendation; cite Murray & Rosenbloom).
4. Bottle [Na] target = `sodiumMgPerHour / hydrationMlPerHour * 1000`, clamped to `BOTTLE_SODIUM_MG_PER_L_RANGE`.

**Tests:**
- Default 900 mg/L sweat × 0.7 L/h moderate → ~630 mg/h loss → ~400 mg/h target.
- Story 10 (1500 ml/h @ 1200 mg/L) → 1800 mg/h loss → aggressive 1000 mg/h target; emit "sodium-ceiling" warning.

### Task 3.4 — Ratio and concentration guard

**Files:**
- Create: `src/lib/fueling/targets/bottle-constraints.ts`

**Behavior:** Given `carbsGPerHour` and `hydrationMlPerHour`, compute `bottleConcentrationGPerMl = g/ml`. If > `MAX_BOTTLE_CONC_G_PER_ML`, solve for required **additional fluid or external solids**. Return a strategy hint:

```ts
{ strategy: 'drink-only' | 'split-drink-solids' | 'solids-heavy', extraFluidMlHint?: number }
```

**Tests:**
- 90 g/h with 700 ml/h → 0.129 g/ml (OK, drink-only).
- 90 g/h with 500 ml/h → 0.18 g/ml → must split to solids.
- 30 g/h with 1000 ml/h → 0.03 g/ml — flag "dilute" (hint: could consume smaller bottles).

**Exit criteria for Phase 3:**
- [ ] Each target fn has story-driven tests
- [ ] Warnings surface via a discriminated `Warning` union (defined in Phase 10 but stubbed here)

---

## Phase 4 — Pre-ride protocol

**Goal:** Given session start time and rider, produce a pre-ride plan.

### Task 4.1 — `preRideTarget(context)`

**Files:**
- Create: `src/lib/fueling/targets/pre-ride-target.ts`

**Algorithm:**
1. Only activate if `purpose ∈ {race, tempo, threshold, vo2, stage_race_day}` and `durationMinutes >= 60`. For adaptation/recovery, return `undefined`.
2. If `session.startAtIso` is set, pick the largest `PRE_RIDE_WINDOWS` entry where `hoursBeforeStart ≤ (now → start)`. Otherwise default to the 2h entry.
3. `carbsGrams = choGPerKg * massKg`.
4. If `purpose === 'race'` and rider has `trainingLoad ∈ {high, veryHigh}`, include **carb-load block** protocol object:
   ```ts
   { days: 2, targetGPerKgPerDay: 10.5, hourlyCeilingGPerKg: 1.2 }
   ```
5. Optional protein 0.3 g/kg if window ≥ 2 h (Arent 2020).
6. Caffeine: if `purpose === 'race'` and not sensitive, suggest `3 mg/kg` in the 30–60 min window.
7. Notes: "low fiber/fat preferred", "liquid CHO ≤1h out", etc.

**Tests:**
- Story 4 (4 h race 8 AM): returns 140 g CHO at T-2h, caffeine 210 mg at T-45min, carb-load block.
- Story 5 (adaptation ride): returns `undefined`.
- Story 2 (threshold 6 PM weekday): returns 70 g CHO at T-2h.

---

## Phase 5 — Post-ride protocol

**Goal:** Recovery plan gated on time to next session.

### Task 5.1 — `postRideTarget(context)`

**Files:**
- Create: `src/lib/fueling/targets/post-ride-target.ts`

**Algorithm:**
1. Compute `hoursToNext = (nextSessionAtIso - (startAt + durationMinutes)) / 3600000` when both timestamps present; else assume 24 h.
2. Classify mode:
   - `hoursToNext ≤ RAPID_RECOVERY_MAX_HOURS` → **rapid**
   - `hoursToNext ≤ 24` → **normal**
   - else → **relaxed**
3. Rapid:
   - Window 1 (0–2 h): CHO = 1.1 g/kg/h × 2 = 2.2 g/kg; feedings every 15–30 min.
   - If CHO actually consumed can only hit ≤ 0.8 g/kg/h (inferred from rider's available products later), add protein at 0.35 g/kg/h × 2.
   - Window 2 (2–4 h): repeat at 1.0 g/kg/h × 2.
   - Fluids: 150% of BM loss; sodium ~600 mg/L fluid.
4. Normal:
   - Single meal in the 0–2 h window: 1.0–1.2 g/kg CHO + 0.3 g/kg protein + fluids to 125% of loss.
5. Relaxed:
   - Just a note: "hit daily CHO + protein targets; no urgency".

**Tests:** stories 7 (8 h gap), 8 (stage race mid-block), 4 (race, no next session specified → normal).

---

## Phase 6 — Caffeine protocol

**Goal:** Caffeine gets its own module because timing and daily ceiling interact with other sources (gels contain caffeine).

### Task 6.1 — `caffeineProtocol(context, plannedIngestionsMg[])`

**Files:**
- Create: `src/lib/fueling/targets/caffeine-target.ts`

**Behavior:**
1. Determine target:
   - `purpose === 'race'` & not sensitive → `3 mg/kg` pre-ride.
   - `purpose === 'adaptation'` & fasted → `200 mg` flat (Baar).
   - Otherwise → none recommended.
2. During-ride caffeine from gels is additive; accept `plannedIngestionsMg[]` array and compute cumulative curve with 5-h half-life.
3. Warnings:
   - `total > DAILY_CAFFEINE_CEILING_MG` → "caffeine-excess".
   - Latest ingestion is within `4 * CAFFEINE_HALF_LIFE_HOURS` of `avoidsCaffeineAfterHour` → "late-caffeine".
4. Sensitive rider → halve target, warn at 200 mg total.

**Tests:**
- 70 kg race: 210 mg pre-ride.
- 70 kg race + 4 gels × 40 mg caffeine → total 370 mg, under ceiling, no warning.
- 70 kg race + 5 gels × 40 mg → 410 mg, warn.
- Sensitive rider 70 kg race → 105 mg pre-ride, warn if over 200 mg total.

---

## Phase 7 — Daily targets & multi-day periodization

**Goal:** Beyond a single ride — what should today's eating look like?

### Task 7.1 — `dailyTargets(rider, todaysSessions[])`

**Files:**
- Create: `src/lib/fueling/targets/daily-target.ts`

**Behavior:**
1. Classify today's load by total session hours:
   - <1 h → light
   - 1–2 h → moderate
   - 2–3 h → high
   - 3+ h → veryHigh
2. CHO = midpoint of `DAILY_CHO_G_PER_KG_BY_LOAD[load]` × massKg. Return range.
3. Protein = `RDA × massKg`. If masters or strength → `mastersCeiling × massKg`.
4. Caffeine ceiling = `DAILY_CAFFEINE_CEILING_MG`.
5. Per-meal protein bracket 4 meals × 0.25–0.40 g/kg.

**Tests:**
- 70 kg, 90 min threshold today → moderate load → 420 g CHO, 128 g protein.
- 70 kg, 4 h race today → veryHigh → 700 g CHO (10 g/kg), 128 g protein.
- 48 yo masters 70 kg → 140 g protein (2.0 g/kg).

### Task 7.2 — `carbLoadProtocol(rider, eventDateIso)`

**Files:**
- Create: `src/lib/fueling/targets/carb-load.ts`

**Behavior:**
- Returns 2-day plan: each day → grams target, per-hour ceiling, example meal structure (educational text, not a meal planner).
- Only emit when event duration > 90 min and daysUntil ≤ 2.

---

## Phase 8 — Inventory allocation

**Goal:** Map the abstract targets (90 g/h CHO, 400 mg/h Na) onto the rider's actual bottles and products.

This phase mostly ports and extends v2 `bottles.ts` and `solids.ts`, but adds:
- Product scoring against multi-nutrient targets.
- Glucose:fructose ratio enforcement.
- Sodium coverage (preferring products with sodium over pure glucose mixes when target Na is high).
- Protein from solids (bars, recovery drinks) when recovery is in scope.

### Task 8.1 — Extend `Product` type with new fields

**Files:**
- Modify: `src/types/product.ts`
- Modify: `src/components/products/product-form.tsx` (Phase 12 — UI; here just add optional fields to type to avoid cascade)

Add optional fields (non-breaking):
```ts
nutrition: {
  carbsGrams: number;
  calories: number;
  sodiumMg?: number;
  caffeineMg?: number;
  proteinGrams?: number;         // NEW
  fatGrams?: number;             // NEW (future use)
  fiberGrams?: number;           // NEW (future use)
};
carbComposition?: {              // NEW — for multi-transport detection
  glucoseGrams?: number;
  fructoseGrams?: number;
  maltodextrinGrams?: number;
};
```

Existing products continue to parse; all new fields optional. **Commit small.**

### Task 8.2 — `scoreProduct(product, targetContext)` utility

**Files:**
- Create: `src/lib/fueling/inventory/score-product.ts`

Compute a scalar fitness 0–1 per product based on how well it fills remaining gaps (carbs, sodium, glucose:fructose balance, caffeine budget). Used for ranking when there are multiple candidates.

### Task 8.3 — Port `selectBottles` → `src/lib/fueling/inventory/select-bottles.ts`

Minor changes: accept `targetFluidMl` and `hoursAvailable` for refuel segmentation, preserve v2 greedy algorithm but make it easier to test.

### Task 8.4 — `allocateMix` with multi-transport enforcement

**Files:**
- Create: `src/lib/fueling/inventory/allocate-mix.ts`

**Algorithm:**
1. If `target.usesMultiTransportableCarbs === true`:
   - Prefer products with `carbComposition.glucoseGrams` and `carbComposition.fructoseGrams` present.
   - Compute implied ratio; flag if outside [1.5:1, 2.5:1].
   - If no multi-transport product exists in pantry, emit warning `"no-multi-transport-product"` and fall back to mixing two single-source products if possible (e.g., Gatorade + fruit purée — though app-level; just warn and proceed).
2. Fill bottles to concentration sweet spot (target `(min+max)/2`) or to `MAX_BOTTLE_CONC_G_PER_ML`.
3. Return bottle allocations.

### Task 8.5 — `allocateSolids` for carb + sodium + caffeine + protein

**Files:**
- Create: `src/lib/fueling/inventory/allocate-solids.ts`

Proportional budgets by priority:
1. Carbs (primary) — distribute remaining after drink mix.
2. Sodium (secondary) — if bottle mix can't cover, prefer high-Na solids (e.g., pretzels, salt tabs).
3. Caffeine (tertiary) — gate to race purpose; only count gels that match pre-ride or strategic climb timing.
4. Protein (only in post-ride inventory pass) — for recovery scenarios.

Return `SolidAllocation[]` with per-product quantities.

**Commit after each sub-task.**

---

## Phase 9 — Timeline synthesis

**Goal:** Transform prescriptions + pack list into a single chronological schedule the rider follows.

### Task 9.1 — `buildPreRideTimeline(preRide, sessionStart)`

**Files:**
- Create: `src/lib/fueling/timeline/pre-ride-timeline.ts`

Emit events:
- T–4h: if 4 g/kg window chosen → "meal ~X g CHO"
- T–2h: top-up or primary pre-ride meal
- T–45min: caffeine stack (if prescribed)
- T–15min: final 15–20 g CHO hit + 150 ml fluid

Each event is a `TimelineItem` with `offsetMinutesFromStart` (negative for pre-ride), a human-readable action, cumulative macros.

### Task 9.2 — `buildDuringTimeline(during, packList, refuelStopOffsets)`

**Files:**
- Create: `src/lib/fueling/timeline/during-timeline.ts`

**Algorithm:**
- Choose a `strategy`:
  - `steady` (default): feedings at 15-min intervals (sips every 15, solids spread).
  - `top-of-hour`: consolidate solids to top of each hour.
  - `pre-climb-stack`: if `terrain === 'hilly'|'mountainous'` and elevationGain provided, cluster one gel in 30-min before each anticipated climb (climb offsets are a future enhancement — for now, split the ride into 3 and anchor on thirds).
  - `refuel-anchored`: if refuelStopOffsets present, restart a new budget at each.
- For each strategy, produce an ordered list of events.
- Merge sips and solids with spacing min 5 min between events.

### Task 9.3 — `buildPostRideTimeline(postRide, sessionEndIso)`

**Files:**
- Create: `src/lib/fueling/timeline/post-ride-timeline.ts`

Emit:
- T+0: recovery drink / banana + shake (window 1 start)
- T+30: mid window-1 feed
- T+60: ...
- T+120: transition, window-2 start if rapid
- T+180/240: window-2 feeds

### Task 9.4 — `mergeTimelines`

**Files:**
- Create: `src/lib/fueling/timeline/merge.ts`

Sort all items by absolute time and compute cumulative macros.

**Tests per phase:** for each of the 10 stories, snapshot the generated timeline (vitest `toMatchInlineSnapshot` or golden JSON).

---

## Phase 10 — Validation & warnings

**Goal:** A discriminated-union `Warning` emitted from any layer, aggregated and surfaced in the prescription.

### Task 10.1 — `Warning` union type

**Files:**
- Create: `src/lib/fueling/validation/warnings.ts`

```ts
export type Warning =
  | { code: 'gut-cap-applied';        severity: 'info'; prescribed: number; cap: number }
  | { code: 'no-multi-transport-product'; severity: 'warn' }
  | { code: 'glucose-fructose-ratio-off'; severity: 'warn'; ratio: number }
  | { code: 'bottle-concentration-exceeded'; severity: 'warn'; gPerMl: number }
  | { code: 'hydration-deficit';      severity: 'warn'; predictedLossPct: number }
  | { code: 'hyponatremia-risk';      severity: 'warn'; fluidMlPerHour: number; sodiumMgPerL: number }
  | { code: 'sodium-ceiling';         severity: 'info' }
  | { code: 'caffeine-excess';        severity: 'warn'; totalMg: number }
  | { code: 'late-caffeine';          severity: 'info'; clockHour: number }
  | { code: 'no-pre-ride-time';       severity: 'info' }
  | { code: 'carb-load-recommended';  severity: 'info'; daysUntilEvent: number }
  | { code: 'gut-training-outpaced';  severity: 'warn'; prescribed: number; recent: number }
  | { code: 'missing-sweat-rate';     severity: 'info' }
  | { code: 'missing-start-time';     severity: 'info' }
  | { code: 'train-low-not-recommended-for-quality'; severity: 'warn' };
```

### Task 10.2 — `confidenceScore(context, prescription)`

**Files:**
- Create: `src/lib/fueling/validation/confidence.ts`

Returns 0–1 based on count of inferred vs provided inputs. Lists `missing` fields.

### Task 10.3 — `validatePrescription(prescription, context)`

**Files:**
- Create: `src/lib/fueling/validation/validate.ts`

Runs final cross-layer checks:
- Pack list actually meets `during.carbsGPerHour` within ±10%.
- Caffeine total ≤ 400 mg.
- No `hydration-deficit` AND `bottle-concentration-exceeded` simultaneously unresolved.

Appends warnings.

---

## Phase 11 — Orchestrator + feature flag + migration

**Goal:** One public entry point. Old engine still available. Store flag toggles which is used.

### Task 11.1 — Public `buildPrescription(input)`

**Files:**
- Create: `src/lib/fueling/index.ts`

```ts
export interface FuelingInput {
  rider: RiderProfile;
  session: SessionPlan;
  environment?: Environment;
  bottles: Bottle[];
  products: Product[];
  todaysSessions?: SessionPlan[];
  nowIso?: string;
}

export function buildPrescription(input: FuelingInput): FuelingPrescription {
  const context = buildContext(input);
  const pre = preRideTarget(context);
  const during = {
    ...carbTarget(context),
    ...hydrationTarget(context),
    ...sodiumTarget(context),
    ...bottleConstraints(context),
  };
  const post = postRideTarget(context);
  const daily = dailyTargets(input.rider, input.todaysSessions ?? [input.session]);
  const packList = {
    bottles: selectBottles(input.bottles, during),
    mix: allocateMix(input.products, during),
    solids: allocateSolids(input.products, during, post),
  };
  const timeline = mergeTimelines([
    buildPreRideTimeline(pre, input.session.startAtIso),
    buildDuringTimeline(during, packList, input.session.refuelStopOffsets ?? []),
    buildPostRideTimeline(post, addMinutes(input.session.startAtIso, context.session.durationMinutes)),
  ]);
  const warnings = validatePrescription({ pre, during, post, daily, packList, timeline }, context);
  const confidence = confidenceScore(context, { /* ... */ });

  return {
    contextSummary: summarize(context),
    pre, during, post, daily, packList, timeline,
    warnings, confidence, engineVersion: 'v3',
  };
}
```

### Task 11.2 — Feature flag in store

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/types/settings.ts` (if exists; else add to `AppSettings`)

Add `settings.engineVersion: 'v2' | 'v3'`, default `'v2'`, user-togglable in Settings UI (Phase 12). Add `useFuelingEngine()` hook in `src/hooks/use-fueling-engine.ts` that returns the right `buildPlan` function.

### Task 11.3 — Migration v2→v3

**Files:**
- Create: `src/lib/fueling/migration/v2-to-v3.ts`

Given a persisted v2 `FuelPlan`, produce the best-effort v3 `FuelingPrescription`. Strategy:
- Infer rider from `settings.athleteProfile` at read time.
- Treat v2 plan as the during-ride portion only; `pre/post/daily/timeline` absent.
- Tag with `engineVersion: 'v3-migrated'`.

### Task 11.4 — Parity suite

**Files:**
- Create: `src/lib/fueling/__tests__/parity.test.ts`

For scenarios that v2 can express (ride with no pre/post, no nextSession, no environment humidity), assert v3's `during` block matches v2 within tolerance. Document deliberate divergences (sodium is now always computed; caffeine is now surfaced).

**Commit aggressively.** Exit criteria for Phase 11:
- [ ] `buildPrescription()` green for all 10 rider stories
- [ ] v2 engine still callable; feature flag default `'v2'`
- [ ] Migration function green
- [ ] Parity suite documents all deliberate differences

---

## Phase 12 — UI integration (deferred to follow-up plan)

This plan deliberately does not cover UI. A follow-up plan should address:
- Planner form changes: continuous IF slider, temperature + humidity fields, purpose selector, start-time picker, next-session-time picker.
- Multi-panel result layout: Pre / During / Post / Daily tabs.
- Rider profile expansion: sweat rate + sodium measurement, dietary flags.
- Product form: protein, fat, fiber, carb composition fields.
- Caffeine dashboard showing cumulative curve.
- Warnings panel with severity colors.
- Carb-load banner when race within 2 days.

Create `Plans/v3.1-fueling-ui-integration.md` when Phase 11 is green.

---

## Risks and open decisions

1. **RPE→IF mapping is subjective.** Foster 2001 is a reasonable anchor but the table will produce arguments. Decision: ship with documented default, expose a per-rider override in Phase 12.

2. **Wet-bulb vs dry-bulb inputs.** Most users know only local temperature. Decision: accept either; use wet-bulb when humidity present; default humidity assumption of 50% when absent with a `missing-humidity` confidence flag.

3. **Multi-transport enforcement without composition data.** Most products in a first-time user's pantry won't have `carbComposition` populated. Decision: enforce warning, not error. Offer a "mark as maltodextrin:fructose 2:1" quick-flag on well-known products (future).

4. **Daily targets span multiple rides.** The current `SessionPlan` models one ride; `todaysSessions?: SessionPlan[]` is the stub. Decision: support a simple array now; richer "training plan" integration is v4.

5. **Carb-loading is a 2-day protocol.** The app has no concept of "event date separate from today." Decision: add `session.startAtIso` as the anchor; carb load activates when `session.startAtIso` is ≥ 24 h ahead AND session duration >90 min.

6. **v2 `AthleteProfile` vs v3 `RiderProfile` drift.** Two shapes, one source of truth needed. Decision: `RiderProfile` is a superset; the settings page edits `RiderProfile`; `AthleteProfile` becomes a derived view for v2 engine calls until v2 is retired.

7. **Backward compatibility of persisted plans.** Zustand `persist` middleware will rehydrate v2 `FuelPlan` objects. Decision: never mutate the persisted `FuelPlan[]`; add a read-time migrator in the selector.

8. **Test strategy.** With this many pure modules, unit tests should cover each fn + one end-to-end test per rider story. Snapshot timelines for stability. Avoid over-specifying warning ordering.

9. **Science revisions.** The field moves (e.g., >120 g/h in elite riders is under active study). Decision: design `DURATION_CHO_BRACKETS` as data, not hard-coded logic, so brackets can shift without code churn.

10. **"Confidence score" is advisory.** Don't gate the UI on it; show "we assumed X because you didn't give us Y" notes instead.

---

## Execution notes

- **Commit every 1–2 tasks.** Messages follow project convention (see recent `feat(fueling): ...` pattern above).
- **Keep v2 untouched until Phase 11 flag flip.** Any bug in v3 must never break v2.
- **Every magic number lives in `science.ts`.** CI grep check: `rg "\\b\\d+\\.\\d+\\b" src/lib/fueling --glob '!**/science.ts' --glob '!**/__tests__/**'` should not return fresh numbers.
- **When in doubt, prefer explicit `undefined` over sentinels.** A missing pre-ride window means no pre-ride plan, not `{ carbsGrams: 0 }`.
- **Performance budget.** The full `buildPrescription()` should run in <5 ms on a 2024 laptop for a typical input. Add a perf test in Phase 11.

---

## Success criteria (done = all green)

- [ ] All 10 rider-story scenarios produce prescriptions that match the science anchor within tolerance.
- [ ] 100% branch coverage on `targets/`, `context/`, `validation/`.
- [ ] Zero hard-coded magic numbers outside `constants/science.ts`.
- [ ] v2 engine still works behind the feature flag.
- [ ] Parity tests green for scenarios v2 can express.
- [ ] No new ESLint errors.
- [ ] README documents how to add a new science citation.

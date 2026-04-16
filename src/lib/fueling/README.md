# Fueling Engine (v3)

This directory contains the **v3 science-backed fueling engine**. It is being
built alongside the existing v2 calculator at `src/lib/calculator/` and must
not modify or depend on v2 code. Once v3 reaches parity, v2 will be retired
via the migration layer.

The full design and rollout plan lives at
[`Plans/v3-science-backed-fueling-engine-rewrite.md`](../../../Plans/v3-science-backed-fueling-engine-rewrite.md).

## Layer structure

Modules are organized as a strict dependency chain — each layer only imports
from the layers above it:

```
constants/   citable numbers, all with JSDoc source references
types/       domain types (no behavior)
context/     environment derivations (heat band, sweat rate, etc.)
targets/     CHO / fluid / sodium / protein / caffeine targets
inventory/   bottle and product allocation
timeline/    feed schedule and consumption guide generation
validation/  sanity / safety checks over plans
migration/   adapters between v2 state and v3 inputs/outputs
```

## Core design rules

1. **Single source of citable numbers.** Every numerical constant the engine
   uses lives in `constants/science.ts` and carries a JSDoc citation naming
   the primary source paper. Engine code imports from this module — never
   inline magic numbers.
2. **Pure functions only.** No I/O, no `Date.now()`, no `new Date()`, no
   random. Callers pass in timestamps and seeds. This keeps the engine
   deterministic and fully testable.
3. **Layer independence.** Targets are computed independently of inventory.
   Inventory allocation is computed independently of timeline. This lets
   each concern be tested in isolation and swapped without cascading
   rewrites.

## How to add a new citable number

1. Add the constant to `constants/science.ts`.
2. JSDoc it with the paper reference (author, year, journal). If the value
   is a composite, cite each contributing source.
3. Export it.
4. Import it from `@/lib/fueling/constants/science` wherever it is used.
   Never reproduce the literal value elsewhere.

If the number comes from a judgment call rather than a paper, still put it
here and say so in the JSDoc — keeping every number in one audited file is
the point.

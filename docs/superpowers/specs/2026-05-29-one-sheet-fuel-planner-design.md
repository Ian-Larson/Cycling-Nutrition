# One-Sheet Fuel Planner Design

Date: 2026-05-29
Status: Approved design direction

## Goal

Simplify Fuel Plan from a stepped workflow into one continuous planning sheet. The planner should answer two practical questions quickly:

1. What do I pack?
2. How much carbohydrate should I consume every 30 minutes?

The rider should not have to open several cards, advance through setup steps, or press a separate build button once the required inputs are present.

## Product Principles

- Optimize for the common ride-planning path: duration plus projected IF.
- Preserve rider control without making manual mode the default mental model.
- Use defaults aggressively: last/default bottles, drink mix, solids, and rider preference should prefill the plan.
- Show packing instructions first, not dashboard-style statistics.
- Remove fake precision from ride cues. The primary cue is a simple grams-per-30-minutes target.
- Keep advanced metrics available, but secondary.

## Primary Flow

The page becomes a single sheet with three sections in order: Ride, Carry, Plan.

### Ride

The first row focuses on the user's most common use case:

- Duration
- Projected IF
- Weather
- Carbs/hour

Duration and projected IF are primary inputs. Weather is a compact selector because it affects fluid and sodium. Carbs/hour is automatically pre-entered from the app recommendation while respecting the rider's saved default/preference. The value remains editable inline.

When the rider edits carbs/hour, the field should indicate that the value is custom and offer a reset action back to the current recommendation. Changing duration or IF should keep a custom value unless the rider resets it.

Manual duration plus g/h entry remains possible through the same fields, not through a separate first-class mode switch.

### Carry

Bottles, drink mix, and solids are prefilled from the last/default setup.

This section should be compact, with one row per decision:

- Bottles: summary of selected bottle counts
- Drink mix: selected mix
- Solids: selected allowed solids

Rows expand inline, or reveal a concise control, only when the rider changes that setup. The default state should read like a confirmation sheet, not a form to complete.

Fuel inventory and saved plans become supporting drawers/secondary panels. They should not visually compete with the main planning sheet.

### Plan

The plan updates live once all required inputs are available:

- rider weight is known
- duration is valid
- projected IF is valid, or equivalent ride demand inputs are valid
- at least one bottle is selected
- a drink mix is selected

There is no Build Plan button in the normal path. The result should appear and update as inputs change. If a result is unavailable, the sheet shows the missing requirement inline near the relevant control.

The first plan content is the pack list:

- bottle prep
- solids to bring
- refill or capacity warnings when needed

The ride cue is simplified to a single recurring target, for example:

- Every 30 min: 38 g carbs

The app should not generate detailed timeline instructions by default. It should not imply precision beyond what the rider needs on the bike.

### Details

Hydration, sodium, concentration, TSS, derived IF/duration, and similar values move into a collapsed Details section below the practical plan.

Details are useful for trust and debugging, but they are not primary output.

## UX Changes From Current Planner

Remove the Setup / Ride data / Plan accordion model.

Remove the Bring / Ride cues / Targets result tabs.

Remove the separate Build Plan action once required inputs exist.

Remove the granular ride-cue timeline from the primary interface.

Reduce card count. Use a continuous sheet with dividers and compact rows. Cards are reserved for true supporting drawers, dialogs, or saved-plan items.

Keep plan saving, but place it after the ready-to-use plan as a secondary action. The user should be able to use the plan without naming or saving it.

## Interaction Details

Live calculation should debounce only if needed for rendering smoothness. The calculation itself is local and should feel immediate.

Missing requirements should be direct and local:

- Missing weight: show the quick weight row in the Ride section.
- Missing bottles: highlight the Bottles row in Carry.
- Missing drink mix: highlight the Drink mix row in Carry.
- Invalid IF/duration: show validation beside the field.

When a live update changes the plan, avoid disruptive scrolling. The page should feel stable while values update.

When a rider reuses a saved plan, load its setup into the one-sheet inputs and let the live result regenerate from those values.

## Data Behavior

Persist the sheet draft as the user edits, as the current planner already does.

Track whether carbs/hour is recommended or custom. A custom value should survive input edits until reset.

Use last/default setup for Carry prefill. If no last setup exists, fall back to the first available drink mix and available solids, while still requiring at least one bottle.

## Testing Plan

- Unit test carb target recommendation versus custom override behavior.
- Unit test grams-per-30-minutes formatting and rounding.
- Integration test that a valid default setup produces a plan without pressing Build Plan.
- Integration test missing weight, missing bottle, and missing drink mix states.
- Regression test saved-plan reuse loads the sheet and regenerates the live result.
- Responsive test mobile sheet density: Ride, Carry, and Plan should be usable without nested card overload.

## Non-Goals

- No new nutrition engine behavior beyond simplifying output presentation.
- No full inventory redesign.
- No detailed timeline builder in the primary planner.
- No additional dashboard metrics above the pack list.

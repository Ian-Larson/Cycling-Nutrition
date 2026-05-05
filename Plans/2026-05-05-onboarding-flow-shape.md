# Onboarding Flow Shape

Date: 2026-05-05
Status: Confirmed shape brief
Register: Product UI

## Feature Summary

Domestique needs a short first-run onboarding flow that gets a rider set up and produces a usable fuel plan in one sitting. The flow should respect experienced cyclists by avoiding nutrition lectures and long tours while still guiding mixed-experience users through the few details needed for trustworthy numbers.

The onboarding should recommend sign-in and Strava sync because they make Domestique more useful, but neither should block the rider from reaching the first fuel plan.

## Primary User Action

Create and use a first fuel plan by entering enough account, rider, ride, and bottle context for Domestique to produce bottle-by-bottle guidance.

## Design Direction

Color strategy: Restrained.

Use the existing warm shell surfaces, cool ink text, and brand orange only for the current step, primary actions, selected controls, and focus states.

Theme scene: an experienced cyclist is standing at the kitchen counter before a weekend ride, phone in hand, bottles nearby, wanting the plan in under two minutes.

Anchor references:
- Intervals.icu for data respect and cyclist fluency.
- Linear for low-friction progression and calm task flow.
- Apple Health setup for concise, step-by-step collection without feeling childish.

## Scope

Fidelity: implementation-ready shape brief.

Breadth: one 3-5 step first-run flow.

Interactivity: real form inputs, skip/back controls, progress indication, optional sign-in and Strava actions, and a final generated plan.

Time intent: a fast first version polished enough to ship.

## Flow

### Step 1: Welcome

Purpose: orient the rider without selling.

Content:
- Title: Set up Domestique
- Supporting copy: A few ride and rider details let Domestique build your first fuel plan.
- Time estimate: About 2 minutes
- Primary action: Start setup
- Secondary action: Skip for now

Avoid feature tours, marketing claims, oversized hero treatment, and broad explanations.

### Step 2: Connect

Purpose: encourage account and Strava setup without blocking time to value.

Content:
- Title: Keep plans and rides connected
- Supporting copy: Sync keeps rides and plans backed up. Strava can prefill future ride details.
- Primary action: Sign in
- Secondary action: Connect Strava
- Escape hatch: Do this later

Behavior:
- Signing in should keep the rider in onboarding afterward.
- Connecting Strava should be framed as useful for future ride context, not required for the first plan.
- If skipped, continue directly to rider defaults.

### Step 3: Rider Defaults

Purpose: establish calculation defaults.

Fields:
- Weight
- Typical carb target style: Conservative, Standard, Aggressive
- Sweat tendency: Light, Average, Heavy

Experienced-rider behavior:
- Presets speed input, but direct numeric editing should remain available where useful.
- Copy should assume the rider understands the broad concepts.

### Step 4: First Ride

Purpose: collect the minimum ride context needed for an actual plan.

Fields:
- Duration
- Intensity
- Heat or conditions

This step should feel like setting a calculator, not completing a profile.

### Step 5: Bottles & Plan

Purpose: connect the plan to what the rider can actually carry, then deliver the aha moment.

Inputs:
- Bottle count and sizes
- Available drink mix or fuel inventory shortcut if already supported
- Plain water allowed toggle

Generated result:
- Carb/hour target
- Total carbs
- Fluid target
- Bottle-by-bottle allocation
- First timed instruction

Primary completion action: Use this plan.

Behavior:
- If the rider is signed in, using the plan can persist through cloud sync.
- If not signed in, using the plan should still save locally.
- Completion should be understated, such as a small Plan ready status. No celebratory animation beyond a modest state confirmation.

## Layout Strategy

Use a mobile-first single-column flow with one focused task per step. Keep the primary action near the bottom on small screens so the rider can progress quickly while holding a phone.

On desktop, use a narrow main column with an optional right-side plan preview rail that gradually fills as the rider enters details. The preview should make progress feel tangible without turning the flow into a dashboard.

Use familiar primitives:
- Segmented controls for carb target style, sweat tendency, intensity, and heat.
- Steppers for bottle counts.
- Numeric inputs for weight and duration.
- Toggles for optional preferences.
- Existing Button, Card, Input, Select, Stepper, Toggle, Badge, and Alert primitives where possible.

## Key States

Default: clear step title, one focused task, and progress such as 2 of 5.

Skip: lands in the app with contextual empty states instead of a dead end.

Back: preserves all entered values.

Validation: inline and specific. Prefer Enter ride duration over generic invalid-field copy.

Loading: show a brief calculating state or skeleton in the final plan area.

Success: show the first plan immediately with Use this plan as the completion action.

Returning user: onboarding should not repeat after completion unless reopened from Account.

Auth unavailable: keep the account recommendation visible but allow Do this later.

Strava unavailable or denied: explain briefly and continue the flow.

## Interaction Model

The rider can start, skip, go back, or continue through each step. Each step should preserve entered data immediately so accidental navigation does not lose progress.

Primary actions should advance the flow. Optional account and Strava actions should return the rider to the same onboarding context after completion or cancellation.

The final Use this plan action should commit the generated plan as the active plan. Saving can happen locally for signed-out riders and through sync for signed-in riders.

## Content Requirements

Use concise, concrete copy:
- Set up Domestique
- Build your first fuel plan
- Keep plans and rides connected
- Your rider defaults
- First ride
- Bottle setup
- Plan ready
- Use this plan
- Do this later

Avoid:
- Unlock your potential
- Personalize your journey
- Long explanations of carbs or hydration
- Copy that repeats visible labels

## Implementation Notes

Track completion and dismissals so the flow is not shown repeatedly.

Recommended persistence:
- onboarding completed
- onboarding skipped
- account step dismissed
- Strava step dismissed

Recommended entry points:
- First launch for new local users.
- Account page replay entry.
- Contextual prompt from Fuel Plan empty state if onboarding was skipped.

## Open Questions

Should the Connect step show both Sign in and Connect Strava at once, or should Strava appear only after sign-in is complete?

Should onboarding completion be tied to Use this plan only, or should skipping also mark the full flow as dismissed?

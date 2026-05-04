# Performance Tracking

**Status:** Draft, awaiting user review
**Author:** Claude (paired with Ian)
**Date:** 2026-05-04

## Goal

Give the rider a single page that answers "am I getting stronger?" in five seconds. The page surfaces w/kg trend, FTP and weight history, three power records, and a power-profile hexagon comparing two periods. Power data syncs from Strava activities; FTP and weight are user-entered over time.

## Non-goals

- No training-load modeling (CTL/ATL/TSB). That is a separate job and would change the page's center of gravity.
- No FIT-file upload as a power source in this version. The existing Power Meter Analyzer stays a one-shot tool; persisting its uploads is a future option.
- No automatic FTP detection from Strava's estimate. Too noisy.
- No per-bike performance breakdown.
- No public profile or sharing.

## Job

> "Am I getting stronger?"

The rider lands on the page, scans, and gets a confident answer in seconds. Secondary affordances (period comparison, time-range toggles) are there for the curious but never required.

## Page composition

Top-to-bottom on `/performance`:

| Region | Content |
|---|---|
| Hero strip | Current `w/kg at FTP` as a large numeral. Delta vs. 90 days ago (e.g., `↑ +0.2 since Feb`). Current FTP and weight as small subtext. |
| Trend trio chart | Single chart, three overlaid lines: w/kg, FTP (watts), weight (kg). Marker dots where the rider logged a new FTP or weight value. Range toggle: 3mo / 6mo / 12mo / all. Default 12mo. |
| PR tiles | Three tiles: best 5-min, 20-min, 1-hour power. Each tile shows w/kg, raw watts, date achieved, and ride name. |
| Power Profile hexagon | Six-axis radar in **w/kg** at durations `5s, 30s, 1min, 5min, 20min, 1hr`. Two polygons overlaid via preset selector: "This year vs. last year" / "Last 90d vs. previous 90d" / "Last 30d vs. all-time best". Period semantics: calendar year for "this year / last year"; trailing windows (`now-90d` and `now-180d..now-90d`) for the rolling presets; "all-time best" is the single best at each duration across every activity ever synced, regardless of when achieved. |

Empty / partial states are spelled out under [Empty and edge states](#empty-and-edge-states).

## Data model

Three new persisted shapes. All follow Domestique's local-first + Supabase mirror pattern (same as gear, fuel plans).

### `activities`

One row per synced Strava ride.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Strava activity id, used as primary key. |
| `started_at` | ISO timestamp | Ride start. |
| `duration_s` | number | Moving time in seconds. |
| `distance_m` | number | Distance in meters. |
| `avg_watts` | number \| null | Activity average power. Null if no power meter. |
| `np_watts` | number \| null | Normalized power. |
| `max_watts` | number \| null | Peak instantaneous power. |
| `kj` | number \| null | Total work. |
| `mean_max_curve` | `number[]` \| null | Best power for each second from 1s to `duration_s`. Null if no power data. |
| `bike_id` | string \| null | FK to a gear bike if the rider has one mapped. |
| `name` | string | Strava activity title. |
| `source` | `'strava'` | Reserved for future sources (e.g., `'fit-upload'`). |

The `mean_max_curve` is computed once on ingest from the Strava power stream and persisted. The raw stream is discarded.

### `ftp_history`

Append-only log.

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID. |
| `recorded_at` | ISO date | When this FTP started applying. |
| `ftp_watts` | number | Positive integer. |
| `note` | string \| null | Optional, e.g., "post-test ride". |

### `weight_history`

Append-only log, mirrors FTP.

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID. |
| `recorded_at` | ISO date | When this weight applied. |
| `weight_kg` | number | Positive number. |
| `note` | string \| null | Optional. |

### Relationship to existing `athleteProfile`

`athleteProfile.ftpWatts` and `athleteProfile.weightKg` (in `src/store/index.ts`) stay as the "current" pointers. When the rider edits either field through Account, the store also appends to the matching history table with `recorded_at = now`. Reading the current value still reads the profile field; reading history reads the table.

## Derived metrics

Nothing is precomputed beyond `mean_max_curve`. All derived numbers are computed on render.

- **Current w/kg** = `athleteProfile.ftpWatts / athleteProfile.weightKg`. If either is missing or non-positive, the hero shows a "Log your FTP and weight" affordance instead of a number.
- **Power record at duration *d* over period *P*** = `max(activity.mean_max_curve[d-1])` across activities whose `started_at` falls within *P*. Date and ride name come from the winning activity.
- **W/kg at duration *d* over period *P*** = power-record-watts divided by the **closest-prior** `weight_history` entry to the winning activity's `started_at` (falls back to `athleteProfile.weightKg` if no history exists).
- **W/kg trend point on date *t*** = (FTP value at *t*) / (weight value at *t*), each found via closest-prior history lookup.

The closest-prior fallback is the only non-trivial rule. It is unit-tested.

## Strava activity sync

### Scopes

The current Strava connection requests scopes via `getRequestedStravaScopes()` for gear. The performance feature adds:

- `activity:read` — public activities
- `activity:read_all` — private activities (so private rides are not silently missing)

A connected rider with the older scope set is prompted to re-authorize before activity sync runs. The bikes-only sync continues to work with whichever scopes are present.

### Edge function

A new Supabase edge function `strava-activities-sync` sits alongside `strava-token-exchange` and `strava-disconnect`. Inputs: `{ since?: ISO, max?: number }`. Returns paginated activity batches plus per-activity power streams. The function:

1. Calls Strava `/athlete/activities` with `after = since`, paginating until `max` reached or no more results.
2. For each activity with a power stream available, calls `/activities/{id}/streams` to fetch the watts stream.
3. Computes the mean-max curve server-side (pure function, no state) and returns it inline. Raw streams are not returned to the client.
4. Honors Strava rate limits: pauses and surfaces a `rate_limited_until` timestamp when the 100-per-15-min or 1000-per-day quota is hit.

### Backfill UX

On first connect with the new scope, the page asks: "Import the last [90 days / 6 months / 1 year / all] of rides?" Default is 90 days. While syncing, the page shows progress: "Syncing 17 of 142 rides…" with a cancel button. If rate-limited mid-backfill, the UI says "Strava paused us — resuming at 4:32pm" and resumes automatically.

### Ongoing sync

- Manual: a "Sync rides" button on `/performance`.
- Automatic: triggered on app open if `last_synced_at` is older than 24 hours.
- Both call the same edge function with `since = last_synced_at`.

### Storage hygiene

Only the activity row + mean-max curve is persisted. Streams are processed and discarded on the edge. A 4-hour ride's curve is 14,400 integer power values; stored as a packed integer array (Int16 is sufficient — peak human power well under 32,767 W), expecting roughly **30-60 KB per ride** uncompressed.

## Empty and edge states

| Condition | Page behavior |
|---|---|
| No Strava connection | Hero, trend chart, PR tiles, and radar all empty. Single CTA: "Connect Strava to track power." |
| Strava connected, zero activities | "Pull your first ride" CTA. Trend chart still works if FTP/weight history exists. |
| No FTP or weight history | Trend chart shows hint: "Log your FTP and weight to see your w/kg trend." Hero still shows current w/kg if both fields are populated, with no delta. |
| Some history but radar period has no rides | That polygon is faded with caption "Not enough data in [period] yet." Other polygon still draws. |
| Activity has no power meter | Excluded from PR tiles and radar computation. Counted in activity totals if we expose those (we don't, in v1). |
| Older Strava scope, missing `activity:read` | Sync surface shows "Reconnect Strava to import rides" with a one-click reauth flow. |

## Phasing

Three implementation phases, each independently shippable.

### Phase α — Foundations (no Strava)

- New tables `ftp_history`, `weight_history` (Supabase + local-first store, including append-on-edit logic in `updateAthleteProfile`).
- New page `/performance` with Hero strip + Trend trio chart only.
- Range toggle on the chart.
- Account-side affordance to view/edit FTP and weight history (so the rider can fix typos).

Ship value: rider can log FTP/weight changes manually and watch their w/kg trend. No Strava dependency.

### Phase β — Strava activity sync

- Extend Strava OAuth scopes; add reauth prompt for existing connections.
- New edge function `strava-activities-sync` with rate-limit + resume behavior.
- New table `activities`; new local store slice mirroring it.
- Backfill UI + ongoing sync triggers.
- A lightweight "Recent rides" list at the bottom of `/performance` (last 10 rides: date, name, duration, NP) so the synced data is visible before phase γ consumes it. **Not** a full ride-detail page.

Ship value: Strava rides land in Domestique with mean-max curves ready for derivation.

### Phase γ — Records and profile

- PR tiles (5min / 20min / 1hr).
- Power Profile hexagon (six axes, w/kg, three preset comparisons).
- Empty/partial state polish.

Ship value: the page becomes the design above.

## Routing and navigation

- New route `/performance`. Lowercase, sits in the main nav alongside `/history` and `/gear`.
- The page intro line should declare its job in one sentence (consistent with `<PageIntro>` usage on other pages).

## Testing plan

| Area | Tests |
|---|---|
| Mean-max curve computation | Pure-function unit tests with fixture power streams. Edge cases: short rides, gaps in stream, all-zero stream. |
| Closest-prior history lookup | Unit tests: empty history, single entry, dense entries, query before first entry. |
| Period preset → date range | Unit tests for "this year vs. last year", "last 90d vs. previous 90d", "last 30d vs. all-time best", including year-rollover edges. |
| Strava activity sync | Integration tests with fixture API responses: happy path, pagination, rate-limit pause + resume, missing-power activity, scope-missing reauth path. |
| Empty / edge states | Component tests rendering each row of the table above. |
| W/kg derivation with sparse weight history | Unit tests: ride with weight entry on the same day, ride before any weight entry (uses profile fallback), ride between entries. |
| Trend trio chart | Snapshot test of three-line composition with sample history, plus interaction tests for the range toggle. |

## Open questions

None blocking. A few worth revisiting after Phase α ships:

- Whether to expose all six radar durations or let the user toggle which six (e.g., swap 30s for 90min for endurance riders).
- Whether to surface a fourth PR tile (best 1-min) given that the radar already shows it.
- Whether the trend trio should normalize the three axes (today they share a y-axis space; for 1.0 we draw three independent y-axes or normalize to "% change from start of range").

These are visual refinements; the data model supports them all without change.

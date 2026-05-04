# Performance Tracking — Phase γ (Records + Power Profile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface three power-record tiles (best 5min / 20min / 1hr) and a six-axis Power Profile hexagon comparing two periods on `/performance`. Data comes from the activity `mean_max_curve` blobs Phase β persists. This is the final phase of the original Performance Tracking design.

**Architecture:** Records and the radar consume mean-max curves stored as Postgres `bytea`. A new `decodeBytea` + `unpackCurveInt16` pipeline reconstitutes `number[]` curves from the database. A pure record-computation library takes activities + curves + a date range and returns the best-power-at-duration with the rider's weight at the time of that activity. A new `usePerformanceRecords` hook orchestrates the pipeline. PR tiles and the radar SVG are pure-presentation components composed onto the page above the Recent rides list.

**Tech Stack:** React 19 + TypeScript + Vite + Zustand + Tailwind + Supabase + Vitest + Testing Library. Hand-rolled SVG for the radar (matching `TrendTrioChart`).

**Spec:** `docs/superpowers/specs/2026-05-04-performance-tracking-design.md`

**Out of scope:** training-load metrics (CTL/ATL/TSB), ride-detail page, sharing/public profile, FIT-file upload as a power source, custom date ranges (only the three presets), expanded radar axes (sticking to the canonical 6).

---

## File structure (after the change)

**Created**
- `src/lib/performance/bytea.ts` + test — hex `\x...` string → `Uint8Array` decode
- `src/lib/performance/period.ts` + test — preset → `{ fromIso, toIso }` resolver
- `src/lib/performance/records.ts` + test — pure best-for-duration computation
- `src/lib/performance/curves.ts` + test — `listActivitiesWithCurvesInRange` (Supabase wrapper that decodes curves)
- `src/hooks/use-performance-records.ts` + test — orchestrates curves + records for current / comparison periods
- `src/components/performance/pr-tile.tsx` + test — single power-record tile
- `src/components/performance/pr-tiles.tsx` — composes three tiles
- `src/components/performance/power-profile-hexagon.tsx` + test — six-axis SVG radar with two overlaid polygons
- `src/components/performance/period-preset-selector.tsx` + test — three-preset segmented control

**Modified**
- `src/lib/performance/activities.ts` — re-export the new curve fetcher; expose helpers for the records hook
- `src/types/activity.ts` — add `ActivityWithCurve` interface
- `src/pages/performance.tsx` — mount PR tiles + radar selector + radar above the existing Recent rides list

---

## Conventions used throughout

- **Test runner:** Vitest. Single-file: `npx vitest run path/to/file.test.ts`.
- **TDD beat:** failing test → run → fail → minimal code → run → pass → commit.
- **Commits:** Conventional Commits. Co-Authored-By trailer added by Claude Code automatically — do not write it manually.
- **Imports:** `@/...` alias to `src/`.
- **Curves indexing:** `curve[d-1]` is the best mean-max watts for `d` seconds. So 5s → `curve[4]`, 1min → `curve[59]`, 5min → `curve[299]`, 20min → `curve[1199]`, 1hr → `curve[3599]`.

---

## Task γ-1: Bytea decode helper

**Files:**
- Create: `src/lib/performance/bytea.ts`
- Create: `src/lib/performance/bytea.test.ts`

Postgres returns `bytea` columns as a hex string with a `\x` prefix (e.g., `\x0102ff`). The Supabase JS client passes that string through unchanged. We need to decode it back to a `Uint8Array` before piping into `unpackCurveInt16`.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/performance/bytea.test.ts
import { describe, expect, it } from 'vitest';
import { decodeByteaHex } from './bytea';

describe('decodeByteaHex', () => {
  it('decodes the empty string \\x to an empty Uint8Array', () => {
    expect(decodeByteaHex('\\x')).toEqual(new Uint8Array());
  });

  it('decodes a short hex string', () => {
    expect(decodeByteaHex('\\x0102ff')).toEqual(new Uint8Array([1, 2, 255]));
  });

  it('decodes uppercase hex', () => {
    expect(decodeByteaHex('\\xABCD')).toEqual(new Uint8Array([0xab, 0xcd]));
  });

  it('throws on missing \\x prefix', () => {
    expect(() => decodeByteaHex('0102')).toThrow(/prefix/i);
  });

  it('throws on odd-length hex', () => {
    expect(() => decodeByteaHex('\\x012')).toThrow(/length/i);
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/lib/performance/bytea.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/performance/bytea.ts

/**
 * Decodes a Postgres bytea hex string (with the `\x` prefix) into a
 * Uint8Array. Mirror of the edge-side `toByteaHex` encoder used in the
 * activity-sync function.
 */
export function decodeByteaHex(value: string): Uint8Array {
  if (!value.startsWith('\\x')) {
    throw new Error('Bytea hex string must start with \\x prefix');
  }
  const hex = value.slice(2);
  if (hex.length % 2 !== 0) {
    throw new Error('Bytea hex string has odd length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/lib/performance/bytea.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/performance/bytea.ts src/lib/performance/bytea.test.ts
git commit -m "feat(performance): add bytea hex decoder"
```

---

## Task γ-2: Period preset → date range

**Files:**
- Create: `src/lib/performance/period.ts`
- Create: `src/lib/performance/period.test.ts`

Maps each comparison preset to two date ranges (the "current" half and the "comparison" half) the records pipeline can query.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/performance/period.test.ts
import { describe, expect, it } from 'vitest';
import { resolveComparisonPeriods } from './period';

const NOW = new Date('2026-05-04T12:00:00Z');

describe('resolveComparisonPeriods', () => {
  it('this-year-vs-last-year produces two calendar-year windows', () => {
    const { current, comparison } = resolveComparisonPeriods(
      'this-year-vs-last-year',
      NOW
    );
    expect(current.fromIso).toBe('2026-01-01T00:00:00.000Z');
    expect(current.toIso).toBe('2026-05-04T12:00:00.000Z');
    expect(comparison.fromIso).toBe('2025-01-01T00:00:00.000Z');
    expect(comparison.toIso).toBe('2025-12-31T23:59:59.999Z');
  });

  it('last-90d-vs-previous-90d uses trailing windows', () => {
    const { current, comparison } = resolveComparisonPeriods(
      'last-90d-vs-previous-90d',
      NOW
    );
    expect(new Date(current.toIso).getTime()).toBe(NOW.getTime());
    const expectedStart = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);
    expect(current.fromIso).toBe(expectedStart.toISOString());
    expect(new Date(comparison.toIso).getTime()).toBe(expectedStart.getTime());
    const expectedComparisonStart = new Date(
      NOW.getTime() - 180 * 24 * 60 * 60 * 1000
    );
    expect(comparison.fromIso).toBe(expectedComparisonStart.toISOString());
  });

  it('last-30d-vs-all-time-best produces a 30d trailing and an open-ended past window', () => {
    const { current, comparison } = resolveComparisonPeriods(
      'last-30d-vs-all-time-best',
      NOW
    );
    expect(new Date(current.toIso).getTime()).toBe(NOW.getTime());
    const expectedStart = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(current.fromIso).toBe(expectedStart.toISOString());
    // All-time = epoch zero through to NOW.
    expect(comparison.fromIso).toBe(new Date(0).toISOString());
    expect(comparison.toIso).toBe(NOW.toISOString());
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/lib/performance/period.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// src/lib/performance/period.ts

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PeriodPreset =
  | 'this-year-vs-last-year'
  | 'last-90d-vs-previous-90d'
  | 'last-30d-vs-all-time-best';

export interface PeriodRange {
  fromIso: string;
  toIso: string;
  label: string;
}

export interface ComparisonPeriods {
  current: PeriodRange;
  comparison: PeriodRange;
}

export function resolveComparisonPeriods(
  preset: PeriodPreset,
  now: Date = new Date()
): ComparisonPeriods {
  switch (preset) {
    case 'this-year-vs-last-year': {
      const thisYear = now.getUTCFullYear();
      const startThis = new Date(Date.UTC(thisYear, 0, 1));
      const startLast = new Date(Date.UTC(thisYear - 1, 0, 1));
      const endLast = new Date(Date.UTC(thisYear - 1, 11, 31, 23, 59, 59, 999));
      return {
        current: {
          fromIso: startThis.toISOString(),
          toIso: now.toISOString(),
          label: `${thisYear}`,
        },
        comparison: {
          fromIso: startLast.toISOString(),
          toIso: endLast.toISOString(),
          label: `${thisYear - 1}`,
        },
      };
    }
    case 'last-90d-vs-previous-90d': {
      const start90 = new Date(now.getTime() - 90 * MS_PER_DAY);
      const start180 = new Date(now.getTime() - 180 * MS_PER_DAY);
      return {
        current: {
          fromIso: start90.toISOString(),
          toIso: now.toISOString(),
          label: 'Last 90d',
        },
        comparison: {
          fromIso: start180.toISOString(),
          toIso: start90.toISOString(),
          label: 'Previous 90d',
        },
      };
    }
    case 'last-30d-vs-all-time-best': {
      const start30 = new Date(now.getTime() - 30 * MS_PER_DAY);
      return {
        current: {
          fromIso: start30.toISOString(),
          toIso: now.toISOString(),
          label: 'Last 30d',
        },
        comparison: {
          fromIso: new Date(0).toISOString(),
          toIso: now.toISOString(),
          label: 'All-time',
        },
      };
    }
  }
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/lib/performance/period.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/performance/period.ts src/lib/performance/period.test.ts
git commit -m "feat(performance): add period preset resolver"
```

---

## Task γ-3: Best-for-duration record computation

**Files:**
- Create: `src/lib/performance/records.ts`
- Create: `src/lib/performance/records.test.ts`

Pure function: given an array of activities (each with a decoded `curve: number[] | null`) and the rider's weight history, find the best-power-at-duration `d` and return the winning activity's metadata along with its w/kg using the closest-prior weight.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/performance/records.test.ts
import { describe, expect, it } from 'vitest';
import { computeBestForDuration } from './records';
import type { WeightHistoryEntry } from '@/types/performance';

const weight: WeightHistoryEntry[] = [
  { id: 'w1', recordedAt: '2025-01-01', weightKg: 75 },
  { id: 'w2', recordedAt: '2025-09-01', weightKg: 73 },
];

const activities = [
  {
    stravaId: 'a',
    startedAt: '2025-03-01T10:00:00Z',
    name: 'Spring ride',
    durationS: 3700,
    curve: arrayWithBestAt(3700, 1199, 280), // best 20-min = 280W
  },
  {
    stravaId: 'b',
    startedAt: '2025-10-01T10:00:00Z',
    name: 'Autumn ride',
    durationS: 3700,
    curve: arrayWithBestAt(3700, 1199, 295), // best 20-min = 295W
  },
  {
    stravaId: 'c',
    startedAt: '2025-04-01T10:00:00Z',
    name: 'Short ride',
    durationS: 1000, // too short for 20min
    curve: arrayWithBestAt(1000, 999, 400),
  },
];

function arrayWithBestAt(length: number, index: number, value: number): number[] {
  const arr = new Array<number>(length).fill(0);
  arr[index] = value;
  return arr;
}

describe('computeBestForDuration', () => {
  it('returns null when no activity is long enough', () => {
    const result = computeBestForDuration(
      [activities[2]], // only 1000s long
      weight,
      1200 // 20-min
    );
    expect(result).toBeNull();
  });

  it('picks the activity with the highest curve[d-1]', () => {
    const result = computeBestForDuration(activities, weight, 1200);
    expect(result?.stravaId).toBe('b');
    expect(result?.watts).toBe(295);
  });

  it('uses closest-prior weight at the winning activity for w/kg', () => {
    // Activity b is on 2025-10-01 → weight is 73 (from 2025-09-01).
    const result = computeBestForDuration(activities, weight, 1200);
    expect(result?.wkg).toBeCloseTo(295 / 73, 2);
    expect(result?.weightKgAtTime).toBe(73);
  });

  it('returns watts but no wkg when weight history is empty', () => {
    const result = computeBestForDuration(activities, [], 1200);
    expect(result?.watts).toBe(295);
    expect(result?.wkg).toBeUndefined();
  });

  it('skips activities with null curves', () => {
    const result = computeBestForDuration(
      [{ ...activities[0], curve: null }, activities[1]],
      weight,
      1200
    );
    expect(result?.stravaId).toBe('b');
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/lib/performance/records.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/performance/records.ts
import type { WeightHistoryEntry } from '@/types/performance';
import { closestPriorEntry } from './history';

export interface ActivityForRecords {
  stravaId: string;
  startedAt: string;
  name: string;
  durationS: number;
  curve: number[] | null;
}

export interface DurationRecord {
  stravaId: string;
  name: string;
  startedAt: string;
  durationSeconds: number;
  watts: number;
  wkg?: number;
  weightKgAtTime?: number;
}

/**
 * Returns the best-mean-max-watts at duration `durationSeconds` across
 * `activities`, with the w/kg derived from the closest-prior weight to
 * that activity's `started_at`. Returns null when no activity is long
 * enough or has a curve.
 */
export function computeBestForDuration(
  activities: readonly ActivityForRecords[],
  weightHistory: readonly WeightHistoryEntry[],
  durationSeconds: number
): DurationRecord | null {
  let best: { activity: ActivityForRecords; watts: number } | null = null;
  for (const a of activities) {
    if (!a.curve) continue;
    if (a.curve.length < durationSeconds) continue;
    const watts = a.curve[durationSeconds - 1];
    if (!Number.isFinite(watts) || watts <= 0) continue;
    if (!best || watts > best.watts) best = { activity: a, watts };
  }
  if (!best) return null;

  const weightEntry = closestPriorEntry(weightHistory, best.activity.startedAt);
  const weightKg = weightEntry?.weightKg;
  return {
    stravaId: best.activity.stravaId,
    name: best.activity.name,
    startedAt: best.activity.startedAt,
    durationSeconds,
    watts: best.watts,
    wkg: weightKg && weightKg > 0 ? best.watts / weightKg : undefined,
    weightKgAtTime: weightKg,
  };
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/lib/performance/records.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/performance/records.ts src/lib/performance/records.test.ts
git commit -m "feat(performance): add best-for-duration record computation"
```

---

## Task γ-4: Activities-with-curves Supabase wrapper

**Files:**
- Create: `src/lib/performance/curves.ts`
- Create: `src/lib/performance/curves.test.ts`
- Modify: `src/types/activity.ts`

Returns the activity rows in a date range, with the bytea `mean_max_curve` decoded to `number[]`. Used by the records hook (γ-5). Separate from `listRecentActivities` because curves are heavy (28KB per 4hr ride) — only fetch when needed.

- [ ] **Step 1: Add the `ActivityWithCurve` interface to `src/types/activity.ts`**

Append:

```typescript
export interface ActivityWithCurve {
  stravaId: string;
  startedAt: string;
  durationS: number;
  name: string;
  curve: number[] | null;
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// src/lib/performance/curves.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listActivitiesWithCurvesInRange } from './curves';

function makeMockSupabase(rows: unknown[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(builder),
  } as unknown as SupabaseClient;
}

describe('listActivitiesWithCurvesInRange', () => {
  it('decodes mean_max_curve from bytea hex into number[]', async () => {
    // Curve = [100, 200] → packed as Int16 LE → bytes 64 00 c8 00 → hex 6400c800
    const supabase = makeMockSupabase([
      {
        strava_id: 'a',
        started_at: '2025-06-01T10:00:00Z',
        duration_s: 3600,
        name: 'r',
        mean_max_curve: '\\x6400c800',
      },
    ]);
    const result = await listActivitiesWithCurvesInRange(
      supabase,
      '2025-01-01T00:00:00.000Z',
      '2025-12-31T23:59:59.999Z'
    );
    expect(result).toHaveLength(1);
    expect(result[0].curve).toEqual([100, 200]);
  });

  it('returns null curve when mean_max_curve is null', async () => {
    const supabase = makeMockSupabase([
      {
        strava_id: 'a',
        started_at: '2025-06-01T10:00:00Z',
        duration_s: 3600,
        name: 'r',
        mean_max_curve: null,
      },
    ]);
    const result = await listActivitiesWithCurvesInRange(
      supabase,
      '2025-01-01T00:00:00.000Z',
      '2025-12-31T23:59:59.999Z'
    );
    expect(result[0].curve).toBeNull();
  });

  it('returns empty array on no rows', async () => {
    const supabase = makeMockSupabase([]);
    const result = await listActivitiesWithCurvesInRange(
      supabase,
      '2025-01-01T00:00:00.000Z',
      '2025-12-31T23:59:59.999Z'
    );
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 3: Run, see fail**

Run: `npx vitest run src/lib/performance/curves.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement**

```typescript
// src/lib/performance/curves.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityWithCurve } from '@/types/activity';
import { decodeByteaHex } from './bytea';
import { unpackCurveInt16 } from './mean-max-curve';

interface CurveRow {
  strava_id: string;
  started_at: string;
  duration_s: number;
  name: string;
  mean_max_curve: string | null;
}

export async function listActivitiesWithCurvesInRange(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string
): Promise<ActivityWithCurve[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('strava_id, started_at, duration_s, name, mean_max_curve')
    .gte('started_at', fromIso)
    .lte('started_at', toIso)
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as CurveRow[] | null) ?? []).map((row) => ({
    stravaId: row.strava_id,
    startedAt: row.started_at,
    durationS: row.duration_s,
    name: row.name,
    curve: row.mean_max_curve === null
      ? null
      : unpackCurveInt16(decodeByteaHex(row.mean_max_curve)),
  }));
}
```

- [ ] **Step 5: Run, see pass**

Run: `npx vitest run src/lib/performance/curves.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/performance/curves.ts src/lib/performance/curves.test.ts src/types/activity.ts
git commit -m "feat(performance): add activities-with-curves range fetcher"
```

---

## Task γ-5: `usePerformanceRecords` hook

**Files:**
- Create: `src/hooks/use-performance-records.ts`
- Create: `src/hooks/use-performance-records.test.ts`

Orchestrates the pipeline: take a `PeriodPreset`, resolve to two date ranges, fetch curves for each, compute the three PR records (5min / 20min / 1hr) for the **current** period, and compute six radar values (5s / 30s / 1min / 5min / 20min / 1hr in w/kg) for both periods. Returns everything render-ready.

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/use-performance-records.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePerformanceRecords } from './use-performance-records';
import * as curvesLib from '@/lib/performance/curves';
import { useStore } from '@/store';

vi.mock('@/lib/performance/curves');
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({}),
}));

function curveWith(values: Record<number, number>, length = 4000): number[] {
  const arr = new Array(length).fill(0);
  for (const [i, v] of Object.entries(values)) arr[Number(i)] = v;
  return arr;
}

describe('usePerformanceRecords', () => {
  beforeEach(() => {
    useStore.setState({ weightHistory: [], ftpHistory: [] });
    vi.mocked(curvesLib.listActivitiesWithCurvesInRange).mockReset();
  });

  it('returns null while loading and populates after fetch', async () => {
    useStore.setState({
      weightHistory: [{ id: 'w1', recordedAt: '2025-01-01', weightKg: 75 }],
    });
    vi.mocked(curvesLib.listActivitiesWithCurvesInRange).mockResolvedValue([
      {
        stravaId: 'a',
        startedAt: '2025-06-01T10:00:00Z',
        durationS: 4000,
        name: 'r',
        curve: curveWith({ 1199: 280 }), // 20-min PR = 280W
      },
    ]);

    const { result } = renderHook(() =>
      usePerformanceRecords('last-90d-vs-previous-90d')
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const twentyMin = result.current.tiles.find((t) => t.durationSeconds === 1200);
    expect(twentyMin?.record?.watts).toBe(280);
    expect(twentyMin?.record?.wkg).toBeCloseTo(280 / 75, 2);
  });

  it('produces a wkg radar value per axis for both periods', async () => {
    useStore.setState({
      weightHistory: [{ id: 'w1', recordedAt: '2025-01-01', weightKg: 70 }],
    });
    vi.mocked(curvesLib.listActivitiesWithCurvesInRange).mockResolvedValue([
      {
        stravaId: 'a',
        startedAt: '2025-06-01T10:00:00Z',
        durationS: 4000,
        name: 'r',
        curve: curveWith({ 4: 700, 29: 600, 59: 500, 299: 400, 1199: 300, 3599: 250 }),
      },
    ]);
    const { result } = renderHook(() =>
      usePerformanceRecords('last-90d-vs-previous-90d')
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.radar.current).toHaveLength(6);
    expect(result.current.radar.comparison).toHaveLength(6);
    const fiveS = result.current.radar.current.find((p) => p.durationSeconds === 5);
    expect(fiveS?.wkg).toBeCloseTo(700 / 70, 2);
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/hooks/use-performance-records.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// src/hooks/use-performance-records.ts
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { listActivitiesWithCurvesInRange } from '@/lib/performance/curves';
import {
  resolveComparisonPeriods,
  type PeriodPreset,
  type PeriodRange,
} from '@/lib/performance/period';
import {
  computeBestForDuration,
  type DurationRecord,
} from '@/lib/performance/records';
import { useStore } from '@/store';

export const PR_TILE_DURATIONS: readonly number[] = [300, 1200, 3600];
export const RADAR_DURATIONS: readonly number[] = [5, 30, 60, 300, 1200, 3600];

export interface PrTile {
  durationSeconds: number;
  record: DurationRecord | null;
}

export interface RadarPoint {
  durationSeconds: number;
  wkg: number | null;
}

export interface RadarData {
  current: RadarPoint[];
  comparison: RadarPoint[];
  currentLabel: string;
  comparisonLabel: string;
}

export interface UsePerformanceRecordsResult {
  isLoading: boolean;
  error: string | null;
  tiles: PrTile[];
  radar: RadarData;
  currentPeriod: PeriodRange;
  comparisonPeriod: PeriodRange;
}

const EMPTY_RADAR: RadarPoint[] = RADAR_DURATIONS.map((d) => ({
  durationSeconds: d,
  wkg: null,
}));

export function usePerformanceRecords(
  preset: PeriodPreset
): UsePerformanceRecordsResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const weightHistory = useStore((s) => s.weightHistory);
  const periods = useMemo(() => resolveComparisonPeriods(preset), [preset]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<PrTile[]>(
    PR_TILE_DURATIONS.map((d) => ({ durationSeconds: d, record: null }))
  );
  const [radar, setRadar] = useState<RadarData>({
    current: EMPTY_RADAR,
    comparison: EMPTY_RADAR,
    currentLabel: periods.current.label,
    comparisonLabel: periods.comparison.label,
  });

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      listActivitiesWithCurvesInRange(supabase, periods.current.fromIso, periods.current.toIso),
      listActivitiesWithCurvesInRange(supabase, periods.comparison.fromIso, periods.comparison.toIso),
    ])
      .then(([currentActs, comparisonActs]) => {
        if (cancelled) return;
        const nextTiles: PrTile[] = PR_TILE_DURATIONS.map((d) => ({
          durationSeconds: d,
          record: computeBestForDuration(currentActs, weightHistory, d),
        }));
        const radarFor = (acts: typeof currentActs): RadarPoint[] =>
          RADAR_DURATIONS.map((d) => {
            const r = computeBestForDuration(acts, weightHistory, d);
            return { durationSeconds: d, wkg: r?.wkg ?? null };
          });
        setTiles(nextTiles);
        setRadar({
          current: radarFor(currentActs),
          comparison: radarFor(comparisonActs),
          currentLabel: periods.current.label,
          comparisonLabel: periods.comparison.label,
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load records');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, periods, weightHistory]);

  return {
    isLoading,
    error,
    tiles,
    radar,
    currentPeriod: periods.current,
    comparisonPeriod: periods.comparison,
  };
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/hooks/use-performance-records.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-performance-records.ts src/hooks/use-performance-records.test.ts
git commit -m "feat(performance): add usePerformanceRecords hook"
```

---

## Task γ-6: PR tile component

**Files:**
- Create: `src/components/performance/pr-tile.tsx`
- Create: `src/components/performance/pr-tile.test.tsx`

Renders one tile for one duration. Shows w/kg + watts + ride name + date when a record exists; "—" placeholder when not.

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/pr-tile.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrTile } from './pr-tile';

describe('PrTile', () => {
  it('renders the duration label and dashes when no record', () => {
    render(
      <PrTile
        label="20 min"
        record={null}
      />
    );
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders w/kg and watts when record present', () => {
    render(
      <PrTile
        label="20 min"
        record={{
          stravaId: 'r1',
          name: 'Big effort',
          startedAt: '2025-06-01T10:00:00Z',
          durationSeconds: 1200,
          watts: 295,
          wkg: 4.1,
        }}
      />
    );
    expect(screen.getByText('4.1')).toBeInTheDocument();
    expect(screen.getByText(/295\s*W/)).toBeInTheDocument();
    expect(screen.getByText('Big effort')).toBeInTheDocument();
  });

  it('omits the wkg numeral when wkg is undefined', () => {
    render(
      <PrTile
        label="20 min"
        record={{
          stravaId: 'r1',
          name: 'Big effort',
          startedAt: '2025-06-01T10:00:00Z',
          durationSeconds: 1200,
          watts: 295,
        }}
      />
    );
    expect(screen.queryByText(/\d+\.\d+/)).not.toBeInTheDocument();
    expect(screen.getByText(/295\s*W/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/components/performance/pr-tile.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/performance/pr-tile.tsx
import type { DurationRecord } from '@/lib/performance/records';

interface PrTileProps {
  label: string;
  record: DurationRecord | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PrTile({ label, record }: PrTileProps) {
  return (
    <div className="rounded-md border border-ink-200 bg-shell-50 p-4">
      <div className="text-xs uppercase tracking-wider text-ink-500">{label}</div>
      {record ? (
        <>
          {typeof record.wkg === 'number' && (
            <div className="font-display text-3xl font-bold tabular-nums leading-none text-ink-900 mt-2">
              {record.wkg.toFixed(1)}
            </div>
          )}
          <div className="text-sm text-ink-700 tabular-nums mt-1">
            {record.watts} W
          </div>
          <div className="text-xs text-ink-500 truncate mt-2">
            {record.name}
          </div>
          <div className="text-xs text-ink-500">
            {formatDate(record.startedAt)}
          </div>
        </>
      ) : (
        <div className="font-display text-3xl font-bold text-ink-400 mt-2">—</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/components/performance/pr-tile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/pr-tile.tsx src/components/performance/pr-tile.test.tsx
git commit -m "feat(performance): add PR tile component"
```

---

## Task γ-7: PR tiles row composition

**Files:**
- Create: `src/components/performance/pr-tiles.tsx`

Composes three `<PrTile>` components for 5min / 20min / 1hr. No tests — pure layout.

- [ ] **Step 1: Implement**

```tsx
// src/components/performance/pr-tiles.tsx
import { PrTile } from './pr-tile';
import type { PrTile as PrTileData } from '@/hooks/use-performance-records';

const LABELS: Record<number, string> = {
  300: '5 min',
  1200: '20 min',
  3600: '1 hour',
};

interface PrTilesProps {
  tiles: PrTileData[];
}

export function PrTiles({ tiles }: PrTilesProps) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-ink-500 mb-2">
        Power records
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <PrTile
            key={t.durationSeconds}
            label={LABELS[t.durationSeconds] ?? `${t.durationSeconds}s`}
            record={t.record}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/performance/pr-tiles.tsx
git commit -m "feat(performance): add PR tiles row"
```

---

## Task γ-8: Power Profile hexagon (SVG)

**Files:**
- Create: `src/components/performance/power-profile-hexagon.tsx`
- Create: `src/components/performance/power-profile-hexagon.test.tsx`

Hand-rolled SVG: six radial axes (5s / 30s / 1min / 5min / 20min / 1hr) with two overlaid polygons (current period in brand color, comparison period in ink-gray). Concentric rings provide scale.

The radar value at each axis is **w/kg**. The maximum radial extent is `MAX_WKG = 8` (a comfortable visual ceiling for any cyclist).

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/power-profile-hexagon.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PowerProfileHexagon } from './power-profile-hexagon';

const samplePoints = [5, 30, 60, 300, 1200, 3600].map((d, i) => ({
  durationSeconds: d,
  wkg: 6 - i * 0.5,
}));

describe('PowerProfileHexagon', () => {
  it('renders an SVG with two polygon paths', () => {
    const { container } = render(
      <PowerProfileHexagon
        current={samplePoints}
        comparison={samplePoints.map((p) => ({ ...p, wkg: (p.wkg ?? 0) - 0.3 }))}
        currentLabel="Last 90d"
        comparisonLabel="Previous 90d"
      />
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('polygon[data-period]')).toHaveLength(2);
  });

  it('renders the period labels in the legend', () => {
    render(
      <PowerProfileHexagon
        current={samplePoints}
        comparison={samplePoints}
        currentLabel="2026"
        comparisonLabel="2025"
      />
    );
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('renders an empty-state hint when both periods have no wkg data', () => {
    const empty = samplePoints.map((p) => ({ ...p, wkg: null }));
    render(
      <PowerProfileHexagon
        current={empty}
        comparison={empty}
        currentLabel="A"
        comparisonLabel="B"
      />
    );
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/components/performance/power-profile-hexagon.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/performance/power-profile-hexagon.tsx
import type { RadarPoint } from '@/hooks/use-performance-records';

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 32; // leave room for labels
const MAX_WKG = 8;
const RING_COUNT = 4; // 2, 4, 6, 8

const AXIS_LABELS: Record<number, string> = {
  5: '5s',
  30: '30s',
  60: '1m',
  300: '5m',
  1200: '20m',
  3600: '1h',
};

interface PowerProfileHexagonProps {
  current: RadarPoint[];
  comparison: RadarPoint[];
  currentLabel: string;
  comparisonLabel: string;
}

function axisAngle(index: number, total: number): number {
  // First axis at top (12 o'clock), then clockwise.
  return (-Math.PI / 2) + (index * 2 * Math.PI) / total;
}

function pointAt(angle: number, radius: number): [number, number] {
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
}

function polygonFor(points: readonly RadarPoint[]): string {
  return points
    .map((p, i) => {
      const angle = axisAngle(i, points.length);
      const wkg = p.wkg ?? 0;
      const r = Math.min(MAX_WKG, Math.max(0, wkg)) / MAX_WKG * RADIUS;
      const [x, y] = pointAt(angle, r);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function PowerProfileHexagon({
  current,
  comparison,
  currentLabel,
  comparisonLabel,
}: PowerProfileHexagonProps) {
  const allEmpty =
    current.every((p) => p.wkg === null) &&
    comparison.every((p) => p.wkg === null);

  if (allEmpty) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-md border border-dashed border-ink-300 bg-shell-50 text-sm text-ink-600">
        Not enough data in either period yet.
      </div>
    );
  }

  const axisCount = current.length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Power profile hexagon: w/kg by duration, current vs comparison"
        className="w-full h-auto max-w-md mx-auto"
      >
        {/* Concentric rings */}
        {Array.from({ length: RING_COUNT }, (_, i) => i + 1).map((ring) => {
          const ringPoints = current
            .map((_, j) => {
              const angle = axisAngle(j, axisCount);
              const r = (ring / RING_COUNT) * RADIUS;
              const [x, y] = pointAt(angle, r);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={ring}
              points={ringPoints}
              fill="none"
              stroke="var(--color-ink-200)"
              strokeWidth={1}
            />
          );
        })}

        {/* Radial axes */}
        {current.map((p, i) => {
          const angle = axisAngle(i, axisCount);
          const [x, y] = pointAt(angle, RADIUS);
          const [lx, ly] = pointAt(angle, RADIUS + 18);
          return (
            <g key={p.durationSeconds}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="var(--color-ink-200)"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--color-ink-600)"
              >
                {AXIS_LABELS[p.durationSeconds] ?? `${p.durationSeconds}s`}
              </text>
            </g>
          );
        })}

        {/* Comparison polygon (under) */}
        <polygon
          data-period="comparison"
          points={polygonFor(comparison)}
          fill="var(--color-ink-300)"
          fillOpacity={0.25}
          stroke="var(--color-ink-500)"
          strokeWidth={1.5}
        />

        {/* Current polygon (over) */}
        <polygon
          data-period="current"
          points={polygonFor(current)}
          fill="var(--color-brand-500)"
          fillOpacity={0.3}
          stroke="var(--color-brand-600)"
          strokeWidth={2}
        />
      </svg>
      <ul className="flex justify-center gap-4 pt-2 text-xs text-ink-700">
        <li className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-brand-500)' }}
          />
          {currentLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-ink-400)' }}
          />
          {comparisonLabel}
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/components/performance/power-profile-hexagon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/power-profile-hexagon.tsx src/components/performance/power-profile-hexagon.test.tsx
git commit -m "feat(performance): add power profile hexagon (svg)"
```

---

## Task γ-9: Period preset selector

**Files:**
- Create: `src/components/performance/period-preset-selector.tsx`
- Create: `src/components/performance/period-preset-selector.test.tsx`

Three-option segmented control (mirrors `RangeToggle`'s shape but with longer labels). Picks one of `'this-year-vs-last-year'`, `'last-90d-vs-previous-90d'`, `'last-30d-vs-all-time-best'`.

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/period-preset-selector.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  PeriodPresetSelector,
} from './period-preset-selector';
import type { PeriodPreset } from '@/lib/performance/period';

describe('PeriodPresetSelector', () => {
  it('renders three options', () => {
    render(
      <PeriodPresetSelector value="last-90d-vs-previous-90d" onChange={() => {}} />
    );
    expect(screen.getByRole('button', { name: /last 90d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /this year/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /last 30d/i })).toBeInTheDocument();
  });

  it('marks the active option as pressed', () => {
    render(
      <PeriodPresetSelector value="this-year-vs-last-year" onChange={() => {}} />
    );
    expect(
      screen.getByRole('button', { name: /this year/i })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with the preset key', () => {
    const onChange = vi.fn<(p: PeriodPreset) => void>();
    render(
      <PeriodPresetSelector value="last-90d-vs-previous-90d" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /this year/i }));
    expect(onChange).toHaveBeenCalledWith('this-year-vs-last-year');
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/components/performance/period-preset-selector.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/performance/period-preset-selector.tsx
import { clsx } from 'clsx';
import type { PeriodPreset } from '@/lib/performance/period';

const OPTIONS: readonly { key: PeriodPreset; label: string }[] = [
  { key: 'last-90d-vs-previous-90d', label: 'Last 90d' },
  { key: 'this-year-vs-last-year', label: 'This year' },
  { key: 'last-30d-vs-all-time-best', label: 'Last 30d' },
];

interface PeriodPresetSelectorProps {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset) => void;
}

export function PeriodPresetSelector({ value, onChange }: PeriodPresetSelectorProps) {
  return (
    <div className="inline-flex rounded-md border border-ink-200 bg-shell-50 p-0.5">
      {OPTIONS.map((opt) => {
        const pressed = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(opt.key)}
            className={clsx(
              'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
              pressed
                ? 'bg-ink-900 text-white'
                : 'text-ink-700 hover:bg-shell-100'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/components/performance/period-preset-selector.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/period-preset-selector.tsx src/components/performance/period-preset-selector.test.tsx
git commit -m "feat(performance): add period preset selector"
```

---

## Task γ-10: Wire into `/performance` page

**Files:**
- Modify: `src/pages/performance.tsx`

Adds the PR tiles, period selector, and Power Profile hexagon between the Trend trio chart and the Strava sync UI. Only mount records-related UI when the user has at least one synced activity (records are meaningless before that).

- [ ] **Step 1: Add imports** at the top of the page:

```tsx
import { useState } from 'react';
import { usePerformanceRecords } from '@/hooks/use-performance-records';
import { PrTiles } from '@/components/performance/pr-tiles';
import { PowerProfileHexagon } from '@/components/performance/power-profile-hexagon';
import { PeriodPresetSelector } from '@/components/performance/period-preset-selector';
import type { PeriodPreset } from '@/lib/performance/period';
```

- [ ] **Step 2: Add state + hook calls** inside `PerformancePage`, alongside the existing hooks:

```tsx
const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('last-90d-vs-previous-90d');
const records = usePerformanceRecords(periodPreset);
const hasAnyActivity = activities.length > 0;
```

- [ ] **Step 3: Add the new JSX block** after `<TrendTrioChart>` and BEFORE the existing Strava UI block. The records UI only renders when there's at least one synced activity:

```tsx
{hasAnyActivity && (
  <>
    <PrTiles tiles={records.tiles} />

    <div className="flex items-center justify-between">
      <h2 className="text-xs uppercase tracking-wider text-ink-500">
        Power profile
      </h2>
      <PeriodPresetSelector value={periodPreset} onChange={setPeriodPreset} />
    </div>

    <PowerProfileHexagon
      current={records.radar.current}
      comparison={records.radar.comparison}
      currentLabel={records.radar.currentLabel}
      comparisonLabel={records.radar.comparisonLabel}
    />
  </>
)}
```

The `hasAnyActivity` gate prevents the empty PR tiles + faded radar from rendering during the empty Phase β state (when only the backfill prompt should show).

- [ ] **Step 4: Type-check + build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build 2>&1 | tail -5`
Expected: succeeds.

- [ ] **Step 5: Run the full test suite for regression check**

Run: `npm run test -- --run 2>&1 | tail -5`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/performance.tsx
git commit -m "feat(performance): wire PR tiles + power profile into /performance"
```

---

## Final pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test -- --run 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 2: Type-check (forced) + lint**

Run: `npx tsc -b --force && npm run lint`
Expected: clean.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual validation (defer to human)**

- Apply the Phase β migration if not already (`supabase db push`)
- Deploy the Phase β edge function if not already (`supabase functions deploy strava-activities-sync`)
- Reconnect Strava to grant `activity:read` if needed
- Visit `/performance` after at least one sync — confirm:
  - PR tiles populate with the best 5min / 20min / 1hr from synced rides
  - The Power Profile hexagon renders two polygons by default ("Last 90d vs. Previous 90d")
  - The period selector switches between presets without reloading
  - Empty/missing data shows `—` in tiles and faded comparison polygons appropriately

- [ ] **Step 5: Final commit if anything is uncommitted**

Run: `git status`
Should be clean.

---

## Done criteria

- All 10 tasks committed.
- `/performance` shows PR tiles + period selector + Power Profile hexagon when activities exist.
- `decodeByteaHex` round-trips correctly: a curve packed by the edge function unpacks back to identical numbers (verified via the `\x6400c800` → `[100, 200]` test in γ-4).
- All tests pass; tsc/lint/build clean.

After this lands, the Performance Tracking design (Phase α + β + γ) is fully shipped.

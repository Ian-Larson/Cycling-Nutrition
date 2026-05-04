# Performance Tracking — Phase β (Strava Activity Sync) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull Strava ride activities + power streams into Domestique, compute and persist a mean-max power curve per ride, and surface a lightweight "Recent rides" list on `/performance`. No PR tiles or radar yet — those land in Phase γ.

**Architecture:** Activities live in a new dedicated Supabase table `activities` (NOT in the JSONB `app_state` blob — see spec). A new edge function `strava-activities-sync` handles paginated activity fetch, per-activity power-stream fetch, mean-max computation server-side, and DB writes. Streams are discarded after the curve is extracted. The client surfaces sync state via a state machine hook. Backfill UI prompts on first sync after scope upgrade; ongoing sync runs on app open with a 24h debounce or when the user clicks "Sync rides".

**Tech Stack:** React 19 + TypeScript + Vite + Zustand + Tailwind + Supabase (Postgres + Edge Functions on Deno) + Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-04-performance-tracking-design.md`

**Out of scope (deferred to Phase γ):** PR tiles (best 5min / 20min / 1hr), Power Profile hexagon, period-over-period comparison, ride-detail page, training-load metrics.

---

## File structure (after the change)

**Created**
- `supabase/migrations/20260504000000_activities.sql` — activities table, indexes, RLS
- `supabase/functions/strava-activities-sync/index.ts` — edge function entry
- `supabase/functions/_shared/strava-activities.ts` — Strava API client (pagination + streams)
- `supabase/functions/_shared/mean-max-curve.ts` — pure mean-max algorithm (also re-exported by client)
- `src/types/activity.ts` — `Activity`, `ActivityRow` (DB shape), `ActivitySyncState`
- `src/lib/performance/activities.ts` — Supabase wrapper (list, listSince, getLastSyncedAt)
- `src/lib/performance/activities.test.ts`
- `src/lib/performance/mean-max-curve.ts` — re-export of the shared algorithm + ergonomic wrappers
- `src/lib/performance/mean-max-curve.test.ts`
- `src/hooks/use-activities.ts` — store-style hook for the activities cache
- `src/hooks/use-activities.test.ts`
- `src/hooks/use-strava-activity-sync.ts` — sync state machine + trigger
- `src/hooks/use-strava-activity-sync.test.ts`
- `src/components/performance/sync-button.tsx` — "Sync rides" button + status pill
- `src/components/performance/sync-button.test.tsx`
- `src/components/performance/backfill-prompt.tsx` — preset window selector
- `src/components/performance/backfill-prompt.test.tsx`
- `src/components/performance/recent-rides.tsx` — last-10 list
- `src/components/performance/recent-rides.test.tsx`
- `src/components/performance/strava-reauth-banner.tsx` — shows when activity scopes missing

**Modified**
- `src/lib/auth/strava-provider.ts` — add `activity:read` and `activity:read_all` to `getRequestedStravaScopes()`
- `src/lib/auth/strava-provider.test.ts` — assert new scopes
- `src/pages/performance.tsx` — mount sync button, recent rides list, backfill prompt, reauth banner
- `src/App.tsx` — call activity-sync auto-trigger once on app open

---

## Conventions used throughout

- **Test runner:** `npm run test` (Vitest). Single-file run: `npx vitest run path/to/file.test.ts`.
- **TDD beat:** failing test → run → fail → minimal code → run → pass → commit. Each task spells this out.
- **Commits:** Conventional Commits. Co-Authored-By trailer added by Claude Code automatically — do not write it manually.
- **Imports:** `@/...` alias to `src/`.
- **IDs:** Strava activity id (string). Cloud-only — no `nanoid` needed.
- **Timestamps:** ISO 8601 strings.
- **Edge function module style:** matches `supabase/functions/strava-gear-list/index.ts` — `serve` from std, `createClient` from npm, `_shared/cors.ts` for `corsHeaders` and `jsonResponse`.

---

## Task 1: SQL migration for `activities`

**Files:**
- Create: `supabase/migrations/20260504000000_activities.sql`

The activities table mirrors the `Activity` field list in the spec. RLS pattern follows `strava_connections` (user-scoped via `auth.uid()`). The `mean_max_curve` is a `bytea` (Int16 packed array, 30-60 KB per ride) to avoid JSONB overhead. Indexed on `(user_id, started_at DESC)` for the recent-rides query.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260504000000_activities.sql

create table if not exists public.activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  strava_id text not null,
  started_at timestamptz not null,
  duration_s integer not null,
  distance_m double precision,
  avg_watts integer,
  np_watts integer,
  max_watts integer,
  kj integer,
  mean_max_curve bytea,
  bike_id text,
  strava_gear_id text,
  name text not null default '',
  source text not null default 'strava',
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, strava_id)
);

create index if not exists activities_user_started_idx
  on public.activities (user_id, started_at desc);

alter table public.activities enable row level security;

drop policy if exists "activities owner read" on public.activities;
create policy "activities owner read"
  on public.activities for select
  using (auth.uid() = user_id);

drop policy if exists "activities owner write" on public.activities;
create policy "activities owner write"
  on public.activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_activities_updated_at on public.activities;
create trigger set_activities_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

create table if not exists public.activity_sync_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_synced_at timestamptz,
  last_strava_after timestamptz,
  scopes_at_last_sync text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

alter table public.activity_sync_meta enable row level security;

drop policy if exists "activity_sync_meta owner read" on public.activity_sync_meta;
create policy "activity_sync_meta owner read"
  on public.activity_sync_meta for select
  using (auth.uid() = user_id);

drop policy if exists "activity_sync_meta owner write" on public.activity_sync_meta;
create policy "activity_sync_meta owner write"
  on public.activity_sync_meta for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_activity_sync_meta_updated_at on public.activity_sync_meta;
create trigger set_activity_sync_meta_updated_at
before update on public.activity_sync_meta
for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Smoke-check the SQL parses (no DB push yet)**

If you have the Supabase CLI: `supabase db lint --file supabase/migrations/20260504000000_activities.sql` (or local dry-run).
If you don't: skip — the migration applies on next `supabase db push`. Note the file in the commit message.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260504000000_activities.sql
git commit -m "feat(db): add activities + activity_sync_meta tables (RLS)"
```

> **Note:** This migration requires `supabase db push` to land in production. Flag in the report. Phase β client code can be written and unit-tested without the migration applied; integration/manual testing requires it.

---

## Task 2: Mean-max curve algorithm (shared)

**Files:**
- Create: `supabase/functions/_shared/mean-max-curve.ts`
- Create: `src/lib/performance/mean-max-curve.ts`
- Create: `src/lib/performance/mean-max-curve.test.ts`

The mean-max curve is the best average power for every duration `1..N` seconds in a stream. For a stream of length `N`, the curve has `N` entries: `curve[d-1] = max over all i of mean(stream[i..i+d-1])`.

The algorithm runs once per activity, on the edge — but the same TypeScript code is used by client tests. So it lives in `supabase/functions/_shared/mean-max-curve.ts` and is **mirrored** (copied verbatim) into `src/lib/performance/mean-max-curve.ts`. Mirroring is acceptable here because the edge function and the client run different module systems (Deno vs. Vite); we don't have a shared build. The two files are kept identical by hand. The client `mean-max-curve.ts` adds a small ergonomic wrapper for converting to/from `bytea` (Uint8Array packed Int16).

- [ ] **Step 1: Write failing tests for the curve algorithm**

```typescript
// src/lib/performance/mean-max-curve.test.ts
import { describe, expect, it } from 'vitest';
import {
  computeMeanMaxCurve,
  packCurveInt16,
  unpackCurveInt16,
} from './mean-max-curve';

describe('computeMeanMaxCurve', () => {
  it('returns an empty array for an empty stream', () => {
    expect(computeMeanMaxCurve([])).toEqual([]);
  });

  it('returns a single value for a 1-second stream', () => {
    expect(computeMeanMaxCurve([200])).toEqual([200]);
  });

  it('treats every duration as the best window of that length', () => {
    // Stream: 100, 200, 300
    // 1s best = 300
    // 2s best = mean(200, 300) = 250
    // 3s best = mean(100, 200, 300) = 200
    expect(computeMeanMaxCurve([100, 200, 300])).toEqual([300, 250, 200]);
  });

  it('finds the best window even when the peak is in the middle', () => {
    // Stream: 100, 400, 100
    // 1s best = 400
    // 2s best = max(mean(100,400)=250, mean(400,100)=250) = 250
    // 3s best = mean(100,400,100) = 200
    expect(computeMeanMaxCurve([100, 400, 100])).toEqual([400, 250, 200]);
  });

  it('rounds to integer watts', () => {
    // Stream: 1, 2, 3 → 2s best = mean(2,3) = 2.5 → rounds to 3 (or 2; we pick Math.round)
    const curve = computeMeanMaxCurve([1, 2, 3]);
    expect(curve.every((v) => Number.isInteger(v))).toBe(true);
  });

  it('clamps negative or NaN samples to 0 before computing', () => {
    expect(computeMeanMaxCurve([100, -50, 200])).toEqual([200, 150, 83]);
  });
});

describe('packCurveInt16 / unpackCurveInt16', () => {
  it('round-trips a curve through Int16 packing', () => {
    const curve = [100, 200, 300, 0, 1500];
    const packed = packCurveInt16(curve);
    expect(packed).toBeInstanceOf(Uint8Array);
    expect(packed.byteLength).toBe(curve.length * 2);
    expect(unpackCurveInt16(packed)).toEqual(curve);
  });

  it('clamps values outside Int16 range', () => {
    // Int16 max is 32767. Values above clamp.
    const packed = packCurveInt16([40000]);
    expect(unpackCurveInt16(packed)).toEqual([32767]);
  });
});
```

- [ ] **Step 2: Run test, see it fail**

Run: `npx vitest run src/lib/performance/mean-max-curve.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the shared algorithm (edge copy)**

```typescript
// supabase/functions/_shared/mean-max-curve.ts

/**
 * Returns the mean-max power curve for a stream: for each duration d in 1..N,
 * curve[d-1] = max over all windows of length d of the window mean, rounded
 * to integer watts. NaN/negative samples are clamped to 0.
 *
 * Uses a prefix-sum approach: O(N^2) worst-case but typically O(N * log N)
 * for ride-length streams (a few hours). For 4-hour rides (~14400 samples),
 * runs in well under a second.
 */
export function computeMeanMaxCurve(stream: readonly number[]): number[] {
  const n = stream.length;
  if (n === 0) return [];

  const clean = stream.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + clean[i];

  const curve = new Array<number>(n);
  for (let d = 1; d <= n; d++) {
    let best = 0;
    for (let i = 0; i + d <= n; i++) {
      const mean = (prefix[i + d] - prefix[i]) / d;
      if (mean > best) best = mean;
    }
    curve[d - 1] = Math.round(best);
  }
  return curve;
}
```

- [ ] **Step 4: Mirror into the client copy + add the pack/unpack helpers**

```typescript
// src/lib/performance/mean-max-curve.ts

/**
 * Returns the mean-max power curve for a stream: for each duration d in 1..N,
 * curve[d-1] = max over all windows of length d of the window mean, rounded
 * to integer watts. NaN/negative samples are clamped to 0.
 *
 * Mirrored verbatim from supabase/functions/_shared/mean-max-curve.ts.
 * Keep the two copies identical by hand.
 */
export function computeMeanMaxCurve(stream: readonly number[]): number[] {
  const n = stream.length;
  if (n === 0) return [];

  const clean = stream.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + clean[i];

  const curve = new Array<number>(n);
  for (let d = 1; d <= n; d++) {
    let best = 0;
    for (let i = 0; i + d <= n; i++) {
      const mean = (prefix[i + d] - prefix[i]) / d;
      if (mean > best) best = mean;
    }
    curve[d - 1] = Math.round(best);
  }
  return curve;
}

const INT16_MAX = 32767;
const INT16_MIN = -32768;

/** Packs a power curve as little-endian Int16 bytes. Clamps to Int16 range. */
export function packCurveInt16(curve: readonly number[]): Uint8Array {
  const buf = new ArrayBuffer(curve.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < curve.length; i++) {
    const clamped = Math.max(INT16_MIN, Math.min(INT16_MAX, Math.round(curve[i])));
    view.setInt16(i * 2, clamped, true);
  }
  return new Uint8Array(buf);
}

/** Inverse of packCurveInt16. */
export function unpackCurveInt16(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: number[] = [];
  for (let i = 0; i < bytes.byteLength; i += 2) {
    out.push(view.getInt16(i, true));
  }
  return out;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/lib/performance/mean-max-curve.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/mean-max-curve.ts src/lib/performance/mean-max-curve.ts src/lib/performance/mean-max-curve.test.ts
git commit -m "feat(performance): add mean-max curve algorithm (shared edge+client)"
```

---

## Task 3: Strava activities API client helper

**Files:**
- Create: `supabase/functions/_shared/strava-activities.ts`

A small Deno-side helper that wraps Strava API calls used by the sync function: fetch a page of activities since X, fetch the watts stream for a given activity. Includes signature for rate-limit-aware retries (the actual rate-limit logic lives in the edge function in Task 5).

- [ ] **Step 1: Implement the helper**

```typescript
// supabase/functions/_shared/strava-activities.ts

export interface StravaActivitySummary {
  id: number | string;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string; // ISO
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_watts?: number;
  weighted_average_watts?: number;
  max_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  gear_id?: string | null;
}

export interface StravaWattsStream {
  type: string; // 'watts'
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string; // 'high' | 'medium' | 'low'
}

const STRAVA_BASE = 'https://www.strava.com/api/v3';

/**
 * Fetches one page of activities (cycling-relevant). Strava paginates with
 * page= 1-based; per_page max 200. Returns the raw activity summaries.
 *
 * `after`: epoch seconds (NOT ISO) — Strava's API quirk.
 */
export async function fetchActivityPage(
  accessToken: string,
  options: { afterEpoch: number; page: number; perPage?: number }
): Promise<StravaActivitySummary[]> {
  const params = new URLSearchParams({
    after: String(options.afterEpoch),
    page: String(options.page),
    per_page: String(options.perPage ?? 100),
  });
  const res = await fetch(`${STRAVA_BASE}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new StravaApiError(
      `Strava activities fetch failed (${res.status})`,
      res.status,
      body,
      res.headers
    );
  }
  return (await res.json()) as StravaActivitySummary[];
}

/**
 * Fetches the watts stream for a single activity. Returns the data array
 * (length = activity duration in seconds at 1Hz resolution) or null if the
 * activity has no power.
 */
export async function fetchWattsStream(
  accessToken: string,
  activityId: number | string
): Promise<number[] | null> {
  const params = new URLSearchParams({
    keys: 'watts',
    key_by_type: 'true',
    resolution: 'high',
  });
  const res = await fetch(
    `${STRAVA_BASE}/activities/${activityId}/streams?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new StravaApiError(
      `Strava streams fetch failed (${res.status})`,
      res.status,
      body,
      res.headers
    );
  }
  const json = (await res.json()) as { watts?: StravaWattsStream };
  if (!json.watts) return null;
  return json.watts.data;
}

export class StravaApiError extends Error {
  status: number;
  body: string;
  headers: Headers;
  constructor(message: string, status: number, body: string, headers: Headers) {
    super(message);
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
  /**
   * Strava signals rate-limit via HTTP 429. The X-RateLimit-Limit and
   * X-RateLimit-Usage headers are pipe-separated 15min|daily counts.
   * Returns true if this error indicates a rate-limit hit.
   */
  isRateLimited(): boolean {
    return this.status === 429;
  }
  /** Returns the recommended retry timestamp as ISO. Defaults to +15min. */
  retryAfterIso(now: Date = new Date()): string {
    const retryAfter = this.headers.get('Retry-After');
    const seconds = retryAfter ? Number(retryAfter) : 900;
    return new Date(now.getTime() + seconds * 1000).toISOString();
  }
}
```

This file has no tests of its own — it's exercised via Task 4's edge-function tests (which mock fetch). The static structure is straightforward and the type contracts are the spec.

- [ ] **Step 2: Type-check via the edge function (deferred to T4)**

No commit yet. This file gets staged and committed together with T4 since they're tightly coupled.

---

## Task 4: Edge function `strava-activities-sync` core flow

**Files:**
- Create: `supabase/functions/strava-activities-sync/index.ts`

End-to-end: validate auth → load + refresh Strava token → loop through activity pages until done or `max` reached → for each activity with `device_watts === true`, fetch stream → compute mean-max curve → upsert activity row → update `activity_sync_meta`.

For non-power rides (`device_watts === false` or absent), upsert the activity row with `mean_max_curve = NULL` and skip the stream call.

This task implements the **happy path**. Rate-limit + resume is layered on in T5.

- [ ] **Step 1: Implement the function**

```typescript
// supabase/functions/strava-activities-sync/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  fetchActivityPage,
  fetchWattsStream,
  StravaApiError,
  type StravaActivitySummary,
} from '../_shared/strava-activities.ts';
import { computeMeanMaxCurve } from '../_shared/mean-max-curve.ts';

interface SyncRequest {
  since?: string; // ISO timestamp; activities with started_at > since are pulled
  max?: number;   // upper bound on number of activities to import this call (default 50)
}

interface SyncResponse {
  imported: number;
  total_estimated?: number;
  next_since?: string;
  rate_limited_until?: string;
  done: boolean;
}

const DEFAULT_MAX = 50;
const PER_PAGE = 100;
const INT16_MAX = 32767;
const INT16_MIN = -32768;

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function packCurveInt16(curve: readonly number[]): Uint8Array {
  const buf = new ArrayBuffer(curve.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < curve.length; i++) {
    const clamped = Math.max(INT16_MIN, Math.min(INT16_MAX, Math.round(curve[i])));
    view.setInt16(i * 2, clamped, true);
  }
  return new Uint8Array(buf);
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number } | null> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

function isCyclingActivity(a: StravaActivitySummary): boolean {
  const t = a.sport_type ?? a.type;
  return /Ride|Cycling|VirtualRide|EBikeRide|GravelRide|MountainBikeRide/i.test(t);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as SyncRequest;
    const max = Math.max(1, Math.min(200, body.max ?? DEFAULT_MAX));
    const sinceIso = body.since ?? new Date(0).toISOString();
    const sinceEpoch = Math.floor(new Date(sinceIso).getTime() / 1000);

    const supabaseUrl = getEnv('SUPABASE_URL');
    const anonKey = getEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = getEnv('STRAVA_CLIENT_ID');
    const clientSecret = getEnv('STRAVA_CLIENT_SECRET');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenRow, error: tokenError } = await serviceClient
      .from('strava_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow) return jsonResponse({ error: 'Strava not connected' }, { status: 404 });

    let accessToken = tokenRow.access_token;
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAtSec = tokenRow.expires_at
      ? Math.floor(new Date(tokenRow.expires_at).getTime() / 1000)
      : 0;
    if (expiresAtSec <= nowSec + 60) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token, clientId, clientSecret);
      if (!refreshed) {
        return jsonResponse({ error: 'Token refresh failed' }, { status: 502 });
      }
      accessToken = refreshed.access_token;
      await serviceClient
        .from('strava_tokens')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    let imported = 0;
    let page = 1;
    let latestStartIso = sinceIso;

    pageLoop: while (imported < max) {
      let pageActivities: StravaActivitySummary[];
      try {
        pageActivities = await fetchActivityPage(accessToken, {
          afterEpoch: sinceEpoch,
          page,
          perPage: PER_PAGE,
        });
      } catch (e) {
        if (e instanceof StravaApiError && e.isRateLimited()) {
          const resp: SyncResponse = {
            imported,
            done: false,
            rate_limited_until: e.retryAfterIso(),
            next_since: latestStartIso,
          };
          await markSyncedAt(serviceClient, userId, latestStartIso);
          return jsonResponse(resp);
        }
        throw e;
      }
      if (pageActivities.length === 0) break;

      for (const a of pageActivities) {
        if (imported >= max) break pageLoop;
        if (!isCyclingActivity(a)) continue;

        let curveBytes: Uint8Array | null = null;
        if (a.device_watts === true) {
          try {
            const stream = await fetchWattsStream(accessToken, a.id);
            if (stream && stream.length > 0) {
              const curve = computeMeanMaxCurve(stream);
              curveBytes = packCurveInt16(curve);
            }
          } catch (e) {
            if (e instanceof StravaApiError && e.isRateLimited()) {
              const resp: SyncResponse = {
                imported,
                done: false,
                rate_limited_until: e.retryAfterIso(),
                next_since: latestStartIso,
              };
              await markSyncedAt(serviceClient, userId, latestStartIso);
              return jsonResponse(resp);
            }
            throw e;
          }
        }

        const row = {
          user_id: userId,
          strava_id: String(a.id),
          started_at: a.start_date,
          duration_s: a.moving_time,
          distance_m: a.distance,
          avg_watts: a.average_watts ? Math.round(a.average_watts) : null,
          np_watts: a.weighted_average_watts ? Math.round(a.weighted_average_watts) : null,
          max_watts: a.max_watts ? Math.round(a.max_watts) : null,
          kj: a.kilojoules ? Math.round(a.kilojoules) : null,
          mean_max_curve: curveBytes,
          strava_gear_id: a.gear_id ?? null,
          name: a.name,
          source: 'strava',
        };
        const { error: upsertError } = await serviceClient
          .from('activities')
          .upsert(row, { onConflict: 'user_id,strava_id' });
        if (upsertError) throw upsertError;

        imported += 1;
        if (a.start_date > latestStartIso) latestStartIso = a.start_date;
      }

      if (pageActivities.length < PER_PAGE) break;
      page += 1;
    }

    await markSyncedAt(serviceClient, userId, latestStartIso);

    const resp: SyncResponse = {
      imported,
      done: imported < max,
      next_since: latestStartIso,
    };
    return jsonResponse(resp);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, { status: 500 });
  }
});

async function markSyncedAt(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  latestStartIso: string
): Promise<void> {
  await serviceClient
    .from('activity_sync_meta')
    .upsert(
      {
        user_id: userId,
        last_synced_at: new Date().toISOString(),
        last_strava_after: latestStartIso,
      },
      { onConflict: 'user_id' }
    );
}
```

- [ ] **Step 2: Manually inspect — type-check is light for edge functions**

Edge functions don't go through the project's `tsc`. Skip type-check for Deno files.

Read the file once more. Confirm:
- All env vars are read via `getEnv`
- Token refresh logic mirrors `strava-gear-list/index.ts`
- The sync loop respects `max`
- `markSyncedAt` is called in both happy path and rate-limit path
- `pageActivities.length < PER_PAGE` is the correct done signal

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/strava-activities.ts supabase/functions/strava-activities-sync/index.ts
git commit -m "feat(edge): add strava-activities-sync function (happy path)"
```

> **Deployment note:** This function needs `supabase functions deploy strava-activities-sync` to land in production. Phase β client work in later tasks can be developed against the deployed function or against a stub.

---

## Task 5: Edge function rate-limit + resume polish

**Already covered in Task 4.** The `pageActivities` and `fetchWattsStream` callers already handle `StravaApiError.isRateLimited()` by returning a response with `rate_limited_until` set. Verify by re-reading the loop logic — there's no separate task to do here. Skip and renumber? **Keep as a checkbox-only verification.**

- [ ] **Step 1: Re-verify rate-limit handling in `index.ts`**

Confirm both fetch points (`fetchActivityPage` in the page loop, `fetchWattsStream` per activity) catch `StravaApiError.isRateLimited()` and return a `rate_limited_until` response. They do (in the file from T4).

- [ ] **Step 2: No commit — already in T4**

(Removed: this task collapses into T4 verification.)

---

## Task 6: Strava OAuth scope upgrade

**Files:**
- Modify: `src/lib/auth/strava-provider.ts`
- Modify: `src/lib/auth/strava-provider.test.ts`

Add `activity:read` and `activity:read_all` to the requested scopes. Existing tokens pre-date the new scopes; `getRequestedStravaScopes()` is the source of truth that the connection flow + the reauth banner read from.

- [ ] **Step 1: Locate the current scopes**

```bash
grep -n "getRequestedStravaScopes\|read_all\|profile:read" src/lib/auth/strava-provider.ts
```

- [ ] **Step 2: Update the test FIRST (TDD)**

In `src/lib/auth/strava-provider.test.ts`, add an assertion (or extend an existing one) that the scopes returned include `activity:read` and `activity:read_all`. Concrete addition:

```typescript
import { getRequestedStravaScopes } from './strava-provider';
import { describe, expect, it } from 'vitest';

describe('getRequestedStravaScopes', () => {
  it('requests activity scopes for performance tracking', () => {
    const scopes = getRequestedStravaScopes();
    expect(scopes).toContain('activity:read');
    expect(scopes).toContain('activity:read_all');
  });
});
```

If the test file already has a `describe('getRequestedStravaScopes', ...)`, add the new `it` inside that block instead of duplicating.

- [ ] **Step 3: Run, see fail**

Run: `npx vitest run src/lib/auth/strava-provider.test.ts`
Expected: FAIL — scopes missing.

- [ ] **Step 4: Add the scopes in `strava-provider.ts`**

Locate the array literal returned by `getRequestedStravaScopes()`. Append:

```typescript
'activity:read',
'activity:read_all',
```

Preserve any pre-existing scopes.

- [ ] **Step 5: Run, see pass**

Run: `npx vitest run src/lib/auth/strava-provider.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/strava-provider.ts src/lib/auth/strava-provider.test.ts
git commit -m "feat(auth): request activity:read scopes for performance"
```

---

## Task 7: Activity types + Supabase wrapper

**Files:**
- Create: `src/types/activity.ts`
- Create: `src/lib/performance/activities.ts`
- Create: `src/lib/performance/activities.test.ts`

Client-side mirror of the activities row shape, plus a thin wrapper that:
- `listRecent(limit = 10)` — most recent activities
- `listInRange(fromIso, toIso)` — activities in a window (Phase γ uses this)
- `getLastSyncedAt()` — read from `activity_sync_meta`

`mean_max_curve` decoding (bytea → number[]) is exposed but not eagerly run on every list call — the caller asks for it explicitly per activity.

- [ ] **Step 1: Define the types**

```typescript
// src/types/activity.ts

export interface Activity {
  stravaId: string;
  startedAt: string;
  durationS: number;
  distanceM: number | null;
  avgWatts: number | null;
  npWatts: number | null;
  maxWatts: number | null;
  kj: number | null;
  hasPower: boolean;
  bikeId: string | null;
  stravaGearId: string | null;
  name: string;
  source: 'strava';
}

export interface ActivitySyncMeta {
  lastSyncedAt: string | null;
  lastStravaAfter: string | null;
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// src/lib/performance/activities.test.ts
import { describe, expect, it, vi } from 'vitest';
import { listRecentActivities, getActivitySyncMeta } from './activities';

function makeMockSupabase(rows: unknown[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(builder),
    _builder: builder,
  } as any;
}

describe('listRecentActivities', () => {
  it('returns mapped activities with hasPower derived from mean_max_curve', async () => {
    const supabase = makeMockSupabase([
      {
        strava_id: '123',
        started_at: '2025-06-01T10:00:00Z',
        duration_s: 3600,
        distance_m: 30000,
        avg_watts: 200,
        np_watts: 220,
        max_watts: 800,
        kj: 720,
        mean_max_curve: new Uint8Array([1, 2]),
        bike_id: null,
        strava_gear_id: 'b1',
        name: 'Morning Ride',
        source: 'strava',
      },
      {
        strava_id: '456',
        started_at: '2025-05-30T07:00:00Z',
        duration_s: 1800,
        distance_m: 15000,
        avg_watts: null,
        np_watts: null,
        max_watts: null,
        kj: null,
        mean_max_curve: null,
        bike_id: null,
        strava_gear_id: null,
        name: 'No-power Ride',
        source: 'strava',
      },
    ]);

    const result = await listRecentActivities(supabase, 10);
    expect(result).toHaveLength(2);
    expect(result[0].stravaId).toBe('123');
    expect(result[0].hasPower).toBe(true);
    expect(result[1].hasPower).toBe(false);
  });

  it('returns an empty array when supabase returns no rows', async () => {
    const supabase = makeMockSupabase([]);
    const result = await listRecentActivities(supabase, 10);
    expect(result).toEqual([]);
  });
});

describe('getActivitySyncMeta', () => {
  it('returns null fields when meta row missing', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as any;
    const meta = await getActivitySyncMeta(supabase);
    expect(meta.lastSyncedAt).toBeNull();
    expect(meta.lastStravaAfter).toBeNull();
  });

  it('maps the meta row when present', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            last_synced_at: '2026-05-04T12:00:00Z',
            last_strava_after: '2026-05-04T11:00:00Z',
          },
          error: null,
        }),
      }),
    } as any;
    const meta = await getActivitySyncMeta(supabase);
    expect(meta.lastSyncedAt).toBe('2026-05-04T12:00:00Z');
    expect(meta.lastStravaAfter).toBe('2026-05-04T11:00:00Z');
  });
});
```

- [ ] **Step 3: Run, see fail**

Run: `npx vitest run src/lib/performance/activities.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the wrapper**

```typescript
// src/lib/performance/activities.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Activity, ActivitySyncMeta } from '@/types/activity';

interface ActivityRow {
  strava_id: string;
  started_at: string;
  duration_s: number;
  distance_m: number | null;
  avg_watts: number | null;
  np_watts: number | null;
  max_watts: number | null;
  kj: number | null;
  mean_max_curve: Uint8Array | null;
  bike_id: string | null;
  strava_gear_id: string | null;
  name: string;
  source: 'strava';
}

interface ActivitySyncMetaRow {
  last_synced_at: string | null;
  last_strava_after: string | null;
}

function mapRow(row: ActivityRow): Activity {
  return {
    stravaId: row.strava_id,
    startedAt: row.started_at,
    durationS: row.duration_s,
    distanceM: row.distance_m,
    avgWatts: row.avg_watts,
    npWatts: row.np_watts,
    maxWatts: row.max_watts,
    kj: row.kj,
    hasPower: row.mean_max_curve !== null,
    bikeId: row.bike_id,
    stravaGearId: row.strava_gear_id,
    name: row.name,
    source: row.source,
  };
}

export async function listRecentActivities(
  supabase: SupabaseClient,
  limit: number
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(
      'strava_id, started_at, duration_s, distance_m, avg_watts, np_watts, max_watts, kj, mean_max_curve, bike_id, strava_gear_id, name, source'
    )
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as ActivityRow[] | null) ?? []).map(mapRow);
}

export async function getActivitySyncMeta(
  supabase: SupabaseClient
): Promise<ActivitySyncMeta> {
  const { data, error } = await supabase
    .from('activity_sync_meta')
    .select('last_synced_at, last_strava_after')
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as ActivitySyncMetaRow | null;
  return {
    lastSyncedAt: row?.last_synced_at ?? null,
    lastStravaAfter: row?.last_strava_after ?? null,
  };
}
```

- [ ] **Step 5: Run, see pass**

Run: `npx vitest run src/lib/performance/activities.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/activity.ts src/lib/performance/activities.ts src/lib/performance/activities.test.ts
git commit -m "feat(performance): add activity types and supabase wrapper"
```

---

## Task 8: `useActivities` hook

**Files:**
- Create: `src/hooks/use-activities.ts`
- Create: `src/hooks/use-activities.test.ts`

A small hook similar to `use-strava-gear.ts`: caches the last-N activities in component state, exposes `refresh()`. Used by `<RecentRides>` and `<SyncButton>`.

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/use-activities.test.ts
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActivities } from './use-activities';
import * as activitiesLib from '@/lib/performance/activities';

vi.mock('@/lib/performance/activities');
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({}),
}));

describe('useActivities', () => {
  it('lists activities after mount', async () => {
    vi.mocked(activitiesLib.listRecentActivities).mockResolvedValue([
      {
        stravaId: '1',
        startedAt: '2025-06-01T10:00:00Z',
        durationS: 3600,
        distanceM: 30000,
        avgWatts: 200,
        npWatts: 220,
        maxWatts: 800,
        kj: 720,
        hasPower: true,
        bikeId: null,
        stravaGearId: null,
        name: 'Test',
        source: 'strava',
      },
    ]);

    const { result } = renderHook(() => useActivities());
    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
    });
    expect(result.current.activities[0].stravaId).toBe('1');
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors', async () => {
    vi.mocked(activitiesLib.listRecentActivities).mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useActivities());
    await waitFor(() => {
      expect(result.current.error).toBe('fail');
    });
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/hooks/use-activities.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```typescript
// src/hooks/use-activities.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { listRecentActivities } from '@/lib/performance/activities';
import type { Activity } from '@/types/activity';

const DEFAULT_LIMIT = 10;

export interface UseActivitiesResult {
  activities: Activity[];
  isFetching: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActivities(limit = DEFAULT_LIMIT): UseActivitiesResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    if (inflight.current) return inflight.current;
    setFetching(true);
    setError(null);
    const p = (async () => {
      try {
        const result = await listRecentActivities(supabase, limit);
        setActivities(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load activities');
      } finally {
        setFetching(false);
        inflight.current = null;
      }
    })();
    inflight.current = p;
    return p;
  }, [supabase, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, isFetching, error, refresh };
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/hooks/use-activities.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-activities.ts src/hooks/use-activities.test.ts
git commit -m "feat(performance): add useActivities hook"
```

---

## Task 9: `useStravaActivitySync` state machine

**Files:**
- Create: `src/hooks/use-strava-activity-sync.ts`
- Create: `src/hooks/use-strava-activity-sync.test.ts`

A hook that wraps the edge-function call. State machine:
- `idle` → caller invokes `start({ since, max })` → `syncing`
- response arrives → `idle` (if `done`), or back to `syncing` (if more pages, autoresume), or `rate_limited` (if `rate_limited_until` set)
- error → `error`

Exposes:
- `state: SyncState`
- `lastSyncedAt: string | null`
- `imported: number` (this session)
- `rateLimitedUntil: string | null`
- `start(options): Promise<void>`
- `cancel(): void`

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/use-strava-activity-sync.test.ts
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStravaActivitySync } from './use-strava-activity-sync';

const mockInvoke = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    functions: { invoke: mockInvoke },
  }),
}));
vi.mock('@/lib/performance/activities', () => ({
  getActivitySyncMeta: vi.fn().mockResolvedValue({
    lastSyncedAt: null,
    lastStravaAfter: null,
  }),
}));

describe('useStravaActivitySync', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useStravaActivitySync());
    expect(result.current.state).toBe('idle');
    expect(result.current.imported).toBe(0);
  });

  it('completes when the edge function returns done', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { imported: 10, done: true, next_since: '2026-05-04T12:00:00Z' },
      error: null,
    });
    const { result } = renderHook(() => useStravaActivitySync());
    await act(async () => {
      await result.current.start({ since: '2025-01-01T00:00:00Z' });
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.imported).toBe(10);
  });

  it('enters rate_limited when the response includes rate_limited_until', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        imported: 4,
        done: false,
        rate_limited_until: '2026-05-04T13:00:00Z',
        next_since: '2026-05-03T00:00:00Z',
      },
      error: null,
    });
    const { result } = renderHook(() => useStravaActivitySync());
    await act(async () => {
      await result.current.start({ since: '2025-01-01T00:00:00Z' });
    });
    expect(result.current.state).toBe('rate_limited');
    expect(result.current.rateLimitedUntil).toBe('2026-05-04T13:00:00Z');
    expect(result.current.imported).toBe(4);
  });

  it('enters error state on edge-function error', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useStravaActivitySync());
    await act(async () => {
      await result.current.start({ since: '2025-01-01T00:00:00Z' });
    });
    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('boom');
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/hooks/use-strava-activity-sync.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the hook**

```typescript
// src/hooks/use-strava-activity-sync.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getActivitySyncMeta } from '@/lib/performance/activities';

export type SyncState = 'idle' | 'syncing' | 'rate_limited' | 'error';

export interface SyncResponseShape {
  imported: number;
  done: boolean;
  next_since?: string;
  rate_limited_until?: string;
}

export interface StartOptions {
  since: string;
  max?: number;
}

export interface UseStravaActivitySyncResult {
  state: SyncState;
  imported: number;
  lastSyncedAt: string | null;
  rateLimitedUntil: string | null;
  error: string | null;
  start: (options: StartOptions) => Promise<void>;
}

const PAGE_BATCH = 50;

export function useStravaActivitySync(): UseStravaActivitySyncResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [state, setState] = useState<SyncState>('idle');
  const [imported, setImported] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    getActivitySyncMeta(supabase)
      .then((meta) => setLastSyncedAt(meta.lastSyncedAt))
      .catch(() => {
        // Silent — meta is optional; first sync will create it.
      });
  }, [supabase]);

  const start = useCallback(
    async ({ since, max = PAGE_BATCH }: StartOptions) => {
      if (!supabase) {
        setError('Supabase is not configured.');
        setState('error');
        return;
      }
      setState('syncing');
      setError(null);
      setImported(0);
      setRateLimitedUntil(null);

      let cursor = since;
      let totalImported = 0;
      while (true) {
        const { data, error: invokeError } = await supabase.functions.invoke(
          'strava-activities-sync',
          { body: { since: cursor, max } }
        );
        if (invokeError) {
          setError(invokeError.message);
          setState('error');
          return;
        }
        const resp = data as SyncResponseShape;
        totalImported += resp.imported;
        setImported(totalImported);
        if (resp.rate_limited_until) {
          setRateLimitedUntil(resp.rate_limited_until);
          setState('rate_limited');
          return;
        }
        if (resp.done || !resp.next_since || resp.imported === 0) {
          setLastSyncedAt(new Date().toISOString());
          setState('idle');
          return;
        }
        cursor = resp.next_since;
      }
    },
    [supabase]
  );

  return { state, imported, lastSyncedAt, rateLimitedUntil, error, start };
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/hooks/use-strava-activity-sync.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-strava-activity-sync.ts src/hooks/use-strava-activity-sync.test.ts
git commit -m "feat(performance): add strava activity sync state-machine hook"
```

---

## Task 10: Backfill prompt component

**Files:**
- Create: `src/components/performance/backfill-prompt.tsx`
- Create: `src/components/performance/backfill-prompt.test.tsx`

A small component shown when the user has connected Strava + has the activity scopes + has zero activities synced yet. Lets them pick a window: 90d / 6mo / 1y / all (default 90d) and triggers `start({ since })`.

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/backfill-prompt.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackfillPrompt } from './backfill-prompt';

describe('BackfillPrompt', () => {
  it('renders four window options', () => {
    render(<BackfillPrompt onStart={() => {}} />);
    ['90 days', '6 months', '1 year', 'All'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('calls onStart with the chosen since date', () => {
    const onStart = vi.fn();
    render(<BackfillPrompt onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: '6 months' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    const arg = onStart.mock.calls[0][0];
    expect(typeof arg.since).toBe('string');
    expect(new Date(arg.since).getTime()).toBeLessThan(Date.now());
  });

  it('passes since=epoch zero for All', () => {
    const onStart = vi.fn();
    render(<BackfillPrompt onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onStart.mock.calls[0][0].since).toBe(new Date(0).toISOString());
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/components/performance/backfill-prompt.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/performance/backfill-prompt.tsx
import { Button } from '@/components/ui';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PRESETS = [
  { label: '90 days', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
  { label: 'All', days: null },
] as const;

interface BackfillPromptProps {
  onStart: (options: { since: string }) => void;
}

export function BackfillPrompt({ onStart }: BackfillPromptProps) {
  const handleStart = (days: number | null) => {
    const since =
      days === null
        ? new Date(0).toISOString()
        : new Date(Date.now() - days * MS_PER_DAY).toISOString();
    onStart({ since });
  };

  return (
    <div className="rounded-md border border-dashed border-ink-300 bg-shell-50 p-6">
      <p className="text-sm font-medium text-ink-800">Import your Strava rides</p>
      <p className="mt-1 text-sm text-ink-600">
        Pick a window — Domestique pulls power streams from each ride and
        builds your records.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant="secondary"
            size="sm"
            onClick={() => handleStart(p.days)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/components/performance/backfill-prompt.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/backfill-prompt.tsx src/components/performance/backfill-prompt.test.tsx
git commit -m "feat(performance): add backfill prompt component"
```

---

## Task 11: Sync button + status pill

**Files:**
- Create: `src/components/performance/sync-button.tsx`
- Create: `src/components/performance/sync-button.test.tsx`

A composite component: a "Sync rides" button + a small status pill that reflects the sync state machine. While syncing: "Syncing 17…". Rate-limited: "Strava paused us until 4:32pm". Error: "Sync failed — try again". Idle (with last sync): "Last synced 2h ago".

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/sync-button.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SyncButton } from './sync-button';

const baseProps = {
  state: 'idle' as const,
  imported: 0,
  lastSyncedAt: null,
  rateLimitedUntil: null,
  error: null,
  onSync: vi.fn(),
};

describe('SyncButton', () => {
  it('renders Sync rides when idle', () => {
    render(<SyncButton {...baseProps} />);
    expect(screen.getByRole('button', { name: /sync rides/i })).toBeInTheDocument();
  });

  it('disables and shows count while syncing', () => {
    render(<SyncButton {...baseProps} state="syncing" imported={17} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByText(/syncing 17/i)).toBeInTheDocument();
  });

  it('shows rate-limit message with formatted time', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    render(
      <SyncButton
        {...baseProps}
        state="rate_limited"
        rateLimitedUntil={future}
      />
    );
    expect(screen.getByText(/strava paused us/i)).toBeInTheDocument();
  });

  it('shows error message in error state', () => {
    render(<SyncButton {...baseProps} state="error" error="Network down" />);
    expect(screen.getByText(/network down/i)).toBeInTheDocument();
  });

  it('calls onSync when clicked', () => {
    const onSync = vi.fn();
    render(<SyncButton {...baseProps} onSync={onSync} />);
    fireEvent.click(screen.getByRole('button', { name: /sync rides/i }));
    expect(onSync).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/components/performance/sync-button.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/performance/sync-button.tsx
import { Button } from '@/components/ui';
import type { SyncState } from '@/hooks/use-strava-activity-sync';

interface SyncButtonProps {
  state: SyncState;
  imported: number;
  lastSyncedAt: string | null;
  rateLimitedUntil: string | null;
  error: string | null;
  onSync: () => void;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SyncButton({
  state,
  imported,
  lastSyncedAt,
  rateLimitedUntil,
  error,
  onSync,
}: SyncButtonProps) {
  const isSyncing = state === 'syncing';
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={isSyncing}
        onClick={onSync}
      >
        {isSyncing ? `Syncing ${imported}…` : 'Sync rides'}
      </Button>
      <div className="text-xs text-ink-600">
        {state === 'rate_limited' && rateLimitedUntil && (
          <span>Strava paused us until {formatClock(rateLimitedUntil)}</span>
        )}
        {state === 'error' && error && <span>Sync failed — {error}</span>}
        {state === 'idle' && lastSyncedAt && (
          <span>Last synced {formatRelative(lastSyncedAt)}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/components/performance/sync-button.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/sync-button.tsx src/components/performance/sync-button.test.tsx
git commit -m "feat(performance): add sync button with status pill"
```

---

## Task 12: Recent rides list

**Files:**
- Create: `src/components/performance/recent-rides.tsx`
- Create: `src/components/performance/recent-rides.test.tsx`

Last-10 list at the bottom of `/performance`. Each row: date, name, duration, NP. Empty state: "No rides synced yet."

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/performance/recent-rides.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecentRides } from './recent-rides';
import type { Activity } from '@/types/activity';

const sample: Activity = {
  stravaId: '1',
  startedAt: '2025-06-01T10:00:00Z',
  durationS: 3661,
  distanceM: 30000,
  avgWatts: 200,
  npWatts: 220,
  maxWatts: 800,
  kj: 720,
  hasPower: true,
  bikeId: null,
  stravaGearId: null,
  name: 'Morning Ride',
  source: 'strava',
};

describe('RecentRides', () => {
  it('renders an empty state when there are no activities', () => {
    render(<RecentRides activities={[]} />);
    expect(screen.getByText(/no rides synced yet/i)).toBeInTheDocument();
  });

  it('renders rows for each activity', () => {
    render(<RecentRides activities={[sample]} />);
    expect(screen.getByText('Morning Ride')).toBeInTheDocument();
    expect(screen.getByText(/220\s*W/)).toBeInTheDocument();
  });

  it('shows a dash when NP is missing', () => {
    render(<RecentRides activities={[{ ...sample, npWatts: null }]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/components/performance/recent-rides.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/performance/recent-rides.tsx
import type { Activity } from '@/types/activity';

interface RecentRidesProps {
  activities: Activity[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function RecentRides({ activities }: RecentRidesProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-300 bg-shell-50 p-6 text-center text-sm text-ink-600">
        No rides synced yet.
      </div>
    );
  }
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-ink-500 mb-2">
        Recent rides
      </h2>
      <ul className="divide-y divide-[color:var(--border-soft)]">
        {activities.map((a) => (
          <li
            key={a.stravaId}
            className="flex items-center justify-between py-2.5 text-sm tabular-nums"
          >
            <div className="min-w-0">
              <div className="text-ink-900 truncate">{a.name}</div>
              <div className="text-xs text-ink-500">{formatDate(a.startedAt)}</div>
            </div>
            <div className="text-ink-700 ml-4 flex items-center gap-4">
              <span>{formatDuration(a.durationS)}</span>
              <span>{a.npWatts !== null ? `${a.npWatts} W` : '—'}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run, see pass**

Run: `npx vitest run src/components/performance/recent-rides.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/recent-rides.tsx src/components/performance/recent-rides.test.tsx
git commit -m "feat(performance): add recent rides list"
```

---

## Task 13: Re-auth banner for missing scopes

**Files:**
- Create: `src/components/performance/strava-reauth-banner.tsx`

A small banner shown when the user is connected to Strava but missing the new activity scopes. The connection's `scopes` array drives this. Surfaced on `/performance`.

The component is purely presentational — it gets `missingScopes: boolean` and an `onReconnect` callback. No tests beyond the type-check; behavior is trivial.

- [ ] **Step 1: Implement**

```tsx
// src/components/performance/strava-reauth-banner.tsx
import { Button } from '@/components/ui';

interface StravaReauthBannerProps {
  onReconnect: () => void;
}

export function StravaReauthBanner({ onReconnect }: StravaReauthBannerProps) {
  return (
    <div className="rounded-md border border-brand-200 bg-brand-50 p-4">
      <p className="text-sm font-medium text-ink-800">
        Reconnect Strava to import rides
      </p>
      <p className="mt-1 text-sm text-ink-600">
        Domestique needs activity-read access to pull your power data.
        Reconnecting takes a single click.
      </p>
      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={onReconnect}>
          Reconnect Strava
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/performance/strava-reauth-banner.tsx
git commit -m "feat(performance): add Strava reauth banner"
```

---

## Task 14: Wire everything into `/performance`

**Files:**
- Modify: `src/pages/performance.tsx`

Replace the bottom of the page (currently just the trend chart) with: the trend chart → sync button → backfill prompt (only if no activities yet and scopes present) → reauth banner (if scopes missing) → recent rides list.

Logic:
- Read connection scopes via existing `auth-context`. If connected but `activity:read` missing → reauth banner. Use `useAuth` (existing pattern).
- If connected with scopes AND activities is empty AND state idle → show backfill prompt.
- Otherwise show sync button + recent rides.

- [ ] **Step 1: Read existing auth context to confirm hook shape**

```bash
grep -n "useAuth\|stravaConnection\|scopes\|export function" src/lib/auth/auth-context.ts src/lib/auth/auth-provider.tsx | head -30
```

You'll need to know how to read the current Strava connection's scopes. The auth provider should expose them; if not, this task adds an inline `useEffect` reading from `fetchStravaConnection` (already implemented in `src/lib/auth/strava-service.ts`).

- [ ] **Step 2: Update the page**

Replace the body of `PerformancePage`. The new top portion (PageIntro + HeroStrip + RangeToggle + TrendTrioChart) stays unchanged. Add below it:

```tsx
import { useActivities } from '@/hooks/use-activities';
import { useStravaActivitySync } from '@/hooks/use-strava-activity-sync';
import { useAuth } from '@/lib/auth/auth-context';
import { BackfillPrompt } from '@/components/performance/backfill-prompt';
import { SyncButton } from '@/components/performance/sync-button';
import { RecentRides } from '@/components/performance/recent-rides';
import { StravaReauthBanner } from '@/components/performance/strava-reauth-banner';

// inside PerformancePage:
const { stravaConnection, connectStrava } = useAuth();
const { activities, refresh: refreshActivities } = useActivities();
const sync = useStravaActivitySync();

const hasActivityScope =
  stravaConnection?.scopes?.includes('activity:read') ?? false;
const isStravaConnected = Boolean(stravaConnection);

const handleSync = async () => {
  const since =
    sync.lastSyncedAt ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await sync.start({ since });
  await refreshActivities();
};
```

Then in the JSX, after `<TrendTrioChart>`:

```tsx
{isStravaConnected && !hasActivityScope && (
  <StravaReauthBanner onReconnect={connectStrava} />
)}

{isStravaConnected && hasActivityScope && activities.length === 0 && sync.state === 'idle' && (
  <BackfillPrompt
    onStart={async ({ since }) => {
      await sync.start({ since });
      await refreshActivities();
    }}
  />
)}

{isStravaConnected && hasActivityScope && (activities.length > 0 || sync.state !== 'idle') && (
  <SyncButton
    state={sync.state}
    imported={sync.imported}
    lastSyncedAt={sync.lastSyncedAt}
    rateLimitedUntil={sync.rateLimitedUntil}
    error={sync.error}
    onSync={handleSync}
  />
)}

{activities.length > 0 && <RecentRides activities={activities} />}
```

> **Auth hook shape (verified):** `useAuth()` from `@/lib/auth/auth-context` exposes `stravaConnection: StravaConnection | null` (with `.scopes: string[]`) and `connectStrava: () => void`. Use these directly.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build 2>&1 | tail -10`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/performance.tsx
git commit -m "feat(performance): wire Strava sync UI into /performance"
```

---

## Task 15: Auto-trigger sync on app open

**Files:**
- Modify: `src/App.tsx`

On mount, if Strava is connected with the activity scope AND `lastSyncedAt > 24h ago` (or null), kick off a background sync. Quiet — no UI surface unless the user navigates to `/performance`.

This is a small `useEffect` in `App.tsx`. The hook `useStravaActivitySync` and the auth context can be consumed at the App level.

- [ ] **Step 1: Add the auto-trigger**

In `src/App.tsx`, add a small inner component (since hooks need an inside-Router placement) or extend an existing one. Simplest: a new `<ActivityAutoSync />` component mounted inside `<AuthProvider>` that runs the trigger on mount.

```tsx
// inside src/App.tsx, near the other imports:
import { useEffect, useRef } from 'react';
// ...

function ActivityAutoSync() {
  const { stravaConnection } = useAuth();
  const sync = useStravaActivitySync();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!stravaConnection?.scopes?.includes('activity:read')) return;
    const last = sync.lastSyncedAt ? new Date(sync.lastSyncedAt).getTime() : 0;
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - last < oneDay) return;
    fired.current = true;
    const since = sync.lastSyncedAt ?? new Date(Date.now() - 90 * oneDay).toISOString();
    sync.start({ since }).catch(() => {
      // Silent — surfaces on /performance via the state machine.
    });
  }, [stravaConnection, sync]);

  return null;
}
```

Mount `<ActivityAutoSync />` inside `<AuthProvider>` next to the existing tree:

```tsx
<AuthProvider>
  <ActivityAutoSync />
  <div className="app-shell min-h-screen">
    {/* ... */}
  </div>
</AuthProvider>
```

> **Note on imports:** adjust `useAuth` import path to match your auth exports. If `useStravaActivitySync` cannot be safely instantiated outside `/performance` (e.g., it triggers re-renders that affect other pages), gate the auto-trigger behind a stable ref instead.

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: PASS, succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(performance): auto-trigger activity sync on app open (24h debounce)"
```

---

## Task 16: Bike auto-link

**Files:**
- Create: `src/lib/performance/auto-link-bike.ts`
- Create: `src/lib/performance/auto-link-bike.test.ts`
- Modify: `src/pages/performance.tsx` (call the auto-linker after sync)

When sync imports an activity, the row stores `strava_gear_id` but `bike_id` is null. After sync, walk the imported activities and resolve each `strava_gear_id` to a known bike via the existing `bikes` slice (already syncs from Strava in Phase α). Update the activity row's `bike_id` via Supabase.

Pure helper:
- Input: `activities: Activity[]`, `bikes: Bike[]`
- Output: pairs `{ stravaId: string; bikeId: string }[]` for activities to update.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/performance/auto-link-bike.test.ts
import { describe, expect, it } from 'vitest';
import { resolveBikeLinks } from './auto-link-bike';
import type { Activity } from '@/types/activity';
import type { Bike } from '@/types/gear';

const bikes: Bike[] = [
  // Minimal shape — only the fields auto-link reads. Cast to Bike for the test.
  { id: 'b1', stravaGearId: 'g1' } as Bike,
  { id: 'b2', stravaGearId: 'g2' } as Bike,
];

const baseActivity: Activity = {
  stravaId: 'a1',
  startedAt: '2025-06-01',
  durationS: 0,
  distanceM: null,
  avgWatts: null,
  npWatts: null,
  maxWatts: null,
  kj: null,
  hasPower: false,
  bikeId: null,
  stravaGearId: null,
  name: '',
  source: 'strava',
};

describe('resolveBikeLinks', () => {
  it('returns empty when no activities', () => {
    expect(resolveBikeLinks([], bikes)).toEqual([]);
  });

  it('returns empty when no bikes match', () => {
    const acts: Activity[] = [{ ...baseActivity, stravaGearId: 'unknown' }];
    expect(resolveBikeLinks(acts, bikes)).toEqual([]);
  });

  it('matches strava_gear_id to bike id', () => {
    const acts: Activity[] = [
      { ...baseActivity, stravaId: 'a1', stravaGearId: 'g1' },
      { ...baseActivity, stravaId: 'a2', stravaGearId: 'g2' },
    ];
    expect(resolveBikeLinks(acts, bikes)).toEqual([
      { stravaId: 'a1', bikeId: 'b1' },
      { stravaId: 'a2', bikeId: 'b2' },
    ]);
  });

  it('skips activities already linked', () => {
    const acts: Activity[] = [
      { ...baseActivity, stravaId: 'a1', stravaGearId: 'g1', bikeId: 'b1' },
    ];
    expect(resolveBikeLinks(acts, bikes)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `npx vitest run src/lib/performance/auto-link-bike.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// src/lib/performance/auto-link-bike.ts
import type { Activity } from '@/types/activity';
import type { Bike } from '@/types/gear';

export interface BikeLink {
  stravaId: string;
  bikeId: string;
}

export function resolveBikeLinks(
  activities: readonly Activity[],
  bikes: readonly Bike[]
): BikeLink[] {
  const byStravaGearId = new Map<string, string>();
  for (const bike of bikes) {
    if (bike.stravaGearId) byStravaGearId.set(bike.stravaGearId, bike.id);
  }
  const links: BikeLink[] = [];
  for (const activity of activities) {
    if (activity.bikeId) continue;
    if (!activity.stravaGearId) continue;
    const bikeId = byStravaGearId.get(activity.stravaGearId);
    if (bikeId) links.push({ stravaId: activity.stravaId, bikeId });
  }
  return links;
}
```

- [ ] **Step 4: Wire into the post-sync handler in `performance.tsx`**

After `await refreshActivities()` in `handleSync` (and in the BackfillPrompt's onStart), call:

```typescript
import { resolveBikeLinks } from '@/lib/performance/auto-link-bike';
import { useStore } from '@/store';
import { getSupabaseClient } from '@/lib/supabase/client';

const bikes = useStore((s) => s.bikes);

async function applyBikeLinks(activities: Activity[]): Promise<void> {
  const links = resolveBikeLinks(activities, bikes);
  if (links.length === 0) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await Promise.all(
    links.map(({ stravaId, bikeId }) =>
      supabase.from('activities').update({ bike_id: bikeId }).eq('strava_id', stravaId)
    )
  );
}

// after refreshActivities():
const fresh = await listRecentActivities(supabase, 200); // or use a dedicated bigger fetch
await applyBikeLinks(fresh);
await refreshActivities();
```

(Adjust to fit your final composition — the goal is "after sync completes, apply links and refresh.")

- [ ] **Step 5: Run tests + type-check**

Run: `npx vitest run src/lib/performance/auto-link-bike.test.ts && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/performance/auto-link-bike.ts src/lib/performance/auto-link-bike.test.ts src/pages/performance.tsx
git commit -m "feat(performance): auto-link activities to bikes by strava_gear_id"
```

---

## Final pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test -- --run`
Expected: PASS, no regressions.

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc -b --force && npm run lint`
Expected: clean.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual validation (skip dev server in automation)**

Defer to the human:
- Apply migration: `supabase db push`
- Deploy edge function: `supabase functions deploy strava-activities-sync`
- Reconnect Strava on the running app to grant new scopes
- Visit `/performance` — backfill prompt appears, click 90 days, watch progress, see Recent rides populate

- [ ] **Step 5: Final commit if anything is uncommitted**

Run: `git status` — should be clean.

---

## Done criteria

- All 16 tasks committed.
- Migration SQL written (deployment is human-run).
- Edge function written (deployment is human-run).
- Activity scope upgrade in client.
- `/performance` shows reauth banner / backfill prompt / sync button / recent rides depending on state.
- Bike auto-link runs after sync.
- All tests pass; type-check + lint + build clean.

What's next: **Phase γ — PR tiles + Power Profile hexagon** consumes the activities data Phase β persists. Will be written as `docs/superpowers/plans/YYYY-MM-DD-performance-tracking-phase-gamma.md` after Phase β lands.

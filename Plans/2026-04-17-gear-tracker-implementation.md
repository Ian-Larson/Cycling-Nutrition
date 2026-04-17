# Gear & Maintenance Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a `/gear` area that lets the user log maintenance (starting with chain wax), auto-pulls bike odometer from Strava, and surfaces "what's due" — replacing the spreadsheet workflow.

**Architecture:** New route + nav slot, three Zustand slices (`bikes`, `serviceEntries`, preset service types as constants). Strava bikes come from a new edge function mirroring `strava-token-exchange`. Pure-function `deriveDue(bikes, entries)` drives the list. LocalStorage persistence via existing `persist` middleware; Supabase cloud-sync is a follow-up.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand + immer + persist, Tailwind v4 (tokens: `shell`, `brand`, `ink`, `surface-note`, `border-soft`), Supabase Edge Functions (Deno), Vitest, React Router v6.

**Design reference:** [`Plans/2026-04-17-gear-maintenance-tracker.md`](./2026-04-17-gear-maintenance-tracker.md) — the authoritative design doc. Read it before starting.

**Key facts discovered during planning:**
- Existing Strava OAuth scope is already `read,profile:read_all` ([src/lib/auth/strava-provider.ts:6](../src/lib/auth/strava-provider.ts)) — **no re-consent needed** for the `/athlete` bikes call.
- Mobile nav is currently `grid-cols-5` in [src/components/layout/mobile-nav.tsx](../src/components/layout/mobile-nav.tsx); desktop nav items are also in [src/components/layout/header.tsx](../src/components/layout/header.tsx). Both must be updated together.
- Store uses `immer` middleware — mutations inside actions are safe.

**Ship boundary:** Tasks 1–6 are the MVP shippable unit. Tasks 7–8 can ship in a follow-up PR.

---

## Task 0: Prep

**Goal:** Verify baseline green.

**Step 1:** Confirm working directory and branch.
```bash
cd "/Users/ian/Desktop/Projects/Cycling Nutrition"
git status
git rev-parse --abbrev-ref HEAD
```
Expected: clean working tree (aside from `.claude/worktrees/nice-easley` submodule noise); branch should be a fresh `feat/gear-tracker` branch — create if needed:
```bash
git checkout -b feat/gear-tracker
```

**Step 2:** Verify baseline tests + lint + build pass.
```bash
npm run lint
npx vitest run
npm run build
```
Expected: all green. If anything is red, stop and report before proceeding.

---

## Task 1: Types + service-type constants

**Goal:** Land the type surface and the preset list. No store or UI changes yet. Fast, type-only commit.

**Files:**
- Create: `src/types/gear.ts`
- Create: `src/lib/gear/service-types.ts`
- Create: `src/lib/gear/service-types.test.ts`

**Step 1: Write the failing test** (`src/lib/gear/service-types.test.ts`)
```ts
import { describe, it, expect } from 'vitest';
import { SERVICE_TYPES, getServiceType } from './service-types';

describe('SERVICE_TYPES', () => {
  it('exposes the four v1 presets with sensible defaults', () => {
    const keys = SERVICE_TYPES.map((t) => t.key);
    expect(keys).toEqual(['chain_wax', 'chain', 'brake_pads', 'tires']);
    expect(SERVICE_TYPES.find((t) => t.key === 'chain_wax')!.defaultIntervalMi).toBe(250);
    expect(SERVICE_TYPES.find((t) => t.key === 'chain')!.defaultIntervalMi).toBe(2000);
  });

  it('getServiceType returns the preset for a known key', () => {
    expect(getServiceType('tires').label).toBe('Tires');
  });
});
```

**Step 2: Run test — expect fail**
```bash
npx vitest run src/lib/gear/service-types.test.ts
```
Expected: FAIL (`Cannot find module './service-types'`).

**Step 3: Create `src/types/gear.ts`**
```ts
export type ServiceTypeKey = 'chain_wax' | 'chain' | 'brake_pads' | 'tires';

export interface Bike {
  id: string;
  name: string;
  stravaGearId: string | null;
  cachedOdometerMi: number | null;
  odometerSyncedAtIso: string | null;
  isPrimary: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ServiceEntry {
  id: string;
  bikeId: string;
  typeKey: ServiceTypeKey;
  dateIso: string;
  mileageMi: number;
  intervalMi: number;
  serviceAtMi: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

**Step 4: Create `src/lib/gear/service-types.ts`**
```ts
import type { ServiceTypeKey } from '@/types/gear';

export interface ServiceTypePreset {
  key: ServiceTypeKey;
  label: string;
  defaultIntervalMi: number;
}

export const SERVICE_TYPES: readonly ServiceTypePreset[] = [
  { key: 'chain_wax',  label: 'Chain wax',  defaultIntervalMi: 250 },
  { key: 'chain',      label: 'Chain',      defaultIntervalMi: 2000 },
  { key: 'brake_pads', label: 'Brake pads', defaultIntervalMi: 1500 },
  { key: 'tires',      label: 'Tires',      defaultIntervalMi: 2500 },
] as const;

export function getServiceType(key: ServiceTypeKey): ServiceTypePreset {
  const preset = SERVICE_TYPES.find((t) => t.key === key);
  if (!preset) throw new Error(`Unknown service type: ${key}`);
  return preset;
}
```

**Step 5: Run tests + typecheck**
```bash
npx vitest run src/lib/gear/service-types.test.ts
npm run build
```
Expected: PASS, build clean.

**Step 6: Commit**
```bash
git add src/types/gear.ts src/lib/gear/service-types.ts src/lib/gear/service-types.test.ts
git commit -m "feat(gear): add Bike/ServiceEntry types and preset service list"
```

---

## Task 2: Store slices — bikes + serviceEntries

**Goal:** Add CRUD actions to the existing Zustand store with `persist` + `immer`. Enforce the "exactly one primary" invariant.

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/store/index.test.ts`

### 2a. Bike CRUD (write test first)

**Step 1: Add failing test** to `src/store/index.test.ts`. Append:
```ts
import type { Bike, ServiceEntry } from '@/types/gear';
import { useStore } from './index';

describe('bikes slice', () => {
  beforeEach(() => {
    useStore.setState({ bikes: [], serviceEntries: [] });
  });

  it('addBike appends with generated id and marks first bike primary', () => {
    useStore.getState().addBike({ name: 'Force E1', stravaGearId: 'b1', cachedOdometerMi: 1800 });
    const bikes = useStore.getState().bikes;
    expect(bikes).toHaveLength(1);
    expect(bikes[0].id).toBeTruthy();
    expect(bikes[0].isPrimary).toBe(true);
  });

  it('setPrimaryBike enforces exactly one primary', () => {
    useStore.getState().addBike({ name: 'Force E1', stravaGearId: 'b1', cachedOdometerMi: 1800 });
    useStore.getState().addBike({ name: 'Allied ABLE', stravaGearId: 'b2', cachedOdometerMi: 600 });
    const [a, b] = useStore.getState().bikes;
    useStore.getState().setPrimaryBike(b.id);
    const after = useStore.getState().bikes;
    expect(after.find((x) => x.id === b.id)!.isPrimary).toBe(true);
    expect(after.find((x) => x.id === a.id)!.isPrimary).toBe(false);
  });

  it('deleteBike removes its service entries', () => {
    useStore.getState().addBike({ name: 'Force E1', stravaGearId: null, cachedOdometerMi: 0 });
    const bikeId = useStore.getState().bikes[0].id;
    useStore.getState().addServiceEntry({
      bikeId, typeKey: 'chain_wax', dateIso: '2026-04-17', mileageMi: 1800, intervalMi: 250,
    });
    useStore.getState().deleteBike(bikeId);
    expect(useStore.getState().bikes).toHaveLength(0);
    expect(useStore.getState().serviceEntries).toHaveLength(0);
  });

  it('upsertBikesFromStrava adds new and updates odometer on existing', () => {
    useStore.getState().upsertBikesFromStrava([
      { stravaGearId: 'b1', name: 'Force E1', odometerMi: 1800, isPrimary: true },
    ]);
    expect(useStore.getState().bikes).toHaveLength(1);

    useStore.getState().upsertBikesFromStrava([
      { stravaGearId: 'b1', name: 'Force E1', odometerMi: 1855, isPrimary: true },
      { stravaGearId: 'b2', name: 'Allied ABLE', odometerMi: 600, isPrimary: false },
    ]);
    const bikes = useStore.getState().bikes;
    expect(bikes).toHaveLength(2);
    expect(bikes.find((b) => b.stravaGearId === 'b1')!.cachedOdometerMi).toBe(1855);
  });
});

describe('serviceEntries slice', () => {
  beforeEach(() => {
    useStore.setState({ bikes: [], serviceEntries: [] });
    useStore.getState().addBike({ name: 'Force E1', stravaGearId: null, cachedOdometerMi: 1800 });
  });

  it('addServiceEntry computes serviceAtMi = mileage + interval', () => {
    const bikeId = useStore.getState().bikes[0].id;
    useStore.getState().addServiceEntry({
      bikeId, typeKey: 'chain_wax', dateIso: '2026-04-17', mileageMi: 1800, intervalMi: 250,
    });
    const e = useStore.getState().serviceEntries[0];
    expect(e.serviceAtMi).toBe(2050);
  });
});
```

**Step 2: Run — expect fail**
```bash
npx vitest run src/store/index.test.ts
```
Expected: FAIL (missing actions and state keys).

**Step 3: Implement in `src/store/index.ts`.** Follow existing patterns (`addBottle`/`updateBottle`/`deleteBottle`). Key points:
- Add `bikes: Bike[]` and `serviceEntries: ServiceEntry[]` to `AppState`.
- Initial values: `bikes: []`, `serviceEntries: []`.
- Include them in `AppDataSnapshot` and `replaceAppData`.
- Actions (all use `set((state) => { ... })` with immer):
  - `addBike(input: Omit<Bike, 'id'|'createdAt'|'updatedAt'|'isPrimary'|'odometerSyncedAtIso'>)`: generates id/timestamps, sets `isPrimary: true` if list is empty, `odometerSyncedAtIso: null`.
  - `updateBike(id, updates: Partial<Bike>)`: merges, bumps `updatedAt`.
  - `deleteBike(id)`: removes bike AND `serviceEntries.filter(e => e.bikeId !== id)`. If the deleted bike was primary and any remain, set first remaining as primary.
  - `setPrimaryBike(id)`: sets `isPrimary: true` on matching bike and `false` on all others.
  - `upsertBikesFromStrava(incoming: { stravaGearId, name, odometerMi, isPrimary }[])`: for each incoming, if a bike with matching `stravaGearId` exists, update `cachedOdometerMi`, `name` (only if user hasn't renamed — for v1, always update), `odometerSyncedAtIso = new Date().toISOString()`; else append a new bike. Preserve existing `isPrimary` on known bikes; only use incoming `isPrimary` to seed *new* bikes when the store is empty.
  - `addServiceEntry(input: Omit<ServiceEntry, 'id'|'createdAt'|'updatedAt'|'serviceAtMi'>)`: compute `serviceAtMi = input.mileageMi + input.intervalMi`.
  - `updateServiceEntry(id, updates)`: recompute `serviceAtMi` if `mileageMi` or `intervalMi` changed.
  - `deleteServiceEntry(id)`.
  - `setBikeOdometer(bikeId, odometerMi)`: sets `cachedOdometerMi` and `odometerSyncedAtIso = new Date().toISOString()`.

**Step 4: Run**
```bash
npx vitest run src/store/index.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add src/store/index.ts src/store/index.test.ts
git commit -m "feat(gear): add bikes and serviceEntries store slices"
```

---

## Task 3: deriveDue pure function

**Goal:** Data layer for the "what's due" view.

**Files:**
- Create: `src/lib/gear/derive-due.ts`
- Create: `src/lib/gear/derive-due.test.ts`

**Step 1: Failing test**
```ts
import { describe, it, expect } from 'vitest';
import { deriveDue } from './derive-due';
import type { Bike, ServiceEntry } from '@/types/gear';

const bike = (over: Partial<Bike> = {}): Bike => ({
  id: 'b1', name: 'Force E1', stravaGearId: null,
  cachedOdometerMi: 1800, odometerSyncedAtIso: null,
  isPrimary: true, createdAt: 0, updatedAt: 0, ...over,
});
const entry = (over: Partial<ServiceEntry>): ServiceEntry => ({
  id: 'e1', bikeId: 'b1', typeKey: 'chain_wax', dateIso: '2026-04-10',
  mileageMi: 1600, intervalMi: 250, serviceAtMi: 1850,
  createdAt: 0, updatedAt: 0, ...over,
});

describe('deriveDue', () => {
  it('returns empty when no entries exist', () => {
    expect(deriveDue([bike()], [])).toEqual([]);
  });

  it('computes remainingMi = serviceAtMi - cachedOdometerMi', () => {
    const due = deriveDue([bike({ cachedOdometerMi: 1800 })], [entry({ serviceAtMi: 1850 })]);
    expect(due[0].remainingMi).toBe(50);
  });

  it('flags overdue when remaining < 0', () => {
    const due = deriveDue([bike({ cachedOdometerMi: 1900 })], [entry({ serviceAtMi: 1850 })]);
    expect(due[0].urgency).toBe('overdue');
  });

  it('flags soon when remaining <= 10% of interval', () => {
    const due = deriveDue(
      [bike({ cachedOdometerMi: 1825 })],
      [entry({ serviceAtMi: 1850, intervalMi: 250 })],
    );
    expect(due[0].urgency).toBe('soon');
  });

  it('uses the latest entry per (bike, typeKey) pair', () => {
    const due = deriveDue(
      [bike({ cachedOdometerMi: 1900 })],
      [
        entry({ id: 'e1', dateIso: '2026-01-01', mileageMi: 1000, serviceAtMi: 1250 }),
        entry({ id: 'e2', dateIso: '2026-04-10', mileageMi: 1750, serviceAtMi: 2000 }),
      ],
    );
    expect(due).toHaveLength(1);
    expect(due[0].lastEntry.id).toBe('e2');
    expect(due[0].remainingMi).toBe(100);
  });

  it('sorts ascending by remainingMi (most urgent first)', () => {
    const due = deriveDue(
      [bike({ cachedOdometerMi: 1900 })],
      [
        entry({ id: 'e1', typeKey: 'tires', serviceAtMi: 4000, intervalMi: 2500 }),
        entry({ id: 'e2', typeKey: 'chain_wax', serviceAtMi: 1850, intervalMi: 250 }),
      ],
    );
    expect(due.map((d) => d.typeKey)).toEqual(['chain_wax', 'tires']);
  });

  it('skips bikes with null cachedOdometerMi', () => {
    const due = deriveDue([bike({ cachedOdometerMi: null })], [entry({})]);
    expect(due).toEqual([]);
  });
});
```

**Step 2: Run — expect fail**
```bash
npx vitest run src/lib/gear/derive-due.test.ts
```

**Step 3: Implement `src/lib/gear/derive-due.ts`**
```ts
import type { Bike, ServiceEntry, ServiceTypeKey } from '@/types/gear';

export interface DueItem {
  bikeId: string;
  typeKey: ServiceTypeKey;
  lastEntry: ServiceEntry;
  remainingMi: number;
  urgency: 'overdue' | 'soon' | 'ok';
}

export function deriveDue(bikes: Bike[], entries: ServiceEntry[]): DueItem[] {
  const items: DueItem[] = [];
  for (const b of bikes) {
    if (b.cachedOdometerMi == null) continue;
    const byType = new Map<ServiceTypeKey, ServiceEntry>();
    for (const e of entries) {
      if (e.bikeId !== b.id) continue;
      const prev = byType.get(e.typeKey);
      if (!prev || e.dateIso > prev.dateIso) byType.set(e.typeKey, e);
    }
    for (const [typeKey, last] of byType) {
      const remainingMi = last.serviceAtMi - b.cachedOdometerMi;
      const soonThreshold = last.intervalMi * 0.1;
      const urgency: DueItem['urgency'] =
        remainingMi < 0 ? 'overdue' : remainingMi <= soonThreshold ? 'soon' : 'ok';
      items.push({ bikeId: b.id, typeKey, lastEntry: last, remainingMi, urgency });
    }
  }
  return items.sort((a, b) => a.remainingMi - b.remainingMi);
}
```

**Step 4: Run — expect pass**
```bash
npx vitest run src/lib/gear/derive-due.test.ts
```

**Step 5: Commit**
```bash
git add src/lib/gear/derive-due.ts src/lib/gear/derive-due.test.ts
git commit -m "feat(gear): add deriveDue pure function with urgency classification"
```

---

## Task 4: Strava gear edge function

**Goal:** Server-side endpoint that calls Strava `/athlete` and returns `bikes[]`. Mirrors [supabase/functions/strava-token-exchange/index.ts](../supabase/functions/strava-token-exchange/index.ts).

**Files:**
- Create: `supabase/functions/strava-gear-list/index.ts`

**Step 1: Scaffold function.** Create `supabase/functions/strava-gear-list/index.ts`:
```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface StravaAthleteResponse {
  bikes?: Array<{
    id: string;
    name?: string;
    nickname?: string;
    distance?: number; // meters, lifetime
    primary?: boolean;
  }>;
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function refreshAccessToken(
  refreshToken: string, clientId: string, clientSecret: string,
): Promise<{ access_token: string; refresh_token: string; expires_at: number } | null> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId, client_secret: clientSecret,
      grant_type: 'refresh_token', refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, { status: 401 });

    const supabaseUrl = getEnv('SUPABASE_URL');
    const anonKey = getEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = getEnv('STRAVA_CLIENT_ID');
    const clientSecret = getEnv('STRAVA_CLIENT_SECRET');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: tokenRow, error: tokenError } = await serviceClient
      .from('strava_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow) return jsonResponse({ error: 'Strava not connected' }, { status: 404 });

    let accessToken = tokenRow.access_token;
    const nowSec = Math.floor(Date.now() / 1000);
    if (tokenRow.expires_at && tokenRow.expires_at <= nowSec + 60) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token, clientId, clientSecret);
      if (!refreshed) return jsonResponse({ error: 'Token refresh failed' }, { status: 502 });
      accessToken = refreshed.access_token;
      await serviceClient.from('strava_tokens').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userData.user.id);
    }

    const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!athleteRes.ok) {
      const details = await athleteRes.text();
      return jsonResponse({ error: 'Strava athlete fetch failed', details }, { status: 502 });
    }

    const athlete = (await athleteRes.json()) as StravaAthleteResponse;
    const bikes = (athlete.bikes ?? []).map((b) => ({
      stravaGearId: String(b.id),
      name: b.nickname || b.name || 'Bike',
      odometerMi: typeof b.distance === 'number' ? b.distance / 1609.344 : 0,
      isPrimary: Boolean(b.primary),
    }));

    return jsonResponse({ bikes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, { status: 500 });
  }
});
```

**Step 2: Deploy (manual — requires Supabase CLI).** The user will deploy; document it here but do NOT run blindly.
```bash
# Only when ready to deploy
supabase functions deploy strava-gear-list --project-ref <ref>
```

**Step 3: Commit**
```bash
git add supabase/functions/strava-gear-list/index.ts
git commit -m "feat(gear): add strava-gear-list edge function"
```

---

## Task 5: Client Strava gear service + hook

**Goal:** Typed client wrapper + React hook with 10-minute cache.

**Files:**
- Create: `src/lib/gear/strava-gear.ts`
- Create: `src/lib/gear/strava-gear.test.ts`
- Create: `src/hooks/use-strava-gear.ts`

**Step 1: Failing test for the mapper** (`src/lib/gear/strava-gear.test.ts`)
```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchStravaBikes } from './strava-gear';
import type { SupabaseClient } from '@supabase/supabase-js';

function mockSupabase(response: unknown, error: Error | null = null): SupabaseClient {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: response, error }),
    },
  } as unknown as SupabaseClient;
}

describe('fetchStravaBikes', () => {
  it('returns normalized bike array from edge function', async () => {
    const supabase = mockSupabase({
      bikes: [
        { stravaGearId: 'b1', name: 'Force E1', odometerMi: 1120.5, isPrimary: true },
      ],
    });
    const bikes = await fetchStravaBikes(supabase);
    expect(bikes).toEqual([
      { stravaGearId: 'b1', name: 'Force E1', odometerMi: 1120.5, isPrimary: true },
    ]);
  });

  it('throws when the edge function returns an error', async () => {
    const supabase = mockSupabase(null, new Error('boom'));
    await expect(fetchStravaBikes(supabase)).rejects.toThrow('boom');
  });

  it('returns empty array when athlete has no bikes', async () => {
    const supabase = mockSupabase({ bikes: [] });
    expect(await fetchStravaBikes(supabase)).toEqual([]);
  });
});
```

**Step 2: Run — expect fail**
```bash
npx vitest run src/lib/gear/strava-gear.test.ts
```

**Step 3: Implement `src/lib/gear/strava-gear.ts`**
```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface StravaBike {
  stravaGearId: string;
  name: string;
  odometerMi: number;
  isPrimary: boolean;
}

export async function fetchStravaBikes(supabase: SupabaseClient): Promise<StravaBike[]> {
  const { data, error } = await supabase.functions.invoke<{ bikes: StravaBike[] }>(
    'strava-gear-list',
    { body: {} },
  );
  if (error) throw error;
  return data?.bikes ?? [];
}
```

**Step 4: Implement hook** — `src/hooks/use-strava-gear.ts`
```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fetchStravaBikes, type StravaBike } from '@/lib/gear/strava-gear';

const CACHE_MS = 10 * 60 * 1000;

export interface UseStravaGearResult {
  bikes: StravaBike[] | null;
  isFetching: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  refresh: () => Promise<void>;
}

export function useStravaGear(options: { autoFetch?: boolean } = {}): UseStravaGearResult {
  const { autoFetch = true } = options;
  const [bikes, setBikes] = useState<StravaBike[] | null>(null);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    setFetching(true);
    setError(null);
    const p = (async () => {
      try {
        const result = await fetchStravaBikes(supabase);
        setBikes(result);
        setLastSyncedAt(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Strava fetch failed');
      } finally {
        setFetching(false);
        inflight.current = null;
      }
    })();
    inflight.current = p;
    return p;
  }, []);

  useEffect(() => {
    if (!autoFetch) return;
    if (lastSyncedAt && Date.now() - lastSyncedAt < CACHE_MS) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  return { bikes, isFetching, error, lastSyncedAt, refresh };
}
```

**Step 5: Run tests + build**
```bash
npx vitest run src/lib/gear/strava-gear.test.ts
npm run build
```

**Step 6: Commit**
```bash
git add src/lib/gear/strava-gear.ts src/lib/gear/strava-gear.test.ts src/hooks/use-strava-gear.ts
git commit -m "feat(gear): add Strava bike fetch client + useStravaGear hook"
```

---

## Task 6: Routing + nav slot

**Goal:** Add `/gear` route and a 6th nav slot on mobile + desktop. Empty page OK for this commit.

**Files:**
- Create: `src/pages/gear.tsx` (stub)
- Modify: `src/App.tsx`
- Modify: `src/components/layout/mobile-nav.tsx` (grid-cols-5 → grid-cols-6)
- Modify: `src/components/layout/header.tsx`

**Step 1:** Create `src/pages/gear.tsx`:
```tsx
import { PageIntro } from '@/components/layout/page-intro';

export function GearPage() {
  return (
    <div className="page-shell">
      <PageIntro
        title="Gear"
        description="Track maintenance and service intervals for your bikes."
      />
    </div>
  );
}
```

**Step 2:** Wire the route in `src/App.tsx`. Add the import and the `<Route>`:
```tsx
import { GearPage } from '@/pages/gear';
// ...
<Route path="/gear" element={<GearPage />} />
```

**Step 3:** In `src/components/layout/mobile-nav.tsx`:
- Insert `{ path: '/gear', label: 'Gear' }` into `navItems` before the Account entry.
- Change `grid-cols-5` → `grid-cols-6`.

**Step 4:** In `src/components/layout/header.tsx`, add the same `{ path: '/gear', label: 'Gear' }` to the `navItems` array.

**Step 5:** Manually verify in dev:
```bash
npm run dev
```
Open `http://localhost:5173/gear` — page renders, nav shows "Gear" slot, route highlights when active. Exercise on a mobile viewport (responsive dev tools) to confirm the 6-slot bar fits.

**Step 6:** Lint + build
```bash
npm run lint
npm run build
```

**Step 7: Commit**
```bash
git add src/pages/gear.tsx src/App.tsx src/components/layout/mobile-nav.tsx src/components/layout/header.tsx
git commit -m "feat(gear): add /gear route and nav slot"
```

---

## Task 7: Gear page — bike pills + tabs shell

**Goal:** Render the top-of-page controls (bike pill row with refresh button) and the `Due | History` tab switcher. Tabs are empty for this commit.

**Files:**
- Modify: `src/pages/gear.tsx`
- Create: `src/components/gear/bike-pill-row.tsx`
- Create: `src/components/gear/gear-tabs.tsx`

**Step 1:** Create `src/components/gear/bike-pill-row.tsx` — horizontally scrolling row of pill buttons, one per bike, with an active-bike visual state. Include a `↻` refresh button and a "synced Xm ago" label using `lastSyncedAt` from `useStravaGear`. On click of refresh → call `refresh()` then `useStore.getState().upsertBikesFromStrava(bikes)` when fresh bikes land.

Use existing tokens: active pill → `bg-brand-100 text-brand-900`; inactive → `text-ink-700 bg-white hover:bg-shell-50` (mirror header pattern at [src/components/layout/header.tsx](../src/components/layout/header.tsx)).

**Step 2:** Create `src/components/gear/gear-tabs.tsx` — controlled segmented control taking `value: 'due' | 'history'` and `onChange`. Reuse the planner's tab styling — grep planner for the pattern:
```bash
grep -rn "role=\"tablist\"" src/components/planner src/pages 2>/dev/null
```
If a shared tab primitive exists, use it; otherwise, compose inline with Tailwind matching the brand-100 active + shell-50 hover pattern.

**Step 3:** Update `src/pages/gear.tsx` to render: `PageIntro` (with `+ Log service` button in `actions` — wire later), `BikePillRow`, `GearTabs`, and an empty tab panel.

Manage UI state with `useState<'due' | 'history'>('due')` and `useState<string | null>(selectedBikeId)` (default to the primary bike).

**Step 4:** Dev check — `npm run dev`, confirm the page renders with Strava bikes populating. If Strava disconnected, show empty state "Connect Strava to auto-track bike mileage — [Connect]" linking to Account.

**Step 5:** Lint + build.

**Step 6: Commit**
```bash
git add src/pages/gear.tsx src/components/gear/
git commit -m "feat(gear): add bike pill row and tab shell"
```

---

## Task 8: Due tab list

**Goal:** Render `deriveDue` output as a list of cards. Empty state when nothing is due (or no entries yet).

**Files:**
- Create: `src/components/gear/due-list.tsx`
- Create: `src/components/gear/due-list.test.tsx`
- Modify: `src/pages/gear.tsx`

**Step 1: Test** (`src/components/gear/due-list.test.tsx`)
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DueList } from './due-list';

describe('DueList', () => {
  it('shows empty state when items is empty', () => {
    render(<DueList items={[]} bikes={[]} />);
    expect(screen.getByText(/nothing due/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run — expect fail, then implement.**

`src/components/gear/due-list.tsx`:
- Takes `items: DueItem[]`, `bikes: Bike[]`, optional `onLog(bikeId, typeKey)`.
- Renders one card per item with: type label + bike name header, remaining miles line (`-12 mi` or `47 mi · 250 interval`), urgency color (`text-red-600` for overdue, `text-amber-700` for soon, `text-ink-700` for ok), and a `Mark done ▸` button on the right.
- Empty state: `"Nothing due — log a service to start tracking."`

Import: `getServiceType` from `@/lib/gear/service-types` for labels.

**Step 3:** Wire in `src/pages/gear.tsx`: use `useStore` selectors for `bikes` and `serviceEntries`, compute `const dueItems = useMemo(() => deriveDue(bikes, entries), [bikes, entries])`, pass to `<DueList>` when tab is `'due'`. Optionally filter by `selectedBikeId`.

**Step 4:** Run vitest + lint + build. Manually verify in dev by seeding a bike + entry via the store devtools or by briefly adding a dev-only seed button behind an env check (remove before commit).

**Step 5: Commit**
```bash
git add src/components/gear/due-list.tsx src/components/gear/due-list.test.tsx src/pages/gear.tsx
git commit -m "feat(gear): render 'What's due' tab"
```

---

## Task 9: History tab

**Goal:** Grouped collapsible lists by service type.

**Files:**
- Create: `src/components/gear/history-list.tsx`
- Modify: `src/pages/gear.tsx`

**Step 1:** Build `HistoryList` taking `entries: ServiceEntry[]`, `bikes: Bike[]`. Group by `typeKey` using `SERVICE_TYPES` order. Each group is a `<Collapsible>` (reuse [src/components/ui/collapsible.tsx](../src/components/ui/collapsible.tsx)) with header `Chain wax (7)` and sorted-desc rows `MM/DD/YYYY · 1,815 mi → 2,065 · Force E1`.

**Step 2:** Wire into `src/pages/gear.tsx` for `tab === 'history'`.

**Step 3:** Lint + build. Quick visual check in dev.

**Step 4: Commit**
```bash
git add src/components/gear/history-list.tsx src/pages/gear.tsx
git commit -m "feat(gear): add history tab grouped by service type"
```

---

## Task 10: Quick-add sheet

**Goal:** The fast-path form. Bottom sheet on mobile, modal on desktop. Saves a `ServiceEntry`.

**Files:**
- Create: `src/components/gear/log-service-sheet.tsx`
- Create: `src/components/gear/log-service-sheet.test.tsx`
- Modify: `src/pages/gear.tsx`

**Validation (per design doc):**
- `mileageMi >= latestEntryForSameBike.mileageMi` (error: `"Mileage must be ≥ your last logged mileage (X)"`)
- `intervalMi > 0`
- `dateIso <= today`

**Step 1: Failing test** covering the happy path (select service, pick bike, mileage pre-filled from Strava cache, Save → new entry appears in store) and the mileage-monotonicity error.

**Step 2: Implement** following the design's wireframe:
- Service type chip row (preset icons optional — text labels are fine for v1).
- Bike select (defaults to primary).
- Date input (defaults to today).
- Mileage input with `↻` button that calls `refresh()` from `useStravaGear` and patches the field with the matching bike's `odometerMi`. Shows `synced Xm ago` subtitle.
- `Advanced ▾` disclosure showing the `Interval` numeric input (prefilled from the preset's default).
- Computed line: `Next service at {mileageMi + intervalMi} mi`.
- Save button → `addServiceEntry(...)` + close.

**Container:** If you already have a sheet/modal primitive, reuse it. If not, implement a minimal `<dialog>`-based sheet with `md:max-w-md md:rounded-2xl` behavior. Keep scope small — no new abstraction unless 2+ callers need it.

**Step 3:** Wire the `+ Log service` button in `PageIntro.actions` to open the sheet. Also pass a `preselectedTypeKey` when opening from a Due card's `Mark done ▸` button.

**Step 4:** Run tests + lint + build. Manual dev test: log a chain wax entry and verify it appears in the Due tab with urgency recomputed.

**Step 5: Commit**
```bash
git add src/components/gear/log-service-sheet.tsx src/components/gear/log-service-sheet.test.tsx src/pages/gear.tsx
git commit -m "feat(gear): add quick-add log service sheet"
```

---

## MVP SHIP GATE — Tasks 1–10 complete

At this point the feature is shippable. Run the full suite before opening the PR:
```bash
npm run lint
npx vitest run
npm run build
```
All green → open PR to `main`:
```bash
gh pr create --title "feat(gear): add /gear maintenance tracker" --body "$(cat <<'EOF'
## Summary
- New /gear area with multi-bike support and Strava odometer sync
- Four preset service types (chain wax, chain, brake pads, tires)
- "What's due" view + history tab + quick-add sheet
- Passive tracking only — no push notifications in v1

## Test plan
- [ ] Fresh user: /gear shows Strava-disconnected empty state
- [ ] Connected user: bikes auto-populate, odometer synced
- [ ] Log a chain wax entry → appears in Due with correct urgency
- [ ] Overdue item renders red; "soon" renders amber
- [ ] History tab groups by service type, sorted newest-first
- [ ] Mileage-monotonicity error fires when entering mileage below last entry

Design: Plans/2026-04-17-gear-maintenance-tracker.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task 11 (post-MVP): Manage bikes page

**Goal:** Small CRUD page for bikes — rename, set primary, unlink, delete, add manual bike, refresh Strava.

**Files:**
- Create: `src/pages/gear-bikes.tsx`
- Modify: `src/App.tsx` — add `<Route path="/gear/bikes" element={<GearBikesPage />} />`
- Modify: `src/pages/gear.tsx` — link at bottom: "Manage bikes →"

**Implementation sketch:** list of cards per bike with inline edit for name, primary toggle (triggers `setPrimaryBike`), `Unlink from Strava` (sets `stravaGearId: null`), `Delete` with confirm. Top: `[+ Add manual bike]` button opens small dialog (name + starting odometer), `[Refresh from Strava]` calls `useStravaGear().refresh()` then `upsertBikesFromStrava`.

**Commit:** `feat(gear): add manage bikes page`

---

## Task 12 (post-MVP): Edit entry sheet

**Goal:** Tapping a history row opens the same form prefilled, with a Delete button.

**Files:**
- Modify: `src/components/gear/log-service-sheet.tsx` — accept optional `entryId?: string` prop; when present, load the entry and call `updateServiceEntry` on save. Add Delete action.
- Modify: `src/components/gear/history-list.tsx` — row click opens sheet with `entryId`.

**Commit:** `feat(gear): allow editing and deleting service entries`

---

## Testing checklist (applies across tasks)

- **Unit**: `deriveDue`, service-type constants, `strava-gear` mapper, store slice actions.
- **Integration** (light, consistent with existing app): `<DueList>` empty state, `<LogServiceSheet>` save + mileage validation.
- **Manual**: exercise the full flow in `npm run dev` on both mobile viewport (375px) and desktop (1440px).

## Follow-ups (not in this plan)

- Supabase cloud sync for `bikes` + `serviceEntries`.
- Push notifications / OS reminders.
- User-defined service types.
- CSV import from the current spreadsheet.

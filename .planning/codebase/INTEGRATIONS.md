# External Integrations

**Analysis Date:** 2026-04-30

## APIs & External Services

**Backend-as-a-Service:**
- Supabase - Postgres, Auth, and Edge Functions for cloud sync and Strava OAuth proxy.
  - SDK/Client: `@supabase/supabase-js` ^2.103.3 (browser) and `npm:@supabase/supabase-js@2` (Edge Function imports, e.g. `supabase/functions/strava-token-exchange/index.ts:2`).
  - Singleton factory: `getSupabaseClient()` in `src/lib/supabase/client.ts:46` (auth options: `autoRefreshToken: true`, `detectSessionInUrl: true`, `persistSession: true`).
  - Auth: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (browser); `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions).
  - Local migration: `supabase/migrations/20260416000000_auth_cloud_sync.sql`.

**Activity / Athlete:**
- Strava - OAuth-based bike inventory and athlete profile import.
  - Client-side OAuth bootstrap: `src/lib/auth/strava-provider.ts` constructs the `https://www.strava.com/oauth/authorize` URL with scope `read,profile:read_all` (`src/lib/auth/strava-provider.ts:6`).
  - Server-side token exchange: Strava `POST https://www.strava.com/oauth/token` is called from the Edge Function `supabase/functions/strava-token-exchange/index.ts:66`.
  - Athlete fetch: `GET https://www.strava.com/api/v3/athlete` invoked from `supabase/functions/strava-gear-list/index.ts:82` (returns `bikes` array).
  - Token refresh: `supabase/functions/strava-gear-list/index.ts:24` (refresh-token flow, triggered when `expires_at` is within 60 seconds).
  - Deauthorize: `POST https://www.strava.com/oauth/deauthorize` at `supabase/functions/strava-disconnect/index.ts:47`.
  - Auth: `VITE_STRAVA_CLIENT_ID`, `VITE_STRAVA_REDIRECT_URI` (browser); `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` (Edge Functions only).
  - Browser-side service wrapper: `src/lib/auth/strava-service.ts` (invokes Edge Functions via `supabase.functions.invoke('strava-token-exchange' | 'strava-disconnect')`).
  - Bike list fetch (browser): `fetchStravaBikes()` in `src/lib/gear/strava-gear.ts:10` invokes the `strava-gear-list` Edge Function.
  - React hook with cache: `useStravaGear` in `src/hooks/use-strava-gear.ts` (10-minute cache via `CACHE_MS`).

**Fonts (CDN):**
- Google Fonts - IBM Plex Sans loaded via `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap')` in `src/index.css:1`.

## Data Storage

**Databases:**
- Supabase Postgres
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (client); `SUPABASE_SERVICE_ROLE_KEY` only in Edge Functions.
  - Client: `@supabase/supabase-js` (PostgREST under the hood).
  - Tables (`supabase/migrations/20260416000000_auth_cloud_sync.sql`):
    - `public.user_state` - Per-user JSONB snapshot of the entire app state. Columns: `user_id` (PK, FK -> `auth.users.id`), `schema_version`, `app_state` (jsonb), `client_updated_at`, `updated_at`. RLS: only `auth.uid() = user_id` can SELECT/INSERT/UPDATE/DELETE.
    - `public.strava_connections` - Public-facing Strava metadata. Columns: `user_id` (PK), `athlete_id`, `athlete_name`, `scopes` (text[]), `connected_at`, `updated_at`. RLS: only owner can SELECT.
    - `public.strava_tokens` - Sensitive OAuth tokens. Columns: `user_id` (PK), `access_token`, `refresh_token`, `expires_at`, `updated_at`. RLS enabled with **no browser policies** - only the service role (Edge Functions) can read/write.
  - Triggers: `set_updated_at` PL/pgSQL function (auto-updates `updated_at`) attached to all three tables.
  - Repository: `SupabaseCloudStateRepository` in `src/lib/cloud/sync.ts:55` (CRUD against `user_state`).

**File Storage:**
- Local browser storage only:
  - `localStorage` key `cycling-nutrition-storage` - Zustand persistence (`src/store/index.ts:1406`).
  - `localStorage` key pattern `cycling-nutrition-cloud-backup:<userId>:<isoTimestamp>` - Pre-restore safety backups (`src/lib/cloud/sync.ts:145`).
  - `sessionStorage` key `strava_oauth_state` - CSRF state for Strava OAuth (`src/lib/auth/strava-provider.ts:5`).
- No Supabase Storage / S3 / blob bucket usage detected.

**Caching:**
- In-memory React cache for Strava gear list (10 minutes) via `lastSyncedAtRef` in `src/hooks/use-strava-gear.ts:5`.
- Module-level cache for the Supabase client instance: `cachedClient` in `src/lib/supabase/client.ts:9`.
- Debounced cloud writer (1200 ms) in `createDebouncedCloudWriter` from `src/lib/cloud/sync.ts:167`, wired up at `src/lib/auth/auth-provider.tsx:229`.
- No external cache (Redis, etc.).

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email magic-link (OTP) sign-in only.
  - Sign-in: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` at `src/lib/auth/auth-provider.tsx:289`.
  - Session management: `supabase.auth.getSession()` + `supabase.auth.onAuthStateChange` at `src/lib/auth/auth-provider.tsx:135-163`.
  - Magic-link callback page: `src/pages/auth-callback.tsx` (route `/auth/callback`, calls `supabase.auth.exchangeCodeForSession`).
  - Sign-out: `supabase.auth.signOut()` at `src/lib/auth/auth-provider.tsx:312`.
  - "Guest mode" fallback when Supabase env vars are missing - app remains usable, persists only to `localStorage` (`src/lib/auth/auth-provider.tsx:60-68`).
- Strava OAuth - Layered on top of Supabase auth (a signed-in Supabase user can additionally connect a Strava account).
  - State token: `nanoid()` stored in `sessionStorage` for CSRF protection (`src/lib/auth/strava-provider.ts:20-31`).
  - Authorization code is exchanged server-side; tokens never reach the browser.
  - Connect entry point: `connectStrava()` in `src/lib/auth/auth-provider.tsx:332`.
  - Callback page: `src/pages/strava-callback.tsx` (route `/auth/strava/callback`).

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, Datadog, Rollbar, or similar SDK detected. Errors surface to the user via UI state (`authMessage`, `syncMessage`, `stravaMessage` in `src/lib/auth/auth-provider.tsx`).

**Logs:**
- Browser `console` only (ad-hoc; no structured logger).
- Edge Functions return JSON error bodies via the `jsonResponse` helper in `supabase/functions/_shared/cors.ts:8`.

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (static SPA) at the `/Cycling-Nutrition/` subpath. SPA fallback achieved by copying `dist/index.html` to `dist/404.html` (`package.json:8`).
- Supabase project (separately hosted) for Postgres + Auth + Edge Functions.

**CI Pipeline:**
- GitHub Actions workflow: `.github/workflows/deploy.yml`.
  - Triggers: `push` to `main` and manual `workflow_dispatch`.
  - Concurrency group `pages` (`cancel-in-progress: true`).
  - Build job: `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, npm cache), `npm ci`, `npm run build` (env vars injected from GitHub Secrets), `actions/upload-pages-artifact@v3`.
  - Deploy job: `actions/deploy-pages@v4`.
- No automated test job - tests (Vitest) are run locally only.
- Edge Functions are deployed out-of-band via the Supabase CLI (no workflow committed for that).

## Environment Configuration

**Required env vars:**

Browser build (Vite, see `.env.example` and `src/lib/supabase/client.ts`, `src/lib/auth/strava-provider.ts`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_AUTH_REDIRECT_URL` (optional override)
- `VITE_STRAVA_CLIENT_ID`
- `VITE_STRAVA_REDIRECT_URI` (optional override)

Edge Functions (see `supabase/functions/strava-token-exchange/index.ts:52-56` and `supabase/functions/strava-gear-list/index.ts:44-48`):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`

**Secrets location:**
- Local development: `.env.local` (gitignored; `.env.example` is the template).
- CI: GitHub Actions repository secrets (referenced in `.github/workflows/deploy.yml:28-33`).
- Edge Function runtime: Supabase project secrets, set via the Supabase CLI / dashboard.
- `strava_tokens` rows are protected by RLS so that only the service role can read them - they are never exposed to the browser.

## Webhooks & Callbacks

**Incoming (browser routes acting as OAuth redirect targets):**
- `GET /auth/callback` - Supabase magic-link return URL. Component: `AuthCallbackPage` (`src/pages/auth-callback.tsx`). Calls `supabase.auth.exchangeCodeForSession(code)`.
- `GET /auth/strava/callback` - Strava OAuth redirect. Component: `StravaCallbackPage` (`src/pages/strava-callback.tsx`). Validates `state` against `sessionStorage`, then invokes the `strava-token-exchange` Edge Function.

**Incoming (Supabase Edge Function endpoints, called by the browser):**
- `POST /functions/v1/strava-token-exchange` - `supabase/functions/strava-token-exchange/index.ts`. Exchanges Strava authorization code for access/refresh tokens; persists tokens via service role; returns athlete metadata.
- `POST /functions/v1/strava-gear-list` - `supabase/functions/strava-gear-list/index.ts`. Refreshes Strava token if needed and returns the athlete's bike list.
- `POST /functions/v1/strava-disconnect` - `supabase/functions/strava-disconnect/index.ts`. Calls Strava deauthorize and clears `strava_tokens` + `strava_connections` rows.
- All three handle CORS preflight (`OPTIONS`) via shared helpers in `supabase/functions/_shared/cors.ts`.

**Outgoing (server-to-server from Edge Functions):**
- `POST https://www.strava.com/oauth/token` - Authorization code exchange and refresh-token flow.
- `GET  https://www.strava.com/api/v3/athlete` - Athlete + bike inventory.
- `POST https://www.strava.com/oauth/deauthorize` - Revoke Strava access.

**Outgoing (browser):**
- Supabase Auth + PostgREST + Edge Function calls (all via the SDK).
- No direct browser-to-Strava API traffic; all Strava interactions are proxied through Edge Functions to keep `STRAVA_CLIENT_SECRET` server-only.

---

*Integration audit: 2026-04-30*

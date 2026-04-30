# Technology Stack

**Analysis Date:** 2026-04-30

## Languages

**Primary:**
- TypeScript ~5.9.3 - All app source under `src/` (`*.ts`, `*.tsx`); `tsconfig.app.json` enables strict mode, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`.
- TypeScript (Deno runtime) - Supabase Edge Functions under `supabase/functions/*/index.ts` (e.g. `supabase/functions/strava-token-exchange/index.ts`).

**Secondary:**
- SQL (PostgreSQL) - Supabase migrations in `supabase/migrations/` (e.g. `supabase/migrations/20260416000000_auth_cloud_sync.sql`).
- CSS - Tailwind v4 entry at `src/index.css` (`@import "tailwindcss"`).

## Runtime

**Environment:**
- Node.js 20 - Pinned in CI at `.github/workflows/deploy.yml:24` (`node-version: '20'`). No `.nvmrc` or `.node-version` file in the repo.
- Browser SPA - Built by Vite, deployed to GitHub Pages.
- Deno (std@0.224.0) - Edge Functions runtime, see `supabase/functions/strava-token-exchange/index.ts:1`.

**Package Manager:**
- npm - `package-lock.json` is committed (CI uses `npm ci` at `.github/workflows/deploy.yml:26`).

## Frameworks

**Core:**
- React 19.2.0 - SPA framework. Entry at `src/main.tsx` uses `createRoot` + `StrictMode`. App shell at `src/App.tsx`.
- React DOM 19.2.0 - DOM renderer.
- React Router DOM 7.13.0 - Routing. `BrowserRouter` configured with `import.meta.env.BASE_URL` as basename in `src/App.tsx:19`.
- Zustand 5.0.11 - State management with `persist` + `immer` middleware. Store defined in `src/store/index.ts` (persist key `cycling-nutrition-storage` at `src/store/index.ts:1406`).

**Testing:**
- Vitest 4.0.18 - Test runner. Co-located `*.test.ts` files (e.g. `src/lib/cloud/sync.test.ts`, `src/lib/gear/strava-gear.test.ts`). Run via `npm run test` or `npm run test:watch`.

**Build/Dev:**
- Vite 7.3.1 - Build/dev server. Config at `vite.config.ts`. Uses `@vitejs/plugin-react` and `@tailwindcss/vite`. Build base path is `/Cycling-Nutrition/` (GitHub Pages subpath); dev base is `/`.
- TypeScript 5.9.3 - Build runs `tsc -b` before `vite build` (see `package.json:8`). Project references via `tsconfig.json` -> `tsconfig.app.json` and `tsconfig.node.json`.
- Tailwind CSS v4.1.18 - Configured via Vite plugin `@tailwindcss/vite` and CSS-first `@theme` block in `src/index.css`. PostCSS 8.5.6 + autoprefixer 10.4.24 are installed devDependencies.
- ESLint 9.39.1 (flat config) - Config at `eslint.config.js`. Uses `@eslint/js`, `typescript-eslint` 8.48.0, `eslint-plugin-react-hooks` 7.0.1, `eslint-plugin-react-refresh` 0.4.24. Ignores `dist` and `.claude`.

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.103.3 - Auth + Postgres + Edge Function client. Singleton in `src/lib/supabase/client.ts`. Used by cloud sync (`src/lib/cloud/sync.ts`) and Strava service (`src/lib/auth/strava-service.ts`).
- `zustand` ^5.0.11 - App state container; persisted to `localStorage` under key `cycling-nutrition-storage`.
- `immer` ^11.1.4 - Used through `zustand/middleware/immer` for ergonomic immutable updates in `src/store/index.ts`.
- `react-router-dom` ^7.13.0 - Client-side routing; routes declared in `src/App.tsx`.
- `nanoid` ^5.1.6 - ID generation for products, gear items, OAuth state. Used in `src/store/index.ts` and `src/lib/auth/strava-provider.ts:21`.
- `clsx` ^2.1.1 - Class merging utility used across `src/components/ui/*` primitives.

**Infrastructure:**
- `tailwindcss` ^4.1.18 + `@tailwindcss/vite` ^4.1.18 - Styling pipeline.
- `postcss` ^8.5.6, `autoprefixer` ^10.4.24 - PostCSS support.

**Declared but not used in `src/`:**
- `zod` ^4.3.6 - Listed in `package.json:23` but no `from 'zod'` imports detected anywhere under `src/`.
- `tailwind-merge` ^3.4.0 - Listed in `package.json:22` but no `from 'tailwind-merge'` imports detected. `clsx` is used directly without `tailwind-merge`.

## Configuration

**Environment:**
- Vite-style `VITE_*` env vars exposed to the client at build time via `import.meta.env`.
- Local development uses `.env.local` (gitignored). Template: `.env.example`.
- CI/production secrets injected from GitHub Secrets in `.github/workflows/deploy.yml:28-33`.
- Required client-side env vars (all read in `src/lib/supabase/client.ts:27-31` and `src/lib/auth/strava-provider.ts:9-12`):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_AUTH_REDIRECT_URL` (optional; falls back to `${origin}${BASE_URL}/auth/callback`)
  - `VITE_STRAVA_CLIENT_ID`
  - `VITE_STRAVA_REDIRECT_URI` (optional; falls back to `${origin}${BASE_URL}/auth/strava/callback`)
- Required server-side env vars (Supabase Edge Functions, read in `supabase/functions/strava-token-exchange/index.ts:52-56` and `supabase/functions/strava-gear-list/index.ts:44-48`):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`

**Build:**
- `vite.config.ts` - React + Tailwind plugins, path alias `@/* -> src/*`, `base` switches to `/Cycling-Nutrition/` for `vite build`.
- `tsconfig.json` - Project references entry.
- `tsconfig.app.json` - App compile target ES2022, JSX `react-jsx`, `moduleResolution: bundler`, `paths` alias `@/* -> src/*`, `strict: true`.
- `tsconfig.node.json` - Node-side config (Vite config, etc.).
- `eslint.config.js` - Flat ESLint config.
- Build output: `dist/` (post-build copies `index.html` to `dist/404.html` for GitHub Pages SPA fallback, `package.json:8`).

## Platform Requirements

**Development:**
- Node.js 20 (matches CI).
- npm install + `npm run dev` (serves on `http://localhost:5173`).
- Optional: Supabase project + Strava developer app to exercise auth/sync flows. App falls back to "guest mode" with localStorage-only when env vars are absent (`src/lib/auth/auth-provider.tsx:60-68`).

**Production:**
- GitHub Pages SPA at the `/Cycling-Nutrition/` subpath (workflow: `.github/workflows/deploy.yml`, jobs `build` + `deploy` using `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`).
- Supabase project hosting auth, Postgres tables, and Edge Functions for Strava token exchange/disconnect/gear list.

---

*Stack analysis: 2026-04-30*

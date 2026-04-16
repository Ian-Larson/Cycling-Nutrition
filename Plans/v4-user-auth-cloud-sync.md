# v4 User Authentication and Cloud Sync

## Summary

- App accounts use Supabase Auth with email magic links.
- Guest mode remains available with local Zustand persistence.
- Signed-in users sync a versioned JSON snapshot to Supabase `user_state`.
- Existing local data uploads on first sign-in if no cloud row exists.
- Existing cloud data restores on sign-in, with a local backup saved first.
- Strava is an optional account connection; this phase stores tokens server-side only and does not import rides.

## Backend Assets

- Apply `supabase/migrations/20260416000000_auth_cloud_sync.sql`.
- Deploy `supabase/functions/strava-token-exchange`.
- Deploy `supabase/functions/strava-disconnect`.
- Set Supabase Edge Function secrets:
  - `STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`

## App Environment

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_AUTH_REDIRECT_URL`
- `VITE_STRAVA_CLIENT_ID`
- `VITE_STRAVA_REDIRECT_URI`

## Verification

- `npm run test`
- `npm run lint`
- `npm run build`

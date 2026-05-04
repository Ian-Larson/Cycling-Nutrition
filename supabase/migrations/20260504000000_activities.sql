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

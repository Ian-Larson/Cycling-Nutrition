create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null check (schema_version >= 1),
  app_state jsonb not null,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_id text not null,
  athlete_name text,
  scopes text[] not null default array[]::text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_state_updated_at on public.user_state;
create trigger set_user_state_updated_at
before update on public.user_state
for each row execute function public.set_updated_at();

drop trigger if exists set_strava_connections_updated_at on public.strava_connections;
create trigger set_strava_connections_updated_at
before update on public.strava_connections
for each row execute function public.set_updated_at();

drop trigger if exists set_strava_tokens_updated_at on public.strava_tokens;
create trigger set_strava_tokens_updated_at
before update on public.strava_tokens
for each row execute function public.set_updated_at();

alter table public.user_state enable row level security;
alter table public.strava_connections enable row level security;
alter table public.strava_tokens enable row level security;

drop policy if exists "Users can read their app snapshot" on public.user_state;
create policy "Users can read their app snapshot"
on public.user_state for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their app snapshot" on public.user_state;
create policy "Users can insert their app snapshot"
on public.user_state for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their app snapshot" on public.user_state;
create policy "Users can update their app snapshot"
on public.user_state for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their app snapshot" on public.user_state;
create policy "Users can delete their app snapshot"
on public.user_state for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their Strava connection" on public.strava_connections;
create policy "Users can read their Strava connection"
on public.strava_connections for select
to authenticated
using (auth.uid() = user_id);

-- No browser-readable policies are created for strava_tokens.
-- Supabase Edge Functions use the service role key to write and delete tokens.

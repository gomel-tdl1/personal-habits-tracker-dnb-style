-- Habits tracker schema. Run once in the Supabase SQL editor.

create table public.trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  emoji text not null default '⚡',
  color text not null default 'cyan'
    check (color in ('cyan', 'magenta', 'uv', 'amber', 'red', 'lime', 'ice', 'white')),
  type text not null check (type in ('check', 'counter', 'number', 'time')),
  goal numeric,
  goal_op text not null default 'gte' check (goal_op in ('gte', 'lte')),
  unit text check (char_length(unit) <= 20),
  step numeric not null default 1 check (step > 0),
  days smallint[] not null default '{}' check (days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.entries (
  tracker_id uuid not null references public.trackers on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  value numeric not null,
  updated_at timestamptz not null default now(),
  primary key (tracker_id, date)
);

create index entries_user_date_idx on public.entries (user_id, date);

create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('heatmap', 'daily_chart', 'streak', 'completion')),
  tracker_ids uuid[] not null default '{}',
  period integer not null default 30 check (period in (7, 30, 90, 365)),
  size text not null default 'M' check (size in ('S', 'M', 'L')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.trackers enable row level security;
alter table public.entries enable row level security;
alter table public.dashboard_widgets enable row level security;

create policy "Own trackers" on public.trackers
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own entries" on public.entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.trackers t where t.id = tracker_id and t.user_id = (select auth.uid()))
  );

create policy "Own widgets" on public.dashboard_widgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

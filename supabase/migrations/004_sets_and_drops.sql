-- Sets trackers and the drops / sets widgets. Run once in the Supabase SQL editor after 003_track_scenes.sql. Safe to run again.

-- Sets tracker: several sets a day (20 + 10 + 15 …) toward a daily goal.
alter table public.trackers drop constraint if exists trackers_type_check;
alter table public.trackers add constraint trackers_type_check
  check (type in ('check', 'counter', 'sets', 'number', 'time'));

-- Each set of the day in the order it was logged; `value` stays their sum.
alter table public.entries add column if not exists sets numeric[];

alter table public.dashboard_widgets drop constraint if exists dashboard_widgets_kind_check;
alter table public.dashboard_widgets add constraint dashboard_widgets_kind_check
  check (kind in ('heatmap', 'daily_chart', 'streak', 'completion', 'drops', 'sets'));

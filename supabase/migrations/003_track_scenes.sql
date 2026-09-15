-- Per-track light shows. Run once in the Supabase SQL editor after 002_tracks.sql. Safe to run again.

-- Tempo column (added after 002 was first published).
alter table public.drop_tracks add column if not exists bpm numeric;

-- Allow the track scenes alongside the synth ones.
alter table public.drop_tracks drop constraint if exists drop_tracks_style_check;
alter table public.drop_tracks add constraint drop_tracks_style_check
  check (style in ('punch', 'circuit', 'ripple', 'kaleido', 'siren', 'speaker', 'rave', 'bounce', 'euphoria', 'anthem'));

-- Move existing tracks from the synth scenes to the scenes made for them.
update public.drop_tracks set style = 'punch' where file like 'delta-heavy-punching-holes.%';
update public.drop_tracks set style = 'circuit' where file like 'metrik-ex-machina.%';
update public.drop_tracks set style = 'ripple' where file like 'ripple-everyday.%';
update public.drop_tracks set style = 'kaleido' where file like 'changing-faces-rave-machine-vip.%';
update public.drop_tracks set style = 'siren' where file like 'sub-focus-alarm.%';
update public.drop_tracks set style = 'speaker' where file like 'flowidus-loboski-amplify.%';

-- Real tracks for the day-complete drop. Run once in the Supabase SQL editor after 001_init.sql.

-- Private bucket: files are readable only by a signed-in user, never by a public link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tracks', 'tracks', false, 20971520, array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave'])
on conflict (id) do nothing;

create policy "Signed-in users read tracks" on storage.objects
  for select to authenticated
  using (bucket_id = 'tracks');

-- One row per file in the bucket. Edit rows in Table Editor; no redeploy needed.
create table public.drop_tracks (
  id uuid primary key default gen_random_uuid(),
  -- Path inside the "tracks" bucket, e.g. "sub-focus-rock-it.mp3".
  file text not null unique,
  artist text not null default '',
  title text not null default '',
  -- Seconds from the start of the file to the first kick of the drop, e.g. 9.65.
  drop_at numeric not null check (drop_at >= 0),
  -- Tempo of the track; guides the beat grid. Empty = detected (around 174).
  bpm numeric check (bpm between 60 and 220),
  -- Light show. Track scenes: punch, circuit, ripple, kaleido, siren, speaker.
  -- Synth scenes: rave, bounce, euphoria, anthem. Empty = a random track scene.
  style text check (style in ('punch', 'circuit', 'ripple', 'kaleido', 'siren', 'speaker', 'rave', 'bounce', 'euphoria', 'anthem')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.drop_tracks enable row level security;

create policy "Signed-in users read tracks" on public.drop_tracks
  for select to authenticated
  using (true);

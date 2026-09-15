import { getSupabase } from "../supabase/client";
import { hasSupabase } from "../supabase/env";
import { analyzeDrop } from "./beats";
import { pickNext, type DropTimeline } from "./drops";
import { SCENES, TRACK_SCENE_IDS, isSceneId, type SceneId } from "./scenes";
import { BAR } from "./tempo";

/**
 * Real tracks for the day-complete drop, stored in the private "tracks" bucket
 * and described in the drop_tracks table. One track is downloaded, decoded and
 * analysed ahead of time so the drop can start the moment the day is closed.
 */

export interface TrackRow {
  id: string;
  file: string;
  artist: string;
  title: string;
  drop_at: number;
  /** Known tempo; null means detect it around 174. */
  bpm: number | null;
  /** Light show; null picks one of the track scenes at random. */
  style: SceneId | null;
}

export interface PreparedTrack {
  row: TrackRow;
  buffer: AudioBuffer;
  /** Seconds into the file where playback starts (a little before the drop). */
  offset: number;
  /** Seconds to play, fade-out included. */
  length: number;
  /** Fades the app adds; zero where the file already starts or ends there. */
  fadeIn: number;
  fadeOut: number;
  timeline: DropTimeline;
}

/**
 * Longest build-up heard before the drop and longest drop after it. Pre-cut
 * excerpts fit inside both, so they play whole; full songs get trimmed.
 */
const LEAD = BAR * 4;
const PLAY = BAR * 16;
export const TRACK_FADE = 1.5;

const LAST_TRACK_KEY = "last-track";
const CACHE_NAME = "drop-tracks-v1";

class TrackLibrary {
  private rows: Promise<TrackRow[]> | null = null;
  private loading = false;
  private ready: PreparedTrack | null = null;

  /** Starts preparing a random track in the background; safe to call repeatedly. */
  prepare() {
    if (!hasSupabase || typeof window === "undefined" || this.ready || this.loading) return;
    this.loading = true;
    this.load()
      .catch((err) => console.warn("Drop track unavailable, the synthesized drop will play", err))
      .finally(() => (this.loading = false));
  }

  /** Hands over the prepared track, if any, and remembers it to avoid repeats. */
  take(): PreparedTrack | null {
    const track = this.ready;
    this.ready = null;
    if (track) store(LAST_TRACK_KEY, track.row.id);
    return track;
  }

  private list(): Promise<TrackRow[]> {
    this.rows ??= Promise.resolve(
      getSupabase().from("drop_tracks").select("id, file, artist, title, drop_at, bpm, style").eq("enabled", true),
    ).then(({ data, error }) => {
      if (error) {
        this.rows = null;
        throw new Error(error.message);
      }
      return (data as TrackRow[]).map((r) => ({ ...r, drop_at: Number(r.drop_at), bpm: r.bpm === null ? null : Number(r.bpm) }));
    });
    return this.rows;
  }

  private async load() {
    const rows = await this.list();
    if (!rows.length) return;
    const row = pickNext(rows, read(LAST_TRACK_KEY));
    const buffer = await decode(await fetchAudio(row.file));

    this.ready = prepareTrack(row, buffer);
  }
}

/** Picks the excerpt around the drop and lines the light show up with the track's beat grid. */
export function prepareTrack(row: TrackRow, buffer: AudioBuffer, randomScene: () => SceneId = randomTrackScene): PreparedTrack {
  const offset = Math.max(0, row.drop_at - LEAD);
  const lead = row.drop_at - offset;
  const length = Math.min(lead + PLAY, buffer.duration - offset);
  // Only fade where the song is trimmed; an excerpt's own fades are left alone.
  const fadeIn = offset > 0 ? 0.3 : 0;
  const fadeOut = offset + length < buffer.duration - 0.01 ? TRACK_FADE : 0;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const grid = analyzeDrop(channels, buffer.sampleRate, {
    from: row.drop_at,
    duration: Math.max(0, length - lead - TRACK_FADE),
    bpmHint: row.bpm ?? 174,
    bpmSearch: row.bpm ? 0.5 : 6,
  });
  const scene = isSceneId(row.style) ? row.style : randomScene();
  const ms = (sec: number) => Math.round((lead + sec) * 1000);

  return {
    row,
    buffer,
    offset,
    length,
    fadeIn,
    fadeOut,
    timeline: {
      style: scene,
      colors: SCENES[scene].colors,
      // The grid refines the stored drop time, so the DROP slam lands on the first beat too.
      dropAt: ms(grid.kicks[0] ?? 0),
      kicks: grid.kicks.map(ms).filter((t) => t >= 0),
      snares: grid.snares.map(ms).filter((t) => t >= 0),
      end: Math.round(length * 1000),
      track: { artist: row.artist, title: row.title },
    },
  };
}

function randomTrackScene(): SceneId {
  return pickNext(TRACK_SCENE_IDS.map((id) => ({ id })), null).id;
}

/** Downloads a file from the private bucket, reusing a local copy when there is one. */
async function fetchAudio(file: string): Promise<ArrayBuffer> {
  const key = `/drop-tracks/${encodeURIComponent(file)}`;
  const cache = "caches" in window ? await caches.open(CACHE_NAME).catch(() => null) : null;
  const hit = await cache?.match(key);
  if (hit) return hit.arrayBuffer();

  const { data, error } = await getSupabase().storage.from("tracks").download(file);
  if (error || !data) throw new Error(error?.message ?? `Missing ${file}`);
  const bytes = await data.arrayBuffer();
  await cache?.put(key, new Response(bytes.slice(0), { headers: { "Content-Type": data.type } })).catch(() => {});
  return bytes;
}

function decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
  // An offline context decodes without touching the audio device.
  return new OfflineAudioContext(2, 1, 44100).decodeAudioData(bytes);
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export const tracks = new TrackLibrary();

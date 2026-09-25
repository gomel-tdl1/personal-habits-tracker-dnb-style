/**
 * App sound cues on top of the DnB synth rack. F minor, 174 BPM.
 * Cues schedule immediately; `goal` returns ms until its hit, `drop` returns a
 * timeline so visuals can land on the same kicks and snares (even when muted).
 */

import { dropTimeline, pickDropStyle, type DropStyleId, type DropTimeline } from "./drops";
import { isNative } from "../native";
import { tapPattern } from "./haptics";
import { Synth } from "./synth";
import { tracks, type PreparedTrack } from "./tracks";
import { BEAT, BEAT_MS } from "./tempo";

export { BAR, BEAT, BEAT_MS, BPM } from "./tempo";

// i – VI – III – VII in F minor, voiced for bright stabs.
const CHORDS = [
  [53, 65, 68, 72, 77],
  [49, 65, 68, 73, 77],
  [56, 63, 68, 72, 75],
  [51, 63, 67, 70, 75],
];
const BASS_ROOTS = [29, 25, 32, 27];
const PENTATONIC = [65, 68, 70, 72, 75, 77, 80, 82, 84, 87, 89];
const LAST_DROP_KEY = "last-drop";
/** Share of drops that use a synthesized drop even when a real track is ready. */
const SYNTH_CHANCE = 0.1;

class Engine {
  private ctx: AudioContext | null = null;
  private cues: Synth | null = null;
  private current: Synth | null = null;
  private playing: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  /** Audio-clock time (seconds) at which the current drop's timeline starts. */
  private clockZero: number | null = null;
  muted = false;

  private context(): AudioContext | null {
    if (typeof window === "undefined" || this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      // Lets iOS play Web Audio even with the ringer switch on silent.
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "playback";
      this.ctx = new AC({ latencyHint: "interactive" });
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private ensure(): Synth | null {
    const ctx = this.context();
    if (!ctx) return null;
    this.cues ??= new Synth(ctx, 0.75);
    return this.cues;
  }

  private start(s: Synth) {
    return s.now + 0.01;
  }

  /** Marking a check habit: chord stab + snare. */
  check(index: number) {
    const s = this.ensure();
    if (!s) return;
    const t = this.start(s);
    s.supersaw(CHORDS[index % 4], t, 0.38, { peak: 0.16, voices: 5 });
    s.snare(t, 0.6);
  }

  /** Counter step: pluck climbing the pentatonic scale with progress (0..1). */
  step(progress: number) {
    const s = this.ensure();
    if (!s) return;
    const t = this.start(s);
    const note = PENTATONIC[Math.round(Math.min(1, progress) * (PENTATONIC.length - 1))];
    s.pluck(note, t, 0.22, 0.14);
    s.hat(t, 0.08);
  }

  /** Logged a number or time: one beat of reese growl. */
  growl(index: number) {
    const s = this.ensure();
    if (!s) return;
    const t = this.start(s);
    s.kick(t, 0.6, 0.5);
    s.reese(t, BASS_ROOTS[index % 4] + 12, BEAT * 1.2, { peak: 0.26 });
  }

  /** Undo / clear. */
  rewind() {
    const s = this.ensure();
    if (s) s.tapeStop(this.start(s));
  }

  /** Goal reached: riser into a sub drop with a chord stab. Returns ms until the hit. */
  goal(index: number): number {
    const s = this.ensure();
    if (!s) return BEAT_MS;
    const t = this.start(s);
    const hit = t + BEAT;
    s.riser(t, BEAT, 0.16);
    s.kick(hit, 1, 0.3);
    s.subDrop(hit, 98, 43, 0.9, 0.7);
    s.supersaw(CHORDS[index % 4], hit, 0.6, { peak: 0.18 });
    s.snare(hit + BEAT, 0.45);
    return BEAT_MS;
  }

  /** Downloads a real track in the background so the next drop can use it. */
  prepareTrack() {
    if (!this.muted) tracks.prepare();
  }

  /**
   * Whole day complete: a real track when one is ready (a synthesized drop now and
   * then, or when none is ready). A drop that is still playing fades out first.
   * Visuals follow the returned timeline.
   */
  drop(): DropTimeline {
    this.stopDrop();
    const track = this.muted || Math.random() < SYNTH_CHANCE ? null : tracks.take();
    if (track) {
      this.clockZero = this.playTrack(track);
      return track.timeline;
    }

    const style = pickDropStyle(readLastDrop());
    writeLastDrop(style.id);
    const ctx = this.context();
    if (!ctx) return dropTimeline(style);
    this.current = new Synth(ctx, 0.75);
    this.clockZero = this.current.now + 0.01;
    style.play(this.current, this.clockZero);
    return dropTimeline(style);
  }

  /**
   * Milliseconds of the current drop's timeline that are coming out of the speakers
   * right now, or null when no drop audio is playing. Visuals follow this clock so
   * they stay on the beat regardless of timer jitter or output latency.
   */
  dropClock(): number | null {
    if (this.clockZero === null || !this.ctx) return null;
    return (heardTime(this.ctx) - this.clockZero) * 1000;
  }

  stopDrop() {
    this.current?.stop();
    this.current = null;
    this.clockZero = null;
    if (this.playing && this.ctx) {
      const t = this.ctx.currentTime;
      this.playing.gain.gain.cancelScheduledValues(t);
      this.playing.gain.gain.setTargetAtTime(0, t, 0.03);
      this.playing.source.stop(t + 0.25);
    }
    this.playing = null;
  }

  /** Plays the prepared excerpt as is (fading only where it was trimmed). Returns the audio-clock time playback starts. */
  private playTrack(track: PreparedTrack): number | null {
    const ctx = this.context();
    if (!ctx) return null;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    source.connect(gain);
    const t = ctx.currentTime + 0.03;
    const end = t + track.length;
    const level = 0.9;
    gain.gain.setValueAtTime(track.fadeIn ? 0.0001 : level, t);
    if (track.fadeIn) gain.gain.linearRampToValueAtTime(level, t + track.fadeIn);
    if (track.fadeOut) {
      gain.gain.setValueAtTime(level, end - track.fadeOut);
      gain.gain.linearRampToValueAtTime(0.0001, end);
    }
    source.start(t, track.offset, track.length);
    this.playing = { source, gain };
    return t;
  }

  vibrate(pattern: number | number[]) {
    if (this.muted) return;
    if (isNative) tapPattern(pattern);
    else if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  }
}

/** Audio-clock time of the sound reaching the speakers now, output latency included. */
function heardTime(ctx: AudioContext): number {
  const stamp = ctx.getOutputTimestamp?.();
  if (stamp?.contextTime && stamp.performanceTime) return stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000;
  return ctx.currentTime - (ctx.baseLatency || 0) - (ctx.outputLatency || 0);
}

function readLastDrop(): DropStyleId | null {
  try {
    return localStorage.getItem(LAST_DROP_KEY) as DropStyleId | null;
  } catch {
    return null;
  }
}

function writeLastDrop(id: DropStyleId) {
  try {
    localStorage.setItem(LAST_DROP_KEY, id);
  } catch {}
}

export const sound = new Engine();

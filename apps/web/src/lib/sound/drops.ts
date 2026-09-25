import type { SceneId } from "./scenes";
import type { Synth } from "./synth";
import { BAR, BEAT, S16 } from "./tempo";

/**
 * Day-complete drops. Each style is a one-bar build-up followed by DROP_BARS bars,
 * written as sixteenth-note patterns so the visuals can follow the same grid.
 */

export const DROP_BARS = 4;

export type DropStyleId = "rave" | "bounce" | "euphoria" | "anthem";

export interface DropStyle {
  id: DropStyleId;
  /** Kick and snare steps (0–15) per bar; visuals pump on these. */
  kick: number[];
  snare: number[];
  /** Stage colors for this style's light show. */
  colors: string[];
  play: (s: Synth, t: number) => void;
}

export interface DropTimeline {
  style: SceneId;
  colors: string[];
  /** All values are milliseconds from the moment the drop was triggered. */
  dropAt: number;
  kicks: number[];
  snares: number[];
  end: number;
  /** Set when a real track plays instead of the synthesized drop. */
  track?: { artist: string; title: string };
}

const at = (drop: number, bar: number, step: number) => drop + bar * BAR + step * S16;

/* ---------- Shared build-up ---------- */

/** Silence right before the drop; the hit lands harder after it. */
const GAP = S16 * 2;

function build(s: Synth, t: number, chord: number[]) {
  s.riser(t, BAR - GAP, 0.28);
  s.roll(t, BAR - GAP);
  // The filter opens across the bar, then everything cuts out for the gap.
  s.supersaw(chord, t, BAR - GAP, { peak: 0.1, cutoff: [300, 6000], attack: BAR * 0.6, sustain: true, reverb: 0.15, delay: 0 });
  s.subDrop(t + BAR - BEAT, 55, 30, BEAT - GAP, 0.35);
}

function impact(s: Synth, d: number, chord: number[]) {
  s.crash(d, 0.26);
  s.subDrop(d, 120, 36, 1.2, 0.75);
  s.downlifter(d + 0.02, BAR, 0.14);
  s.supersaw(chord, d, BEAT * 1.4, { peak: 0.2, cutoff: [9000, 900] });
}

/** Drums for every bar, kicks in chronological order (the sidechain relies on it). */
function drums(
  s: Synth,
  d: number,
  style: Pick<DropStyle, "kick" | "snare">,
  { hats = [2, 6, 10, 14], shaker = true, clapOn = [12], ghost = [] as number[], kickDuck = 0.15 } = {},
) {
  for (let bar = 0; bar < DROP_BARS; bar++) {
    for (const step of style.kick) s.kick(at(d, bar, step), step === 0 ? 1 : 0.9, kickDuck);
    for (const step of style.snare) {
      s.snare(at(d, bar, step), 0.75);
      if (clapOn.includes(step)) s.clap(at(d, bar, step), 0.45);
    }
    for (const step of ghost) s.snare(at(d, bar, step), 0.14, 0.1);
    for (const step of hats) s.hat(at(d, bar, step), 0.11, step % 4 === 2, (step % 8) / 8 - 0.4);
    if (shaker) for (let step = 0; step < 16; step++) if (!hats.includes(step)) s.hat(at(d, bar, step), 0.035, false, step % 2 ? 0.5 : -0.5);
  }
}

/* ---------- Rave — Sub Focus ---------- */
// F minor. Rolling octave bass, rave stabs, hoover riff on the answer bars.

const RAVE_CHORDS = [
  [65, 68, 72, 77],
  [65, 68, 72, 77],
  [61, 65, 68, 73],
  [63, 67, 70, 75],
];
const RAVE_ROOTS = [29, 29, 25, 27];

const rave: DropStyle = {
  id: "rave",
  kick: [0, 10],
  snare: [4, 12],
  colors: ["#27E8F5", "#F2F4FF", "#FF2E88", "#5AA9FF"],
  play(s, t) {
    const d = t + BAR;
    build(s, t, RAVE_CHORDS[0]);
    impact(s, d, RAVE_CHORDS[0]);
    drums(s, d, rave, { clapOn: [4, 12] });
    for (let bar = 0; bar < DROP_BARS; bar++) {
      const root = RAVE_ROOTS[bar];
      const roll = [
        [0, 0, 3],
        [3, 12, 2],
        [6, 0, 2],
        [8, 0, 3],
        [11, 12, 2],
        [14, 7, 2],
      ];
      for (const [step, oct, len] of roll) s.reese(at(d, bar, step), root + 12 + oct, S16 * len, { peak: 0.26, cutoff: 900, lfoDepth: 500 });
      s.sub(at(d, bar, 0), root + 12, S16 * 6, 0.5);
      s.sub(at(d, bar, 8), root + 12, S16 * 8, 0.5);
      if (bar % 2 === 0) {
        for (const step of [0, 3, 6, 10]) s.supersaw(RAVE_CHORDS[bar], at(d, bar, step), S16 * 1.6, { peak: 0.15, cutoff: [9000, 1200] });
      } else {
        const riff = [
          [0, 77, 3],
          [3, 75, 3],
          [6, 72, 2],
          [8, 75, 2],
          [10, 80, 4],
          [14, 77, 2],
        ];
        for (const [step, note, len] of riff) s.hoover(at(d, bar, step), note - 12, S16 * len, 0.15);
      }
    }
  },
};

/* ---------- Bounce — Culture Shock ---------- */
// G minor. Bouncy kick, yo-yo reese bends and fast wobbles, brass stabs.

const BOUNCE_ROOTS = [31, 31, 27, 34];
const BOUNCE_CHORD = [67, 70, 74, 79];

const bounce: DropStyle = {
  id: "bounce",
  kick: [0, 7, 10],
  snare: [4, 12],
  colors: ["#FFB020", "#FF3B3B", "#F2F4FF", "#FF2E88"],
  play(s, t) {
    const d = t + BAR;
    build(s, t, BOUNCE_CHORD);
    impact(s, d, BOUNCE_CHORD);
    drums(s, d, bounce, { clapOn: [4, 12], hats: [2, 6, 14], kickDuck: 0.08 });
    for (let bar = 0; bar < DROP_BARS; bar++) {
      const root = BOUNCE_ROOTS[bar] + 12;
      s.wobble(at(d, bar, 0), root, S16 * 5, { rate: 2 / BEAT, lo: 120, hi: 1500, peak: 0.34 });
      s.reese(at(d, bar, 7), root + 12, S16 * 3, { peak: 0.3, cutoff: 1400, bendTo: root + 5, lfoDepth: 700 });
      s.wobble(at(d, bar, 10), root + 3, S16 * 6, { rate: bar % 2 ? 6 / BEAT : 4 / BEAT, lo: 200, hi: 2600, peak: 0.32 });
      s.sub(at(d, bar, 0), root, S16 * 5, 0.55);
      s.sub(at(d, bar, 10), root + 3, S16 * 6, 0.5);
      if (bar % 2 === 0) s.supersaw(BOUNCE_CHORD, at(d, bar, 0), S16 * 2, { peak: 0.14, cutoff: [5000, 600], voices: 5 });
      else s.vocal(at(d, bar, 14), 67, S16 * 2, "a", 0.2);
    }
  },
};

/* ---------- Euphoria — Metrik ---------- */
// A♭ major. Pumping pads, sixteenth arps, rolling reese, a top-line lead.

const EUPHORIA_CHORDS = [
  [56, 60, 63, 68, 72],
  [53, 60, 65, 68, 72],
  [49, 61, 65, 68, 73],
  [51, 58, 63, 67, 70],
];
const EUPHORIA_ROOTS = [32, 29, 25, 27];

const euphoria: DropStyle = {
  id: "euphoria",
  kick: [0, 10],
  snare: [4, 12],
  colors: ["#FFB020", "#FF2E88", "#27E8F5", "#B6FF3B"],
  play(s, t) {
    const d = t + BAR;
    build(s, t, EUPHORIA_CHORDS[0]);
    impact(s, d, EUPHORIA_CHORDS[0]);
    drums(s, d, euphoria, { ghost: [7, 15], hats: [2, 6, 10, 14], kickDuck: 0.12 });
    const lead = [
      [0, 84, 4],
      [4, 82, 2],
      [6, 80, 2],
      [8, 79, 4],
      [12, 80, 4],
    ];
    for (let bar = 0; bar < DROP_BARS; bar++) {
      const chord = EUPHORIA_CHORDS[bar];
      const root = EUPHORIA_ROOTS[bar];
      s.supersaw(chord, at(d, bar, 0), BAR, { peak: 0.11, cutoff: [4200, 2400], sustain: true, attack: 0.01, delay: 0 });
      const tones = [...chord.slice(1), ...chord.slice(1).map((n) => n + 12)];
      const arp = [0, 1, 2, 3, 4, 3, 2, 1];
      for (let step = 0; step < 16; step++) s.pluck(tones[arp[step % 8]] + 12, at(d, bar, step), S16 * 0.9, 0.06, step % 2 ? 0.5 : -0.5);
      for (const [step, oct] of [[0, 0], [3, 0], [6, 12], [10, 0], [13, 7]]) s.reese(at(d, bar, step), root + 12 + oct, S16 * 2.5, { peak: 0.22, cutoff: 700 });
      s.sub(at(d, bar, 0), root + 12, S16 * 8, 0.5);
      s.sub(at(d, bar, 10), root + 12, S16 * 6, 0.5);
      if (bar % 2 === 1) for (const [step, note, len] of lead) s.pluck(note - 12, at(d, bar, step), S16 * len, 0.11);
    }
  },
};

/* ---------- Anthem — Grafix ---------- */
// E♭ minor. Huge sidechained pads, formant vocal chops, talking neuro bass.

const ANTHEM_CHORDS = [
  [51, 58, 63, 66, 70],
  [47, 59, 63, 66, 71],
  [54, 58, 61, 66, 70],
  [49, 58, 61, 65, 68],
];
const ANTHEM_ROOTS = [27, 23, 30, 25];
const ANTHEM_VOX = [
  [70, 68, 66, 63],
  [71, 70, 66, 63],
  [70, 73, 70, 66],
  [68, 65, 68, 70],
];

const anthem: DropStyle = {
  id: "anthem",
  kick: [0, 10],
  snare: [4, 12],
  colors: ["#8B5CFF", "#5AA9FF", "#FF2E88", "#F2F4FF"],
  play(s, t) {
    const d = t + BAR;
    build(s, t, ANTHEM_CHORDS[0]);
    impact(s, d, ANTHEM_CHORDS[0]);
    drums(s, d, anthem, { clapOn: [4, 12], kickDuck: 0.05 });
    for (let bar = 0; bar < DROP_BARS; bar++) {
      const root = ANTHEM_ROOTS[bar] + 12;
      s.supersaw(ANTHEM_CHORDS[bar], at(d, bar, 0), BAR, { peak: 0.19, cutoff: [5000, 2600], sustain: true, attack: 0.01, delay: 0.1 });
      [2, 6, 9, 13].forEach((step, i) => s.vocal(at(d, bar, step), ANTHEM_VOX[bar][i], S16 * 2.5, i % 2 ? "a" : "o", 0.24));
      s.wobble(at(d, bar, 0), root, S16 * 4, { rate: 3 / BEAT, lo: 250, hi: 1900, type: "bandpass", peak: 0.42 });
      s.wobble(at(d, bar, 6), root + 7, S16 * 3, { rate: 4 / BEAT, lo: 300, hi: 2400, type: "bandpass", peak: 0.38 });
      s.wobble(at(d, bar, 10), root, S16 * 6, { rate: bar % 2 ? 6 / BEAT : 2 / BEAT, lo: 200, hi: 1700, type: "bandpass", peak: 0.42 });
    }
  },
};

export const DROP_STYLES: DropStyle[] = [rave, bounce, euphoria, anthem];

export function dropTimeline(style: DropStyle): DropTimeline {
  const ms = (sec: number) => sec * 1000;
  const hits = (steps: number[]) =>
    Array.from({ length: DROP_BARS }, (_, bar) => steps.map((step) => ms(at(BAR, bar, step)))).flat().sort((a, b) => a - b);
  return {
    style: style.id,
    colors: style.colors,
    dropAt: ms(BAR),
    kicks: hits(style.kick),
    snares: hits(style.snare),
    end: ms(BAR * (1 + DROP_BARS)),
  };
}

/** Random item, never the same one twice in a row (unless it is the only one). */
export function pickNext<T extends { id: string }>(items: T[], lastId: string | null, random: () => number = Math.random): T {
  const pool = items.length > 1 ? items.filter((i) => i.id !== lastId) : items;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** Random style, never the same one twice in a row. */
export function pickDropStyle(last: DropStyleId | null, random: () => number = Math.random): DropStyle {
  return pickNext(DROP_STYLES, last, random);
}

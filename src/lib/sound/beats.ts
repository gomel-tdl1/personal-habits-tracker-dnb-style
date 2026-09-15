/**
 * Beat grid for a real drum & bass drop, so the light show lands on the beat.
 *
 * Kick patterns can't be told apart from bass notes reliably, but the eighth-note
 * grid can: hats, snares and kicks all sit on it. So this finds the tempo and phase
 * of that grid from drum onsets (low-end thump plus high-end click), anchored at
 * the drop, and returns events on the beat: "kicks" on beats 1 and 3, "snares" on
 * beats 2 and 4.
 */

export interface BeatGrid {
  bpm: number;
  /** Seconds relative to the drop time that was passed in. */
  kicks: number[];
  snares: number[];
}

interface Options {
  /** Seconds into the audio where the drop's first beat lands (roughly). */
  from: number;
  duration: number;
  bpmHint?: number;
  /** How far (BPM) around the hint to search. 0 keeps the hint exactly. */
  bpmSearch?: number;
}

const HOP = 44; // ~1 ms at 44.1 kHz
const WINDOW = 264;
const KICK_SLOTS = [0, 8];
const SNARE_SLOTS = [4, 12];

export function analyzeDrop(
  channels: Float32Array[],
  sampleRate: number,
  { from, duration, bpmHint = 174, bpmSearch = 6 }: Options,
): BeatGrid {
  const onsets = drumOnsets(channels, sampleRate);
  const at = (sec: number) => {
    const i = Math.round((sec * sampleRate) / HOP);
    let m = 0;
    for (let k = i - 2; k <= i + 2; k++) if (k >= 0 && k < onsets.length) m = Math.max(m, onsets[k]);
    return m;
  };
  const end = Math.min(from + duration, (channels[0].length - WINDOW) / sampleRate);

  let best = { score: 0, bpm: bpmHint, offset: 0 };
  const steps = bpmSearch > 0 ? Math.round((bpmSearch * 2) / 0.05) : 0;
  for (let s = 0; s <= steps; s++) {
    const bpm = bpmHint - bpmSearch + s * 0.05;
    const eighth = 30 / bpm;
    // Phase within half an eighth either side of the given drop time, so the grid stays anchored to it.
    for (let offset = -eighth / 2; offset < eighth / 2; offset += 0.0005) {
      let score = 0;
      for (let t = from + offset; t < end; t += eighth) score += at(t);
      if (score > best.score) best = { score, bpm, offset };
    }
  }

  const bpm = Math.round(best.bpm * 100) / 100;
  return best.score > 0 ? grid(bpm, best.offset, duration) : grid(bpmHint, 0, duration);
}

function grid(bpm: number, offset: number, duration: number): BeatGrid {
  const s16 = 60 / bpm / 4;
  const kicks: number[] = [];
  const snares: number[] = [];
  for (let bar = 0; bar * 16 * s16 + offset < duration; bar++) {
    for (const slot of KICK_SLOTS) push(kicks, offset + (bar * 16 + slot) * s16, duration);
    for (const slot of SNARE_SLOTS) push(snares, offset + (bar * 16 + slot) * s16, duration);
  }
  return { bpm, kicks, snares };
}

/** Keeps a beat slightly before the drop time too: the given drop time may be a little late. */
function push(list: number[], t: number, duration: number) {
  if (t > -0.1 && t < duration - 0.05) list.push(Math.round(t * 1000) / 1000);
}

/** Drum onset strength every HOP samples: rise of low-band (< 120 Hz) energy plus rise of click-band (> 2.5 kHz) energy. */
function drumOnsets(channels: Float32Array[], sampleRate: number): Float32Array {
  const len = channels[0].length;
  const kLow = 1 - Math.exp((-2 * Math.PI * 120) / sampleRate);
  const kHigh = 1 - Math.exp((-2 * Math.PI * 2500) / sampleRate);
  // Prefix sums of band energy make every window an O(1) lookup.
  const low = new Float64Array(len + 1);
  const high = new Float64Array(len + 1);
  let a = 0;
  let b = 0;
  let h = 0;
  for (let i = 0; i < len; i++) {
    let x = 0;
    for (const ch of channels) x += ch[i];
    x /= channels.length;
    a += kLow * (x - a);
    b += kLow * (a - b);
    h += kHigh * (x - h);
    low[i + 1] = low[i] + b * b;
    high[i + 1] = high[i] + (x - h) ** 2;
  }
  const n = Math.max(0, Math.floor((len - WINDOW) / HOP));
  const eLow = new Float32Array(n);
  const eHigh = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    const s = j * HOP;
    eLow[j] = Math.log1p(Math.sqrt((low[s + WINDOW] - low[s]) / WINDOW) * 50);
    eHigh[j] = Math.log1p(Math.sqrt((high[s + WINDOW] - high[s]) / WINDOW) * 50);
  }
  const out = new Float32Array(n);
  for (let j = 12; j < n; j++) out[j] = Math.max(0, eLow[j] - eLow[j - 12]) + Math.max(0, eHigh[j] - eHigh[j - 3]);
  return out;
}

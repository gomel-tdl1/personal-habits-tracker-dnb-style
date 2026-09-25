export const BPM = 174;
/** Seconds. */
export const BEAT = 60 / BPM;
export const S16 = BEAT / 4;
export const BAR = BEAT * 4;
export const BEAT_MS = BEAT * 1000;

export const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

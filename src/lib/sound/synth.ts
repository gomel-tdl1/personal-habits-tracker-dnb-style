import { BEAT, midiHz } from "./tempo";

/**
 * Drum & bass instrument rack on Web Audio. Works with a live AudioContext or an
 * OfflineAudioContext (used to render and check drops).
 *
 * Signal flow: drums → mix; melodic/bass → pump (ducked by every kick) → mix;
 * mix → compressor → soft-clip limiter → destination.
 */
export class Synth {
  readonly ctx: BaseAudioContext;
  private master: GainNode;
  private mix: GainNode;
  private pump: GainNode;
  private reverb: ConvolverNode;
  private delay: DelayNode;
  private noise: AudioBuffer;
  private driveCurve: Float32Array<ArrayBuffer>;

  constructor(ctx: BaseAudioContext, volume = 0.9) {
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    // Slow enough to let kick and snare transients punch through.
    comp.attack.value = 0.012;
    comp.release.value = 0.15;

    const limiter = ctx.createWaveShaper();
    limiter.curve = curve(2048, (x) => Math.tanh(x * 1.4) / Math.tanh(1.4));
    limiter.oversample = "2x";

    const master = ctx.createGain();
    master.gain.value = volume;
    this.master = master;

    this.mix = ctx.createGain();
    this.mix.gain.value = 0.55;
    this.mix.connect(comp).connect(limiter).connect(master).connect(ctx.destination);

    this.pump = ctx.createGain();
    this.pump.connect(this.mix);

    this.reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.8);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.reverb.buffer = ir;
    const rev = ctx.createGain();
    rev.gain.value = 0.3;
    this.reverb.connect(rev).connect(this.mix);

    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.3;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3000;
    const del = ctx.createGain();
    del.gain.value = 0.2;
    this.delay.connect(tone).connect(fb).connect(this.delay);
    tone.connect(del).connect(this.mix);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;

    this.driveCurve = curve(1024, (x) => Math.tanh(x * 3.5));
  }

  get now() {
    return this.ctx.currentTime;
  }

  /** Fades this rack out and detaches it; already scheduled notes play into nothing. */
  stop(fade = 0.08) {
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, fade / 3);
    setTimeout(() => this.master.disconnect(), fade * 1000 + 250);
  }

  /* ---------- Plumbing ---------- */

  private gain(value = 1) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    return g;
  }

  private env(param: AudioParam, t: number, peak: number, attack: number, decay: number) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  /** Flat-top envelope for sustained notes. */
  private gate(param: AudioParam, t: number, peak: number, dur: number, attack = 0.005, release = 0.04) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    param.setValueAtTime(peak, t + Math.max(attack, dur - release));
    param.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private sends(node: AudioNode, reverb: number, delay: number) {
    if (reverb) node.connect(this.gain(reverb)).connect(this.reverb);
    if (delay) node.connect(this.gain(delay)).connect(this.delay);
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private noiseSrc(t: number, dur: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
    return src;
  }

  private filter(type: BiquadFilterType, freq: number, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  private drive() {
    const ws = this.ctx.createWaveShaper();
    ws.curve = this.driveCurve;
    return ws;
  }

  private pan(value: number) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = value;
    return p;
  }

  /** Sidechain: dip everything on the pump bus, then swell back. */
  duck(t: number, depth = 0.15, release = BEAT * 0.9) {
    // setTarget starts from whatever the gain is at `t`, so ducks chain smoothly.
    // Kicks must be scheduled in chronological order: cancel drops later automation.
    const g = this.pump.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(depth, t, 0.002);
    g.setTargetAtTime(1, t + 0.03, release / 2.5);
  }

  /* ---------- Drums ---------- */

  kick(t: number, peak = 1, duck = 0.15) {
    const body = this.osc("sine", 230, t, 0.5);
    body.frequency.exponentialRampToValueAtTime(58, t + 0.07);
    body.frequency.exponentialRampToValueAtTime(44, t + 0.4);
    const bg = this.gain();
    this.env(bg.gain, t, peak, 0.002, 0.42);
    const sat = this.drive();
    body.connect(bg).connect(sat).connect(this.gain(0.75)).connect(this.mix);

    const click = this.osc("square", 1600, t, 0.01);
    const cg = this.gain();
    this.env(cg.gain, t, peak * 0.28, 0.001, 0.008);
    click.connect(this.filter("lowpass", 5000)).connect(cg).connect(this.mix);

    const tick = this.noiseSrc(t, 0.02);
    const tg = this.gain();
    this.env(tg.gain, t, peak * 0.35, 0.001, 0.012);
    tick.connect(this.filter("highpass", 3500)).connect(tg).connect(this.mix);

    this.duck(t, duck);
  }

  snare(t: number, peak = 0.7, reverb = 0.35) {
    const body = this.osc("triangle", 200, t, 0.15);
    body.frequency.exponentialRampToValueAtTime(155, t + 0.06);
    const bg = this.gain();
    this.env(bg.gain, t, peak * 0.8, 0.001, 0.11);
    body.connect(bg).connect(this.mix);

    const crack = this.noiseSrc(t, 0.25);
    const cg = this.gain();
    this.env(cg.gain, t, peak, 0.001, 0.2);
    crack.connect(this.filter("bandpass", 2200, 0.6)).connect(cg).connect(this.mix);
    this.sends(cg, reverb, 0);

    const sizzle = this.noiseSrc(t, 0.1);
    const sg = this.gain();
    this.env(sg.gain, t, peak * 0.45, 0.001, 0.07);
    sizzle.connect(this.filter("highpass", 6500)).connect(sg).connect(this.mix);
  }

  clap(t: number, peak = 0.5) {
    for (const [i, dt] of [0, 0.011, 0.023].entries()) {
      const src = this.noiseSrc(t + dt, i === 2 ? 0.2 : 0.02);
      const g = this.gain();
      this.env(g.gain, t + dt, peak * (i === 2 ? 1 : 0.7), 0.001, i === 2 ? 0.16 : 0.012);
      src.connect(this.filter("bandpass", 1300, 1.2)).connect(g).connect(this.mix);
      if (i === 2) this.sends(g, 0.5, 0);
    }
  }

  hat(t: number, peak = 0.1, open = false, pan = 0) {
    const src = this.noiseSrc(t, open ? 0.25 : 0.05);
    const g = this.gain();
    this.env(g.gain, t, peak, 0.001, open ? 0.2 : 0.035);
    src.connect(this.filter("highpass", open ? 7000 : 8500)).connect(g).connect(this.pan(pan)).connect(this.mix);
  }

  crash(t: number, peak = 0.22) {
    const src = this.noiseSrc(t, 2);
    const g = this.gain();
    this.env(g.gain, t, peak, 0.002, 1.8);
    const hp = this.filter("highpass", 4500);
    src.connect(hp).connect(g).connect(this.mix);
    this.sends(g, 0.4, 0);
  }

  /** Accelerating snare roll across `dur`, ending in silence just before `t + dur`. */
  roll(t: number, dur: number, peakFrom = 0.08, peakTo = 0.5) {
    const hits = [0, 0.25, 0.5, 0.625, 0.75, 0.8125, 0.875, 0.906, 0.9375];
    hits.forEach((p, i) => this.snare(t + p * dur, peakFrom + ((peakTo - peakFrom) * i) / hits.length, 0.2));
  }

  /* ---------- FX ---------- */

  riser(t: number, dur: number, peak = 0.25) {
    const src = this.noiseSrc(t, dur);
    const f = this.filter("bandpass", 300, 2.2);
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(10000, t + dur);
    const g = this.gain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.97);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.mix);
    this.sends(g, 0.3, 0);

    // Pitch riser underneath the noise.
    const o = this.osc("sawtooth", 110, t, dur);
    o.frequency.exponentialRampToValueAtTime(880, t + dur);
    const og = this.gain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(peak * 0.25, t + dur * 0.97);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(this.filter("lowpass", 2500)).connect(og).connect(this.mix);
  }

  downlifter(t: number, dur = BEAT * 4, peak = 0.18) {
    const src = this.noiseSrc(t, dur);
    const f = this.filter("bandpass", 8000, 1.5);
    f.frequency.exponentialRampToValueAtTime(250, t + dur);
    const g = this.gain();
    this.env(g.gain, t, peak, 0.01, dur);
    src.connect(f).connect(g).connect(this.mix);
    this.sends(g, 0.4, 0);
  }

  subDrop(t: number, from = 110, to = 38, dur = 1.1, peak = 0.9) {
    const o = this.osc("sine", from, t, dur);
    o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
    const g = this.gain();
    this.env(g.gain, t, peak, 0.004, dur);
    o.connect(g).connect(this.mix);
  }

  tapeStop(t: number, midi = 65, dur = 0.42, peak = 0.2) {
    const f = this.filter("lowpass", 4000);
    f.frequency.exponentialRampToValueAtTime(180, t + dur);
    const g = this.gain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.mix);
    for (const d of [-12, 12]) {
      const o = this.osc("sawtooth", midiHz(midi), t, dur, d);
      o.frequency.exponentialRampToValueAtTime(midiHz(midi) / 8, t + dur);
      o.connect(f);
    }
  }

  /* ---------- Tonal ---------- */

  /** Wide supersaw chord. `cutoff` sweeps from [0] to [1] over the note. */
  supersaw(
    notes: number[],
    t: number,
    dur: number,
    { peak = 0.16, cutoff = [7000, 800], attack = 0.004, sustain = false, reverb = 0.45, delay = 0.3, voices = 7 } = {},
  ) {
    const f = this.filter("lowpass", cutoff[0], 3);
    f.frequency.setValueAtTime(cutoff[0], t);
    f.frequency.exponentialRampToValueAtTime(cutoff[1], t + dur);
    const g = this.gain();
    if (sustain) this.gate(g.gain, t, peak, dur, attack, dur * 0.2);
    else this.env(g.gain, t, peak, attack, dur);
    f.connect(g).connect(this.pump);
    this.sends(g, reverb, delay);

    const spread = voices === 1 ? [0] : Array.from({ length: voices }, (_, i) => -1 + (2 * i) / (voices - 1));
    for (const note of notes) {
      for (const s of spread) {
        const o = this.osc("sawtooth", midiHz(note), t, dur, s * 24);
        o.connect(this.gain(1 / (notes.length * voices * 0.55))).connect(this.pan(s * 0.85)).connect(f);
      }
    }
  }

  pluck(midi: number, t: number, dur = 0.18, peak = 0.1, pan = 0) {
    const f = this.filter("lowpass", 7000, 5);
    f.frequency.exponentialRampToValueAtTime(400, t + dur);
    const g = this.gain();
    this.env(g.gain, t, peak, 0.002, dur);
    f.connect(g).connect(this.pan(pan)).connect(this.pump);
    this.sends(g, 0.3, 0.45);
    for (const d of [-9, 9]) this.osc("sawtooth", midiHz(midi), t, dur, d).connect(f);
    this.osc("triangle", midiHz(midi + 12), t, dur).connect(this.gain(0.5)).connect(f);
  }

  sub(t: number, midi: number, dur: number, peak = 0.55) {
    const g = this.gain();
    this.gate(g.gain, t, peak, dur, 0.004, 0.03);
    this.osc("sine", midiHz(midi), t, dur).connect(g).connect(this.pump);
  }

  /** Detuned saw bass with an eighth-note filter wobble. `bendTo` glides the pitch. */
  reese(
    t: number,
    midi: number,
    dur: number,
    { peak = 0.3, cutoff = 600, lfoRate = 2 / BEAT, lfoDepth = 400, bendTo = null as number | null } = {},
  ) {
    const f = this.filter("lowpass", cutoff, 6);
    const lfo = this.osc("sine", lfoRate, t, dur);
    lfo.connect(this.gain(lfoDepth)).connect(f.frequency);
    const g = this.gain();
    this.gate(g.gain, t, peak, dur, 0.006, 0.05);
    const sat = this.drive();
    sat.connect(f).connect(g).connect(this.pump);
    for (const [d, oct, p] of [[-16, 0, -0.4], [16, 0, 0.4], [0, -12, 0]] as const) {
      const o = this.osc("sawtooth", midiHz(midi + oct), t, dur, d);
      if (bendTo !== null) o.frequency.exponentialRampToValueAtTime(midiHz(bendTo + oct), t + dur * 0.9);
      o.connect(this.gain(0.5)).connect(this.pan(p)).connect(sat);
    }
  }

  /** Rave hoover: detuned saws scooping up into the note. */
  hoover(t: number, midi: number, dur: number, peak = 0.16) {
    const f = this.filter("lowpass", 2600, 2);
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(4500, t + 0.08);
    f.frequency.exponentialRampToValueAtTime(1400, t + dur);
    const g = this.gain();
    this.gate(g.gain, t, peak, dur, 0.01, 0.08);
    const sat = this.drive();
    sat.connect(f).connect(g).connect(this.pump);
    this.sends(g, 0.35, 0.25);
    const vib = this.osc("sine", 6, t, dur);
    for (const [d, p] of [[-30, -0.7], [-10, -0.2], [10, 0.2], [30, 0.7]] as const) {
      const o = this.osc("sawtooth", midiHz(midi - 7), t, dur, d);
      o.frequency.exponentialRampToValueAtTime(midiHz(midi), t + 0.07);
      vib.connect(this.gain(8)).connect(o.detune);
      o.connect(this.gain(0.35)).connect(this.pan(p)).connect(sat);
    }
  }

  /** Wobble / talking bass. Bandpass makes it vocal (neuro), lowpass makes it round. */
  wobble(
    t: number,
    midi: number,
    dur: number,
    { rate = 5.8, lo = 150, hi = 1600, peak = 0.34, type = "lowpass" as BiquadFilterType } = {},
  ) {
    const f = this.filter(type, (lo + hi) / 2, type === "bandpass" ? 3 : 8);
    const lfo = this.osc("triangle", rate, t, dur);
    lfo.connect(this.gain((hi - lo) / 2)).connect(f.frequency);
    const g = this.gain();
    this.gate(g.gain, t, peak, dur, 0.004, 0.03);
    const sat = this.drive();
    f.connect(sat).connect(g).connect(this.pump);
    for (const [wave, oct, d] of [["sawtooth", 0, -10], ["sawtooth", 0, 10], ["square", -12, 0]] as const) {
      this.osc(wave, midiHz(midi + oct), t, dur, d).connect(this.gain(0.45)).connect(f);
    }
    if (type === "bandpass") this.sub(t, midi - 12, dur, peak * 0.9);
  }

  /** Formant vocal chop ("ah", "oh", "eh"). */
  vocal(t: number, midi: number, dur: number, vowel: "a" | "o" | "e" = "o", peak = 0.22) {
    const formants = { a: [800, 1150, 2900], o: [450, 800, 2830], e: [400, 1700, 2600] }[vowel];
    const g = this.gain();
    this.env(g.gain, t, peak, 0.01, dur);
    g.connect(this.pump);
    this.sends(g, 0.55, 0.35);
    const src = this.ctx.createGain();
    const vib = this.osc("sine", 5.5, t, dur);
    for (const d of [-7, 7]) {
      const o = this.osc("sawtooth", midiHz(midi), t, dur, d);
      vib.connect(this.gain(12)).connect(o.detune);
      o.connect(src);
    }
    formants.forEach((freq, i) => src.connect(this.filter("bandpass", freq, 9)).connect(this.gain([1.6, 1, 0.5][i])).connect(g));
  }
}

function curve(size: number, fn: (x: number) => number): Float32Array<ArrayBuffer> {
  const c = new Float32Array(new ArrayBuffer(size * 4));
  for (let i = 0; i < size; i++) c[i] = fn((i / (size - 1)) * 2 - 1);
  return c;
}

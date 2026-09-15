import { describe, expect, it } from "vitest";
import { analyzeDrop } from "./beats";

const SR = 44100;

/** Mono DnB-like loop: two-step kicks (0, 10), snares (4, 12), eighth hats and a busy bass line. */
function loop(bpm: number, bars: number, startAt = 0.5): Float32Array {
  const s16 = 60 / bpm / 4;
  const out = new Float32Array(Math.ceil((startAt + bars * 16 * s16 + 1) * SR));
  let seed = 7;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const add = (at: number, len: number, fn: (i: number) => number) => {
    const s = Math.floor(at * SR);
    for (let i = 0; i < len * SR && s + i < out.length; i++) out[s + i] += fn(i);
  };
  for (let bar = 0; bar < bars; bar++) {
    const t = (slot: number) => startAt + (bar * 16 + slot) * s16;
    for (const slot of [0, 10]) {
      add(t(slot), 0.25, (i) => Math.sin((2 * Math.PI * 55 * i) / SR) * Math.exp(-i / (SR * 0.06)) * 0.9);
      add(t(slot), 0.01, (i) => noise() * Math.exp(-i / (SR * 0.002)) * 0.5);
    }
    for (const slot of [4, 12]) add(t(slot), 0.15, (i) => noise() * Math.exp(-i / (SR * 0.04)) * 0.7);
    for (let slot = 0; slot < 16; slot += 2) add(t(slot), 0.03, (i) => noise() * Math.exp(-i / (SR * 0.008)) * 0.25);
    for (const slot of [3, 7, 13]) add(t(slot), s16 * 1.5, (i) => Math.sin((2 * Math.PI * 70 * i) / SR) * 0.3);
  }
  return out;
}

const bars = (n: number, bpm: number) => n * (60 / bpm) * 4;

describe("analyzeDrop", () => {
  it("puts kicks on beats 1 and 3 and snares on 2 and 4, starting at the drop", () => {
    const g = analyzeDrop([loop(174, 4)], SR, { from: 0.5, duration: bars(4, 174), bpmHint: 174, bpmSearch: 0 });
    const beat = 60 / 174;
    expect(g.bpm).toBe(174);
    expect(g.kicks).toHaveLength(8);
    expect(g.snares).toHaveLength(8);
    expect(Math.abs(g.kicks[0])).toBeLessThan(0.006);
    expect(Math.abs(g.kicks[1] - 2 * beat)).toBeLessThan(0.006);
    expect(Math.abs(g.snares[0] - beat)).toBeLessThan(0.006);
  });

  it("corrects a drop time that is off by tens of milliseconds", () => {
    const g = analyzeDrop([loop(174, 4)], SR, { from: 0.56, duration: bars(4, 174), bpmHint: 174, bpmSearch: 0 });
    expect(Math.abs(g.kicks[0] - -0.06)).toBeLessThan(0.006);
  });

  it("finds the tempo when it isn't known", () => {
    const g = analyzeDrop([loop(171, 6)], SR, { from: 0.5, duration: bars(6, 171), bpmHint: 174, bpmSearch: 5 });
    expect(Math.abs(g.bpm - 171)).toBeLessThan(0.3);
    expect(Math.abs(g.kicks[g.kicks.length - 1] - (g.kicks.length - 1) * 2 * (60 / 171))).toBeLessThan(0.015);
  });

  it("falls back to a plain grid for silence", () => {
    const g = analyzeDrop([new Float32Array(SR * 6)], SR, { from: 0, duration: 5 });
    expect(g.bpm).toBe(174);
    expect(g.kicks[0]).toBe(0);
  });
});

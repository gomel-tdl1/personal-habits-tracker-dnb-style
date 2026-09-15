import { describe, expect, it, vi } from "vitest";

vi.mock("../supabase/client", () => ({ getSupabase: () => ({}) }));

import { prepareTrack, type TrackRow } from "./tracks";
import { BAR } from "./tempo";

const SR = 44100;

function fakeBuffer(seconds: number, kicksAt: (t: number) => boolean): AudioBuffer {
  const data = new Float32Array(Math.ceil(seconds * SR));
  const s16 = 60 / 174 / 4;
  for (let i = 0; i < data.length; i++) {
    const t = i / SR;
    const slot = Math.round(t / s16);
    const since = t - slot * s16;
    if (since >= 0 && since < 0.2 && kicksAt(slot * s16)) data[i] += Math.sin(2 * Math.PI * 55 * since) * Math.exp(-since / 0.05) * 0.9;
    if (since >= 0 && since < 0.004 && kicksAt(slot * s16)) data[i] += (Math.random() * 2 - 1) * 0.4;
  }
  return { duration: seconds, sampleRate: SR, numberOfChannels: 1, getChannelData: () => data } as unknown as AudioBuffer;
}

const row = (patch: Partial<TrackRow> = {}): TrackRow => ({ id: "1", file: "a.mp3", artist: "Artist", title: "Title", drop_at: 10, bpm: null, style: "anthem", ...patch });

describe("prepareTrack", () => {
  const s16 = 60 / 174 / 4;
  // Kicks on slots 0 and 10 of every bar, starting at the drop (10 s).
  const kicks = (t: number) => t >= 10 - 1e-6 && [0, 10].includes(Math.round((t - 10) / s16) % 16);
  const drop = Math.round(10 / s16) * s16;
  const buffer = fakeBuffer(40, (t) => kicks(t - (drop - 10)));

  it("trims a full song to four bars before the drop and sixteen after it", () => {
    const p = prepareTrack(row({ drop_at: drop }), buffer);
    expect(p.offset).toBeCloseTo(drop - BAR * 4, 3);
    expect(p.length).toBeCloseTo(BAR * 20, 3);
    expect(Math.abs(p.timeline.dropAt - BAR * 4 * 1000)).toBeLessThan(10);
    expect(p.timeline.end).toBe(Math.round(BAR * 20 * 1000));
    expect(p.fadeIn).toBeGreaterThan(0);
    expect(p.fadeOut).toBeGreaterThan(0);
  });

  it("plays a pre-cut excerpt whole", () => {
    const excerpt = fakeBuffer(12, () => false);
    const p = prepareTrack(row({ drop_at: 4.153 }), excerpt);
    expect(p.offset).toBe(0);
    expect(p.length).toBeCloseTo(12, 3);
    expect(p.timeline.dropAt).toBe(4153);
    expect([p.fadeIn, p.fadeOut]).toEqual([0, 0]);
  });

  it("lines beats up with the drop and keeps the track credit", () => {
    const p = prepareTrack(row({ drop_at: drop }), buffer);
    expect(Math.abs(p.timeline.kicks[0] - p.timeline.dropAt)).toBeLessThan(30);
    expect(Math.abs(p.timeline.kicks[1] - p.timeline.dropAt - 8 * s16 * 1000)).toBeLessThan(30);
    expect(p.timeline.track).toEqual({ artist: "Artist", title: "Title" });
    expect(p.timeline.style).toBe("anthem");
  });

  it("uses a random style when none is set, and copes with a drop near the start", () => {
    const p = prepareTrack(row({ drop_at: 1, style: null }), buffer, () => "siren");
    expect(p.offset).toBe(0);
    // The beat grid may nudge the drop by up to half an eighth note.
    expect(Math.abs(p.timeline.dropAt - 1000)).toBeLessThanOrEqual(87);
    expect(p.timeline.style).toBe("siren");
  });

  it("stops at the end of a short file", () => {
    const p = prepareTrack(row({ drop_at: 36 }), buffer);
    expect(p.offset + p.length).toBeCloseTo(40, 3);
  });
});

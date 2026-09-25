import { describe, expect, it } from "vitest";
import { DROP_BARS, DROP_STYLES, dropTimeline, pickDropStyle } from "./drops";
import { BAR, BEAT } from "./tempo";

describe("drop styles", () => {
  it("has four distinct styles", () => {
    expect(DROP_STYLES.map((s) => s.id)).toEqual(["rave", "bounce", "euphoria", "anthem"]);
  });
});

describe("dropTimeline", () => {
  const rave = DROP_STYLES.find((s) => s.id === "rave")!;
  const tl = dropTimeline(rave);

  it("drops after a one-bar build", () => {
    expect(tl.dropAt).toBeCloseTo(BAR * 1000);
  });

  it("lists every kick and snare of the drop in order", () => {
    expect(tl.kicks).toHaveLength(rave.kick.length * DROP_BARS);
    expect(tl.snares).toHaveLength(rave.snare.length * DROP_BARS);
    expect(tl.kicks[0]).toBeCloseTo(tl.dropAt);
    expect(tl.snares[0]).toBeCloseTo(tl.dropAt + BEAT * 1000);
    expect([...tl.kicks].sort((a, b) => a - b)).toEqual(tl.kicks);
  });

  it("ends after the last bar", () => {
    expect(tl.end).toBeCloseTo((1 + DROP_BARS) * BAR * 1000);
  });
});

describe("pickDropStyle", () => {
  it("never repeats the previous style", () => {
    for (let i = 0; i < 50; i++) {
      const r = i / 50;
      expect(pickDropStyle("bounce", () => r).id).not.toBe("bounce");
    }
  });

  it("can pick any style when there is no previous one", () => {
    const seen = new Set([0, 0.3, 0.6, 0.99].map((r) => pickDropStyle(null, () => r).id));
    expect(seen.size).toBe(4);
  });
});

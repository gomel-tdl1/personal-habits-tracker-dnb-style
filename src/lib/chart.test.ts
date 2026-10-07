import { describe, expect, it } from "vitest";
import { buildChartSeries, compatibleChartTrackers } from "./chart";
import { entryKey, type Tracker } from "./types";

const bedtime: Tracker = {
  id: "a", name: "Отбой", emoji: "🌙", color: "uv", type: "time",
  goal: 1380, goal_op: "lte", unit: null, step: 1, days: [], position: 0,
  archived_at: null, created_at: "2026-09-01T08:00:00Z",
};
const second: Tracker = { ...bedtime, id: "b", goal: 60 };
const days = ["2026-10-06", "2026-10-07"];

describe("comparison chart", () => {
  it("keeps compatible trackers and excludes checks and other types", () => {
    expect(compatibleChartTrackers([
      bedtime, second, { ...bedtime, id: "n", type: "number" },
      { ...bedtime, id: "c", type: "check" },
    ]).map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("does not put different measurement units on one numeric axis", () => {
    expect(compatibleChartTrackers([
      { ...bedtime, type: "number", unit: "kg" },
      { ...second, type: "number", unit: "h" },
    ]).map((t) => t.id)).toEqual(["a"]);
  });

  it("aligns bedtime values and different goals across midnight on one axis", () => {
    const map = new Map([
      [entryKey("a", days[0]), 1380], [entryKey("a", days[1]), 60],
      [entryKey("b", days[0]), 60], [entryKey("b", days[1]), 120],
    ]);
    const series = buildChartSeries([bedtime, second], map, days);
    expect(series[0].points.map((p) => p.value)).toEqual([1380, 1500]);
    expect(series[1].points.map((p) => p.value)).toEqual([1500, 1560]);
    expect(series.map((s) => s.goal)).toEqual([1380, 1500]);
    expect(series.map((s) => s.average)).toEqual([1440, 1530]);
  });

  it("keeps missing values separate from zero and averages each tracker separately", () => {
    const a = { ...bedtime, type: "number" as const, goal: null };
    const b = { ...second, type: "number" as const, goal: null };
    const series = buildChartSeries([a, b], new Map([
      [entryKey("a", days[0]), 0], [entryKey("b", days[1]), 10],
    ]), days);
    expect(series[0].points.map((p) => p.value)).toEqual([0, undefined]);
    expect(series[1].points.map((p) => p.value)).toEqual([undefined, 10]);
    expect(series.map((s) => s.average)).toEqual([0, 10]);
  });

  it("gives same-color trackers distinguishable series colors", () => {
    const series = buildChartSeries([bedtime, second], new Map(), days);
    expect(series[0].color).not.toBe(series[1].color);
    expect(series.map((s) => s.average)).toEqual([null, null]);
  });

  it("uses a shared data anchor when no time tracker has a goal", () => {
    const series = buildChartSeries([
      { ...bedtime, goal: null }, { ...second, goal: null },
    ], new Map([[entryKey("a", days[0]), 1380], [entryKey("b", days[0]), 60]]), days);
    expect(series.map((s) => s.points[0].value)).toEqual([1380, 1500]);
  });
});

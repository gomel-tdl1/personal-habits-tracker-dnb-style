import { describe, expect, it } from "vitest";
import { bestStreak, completion, currentStreak, dayScore, dropStats, isDone, isDrop, isScheduled, progress } from "./habits";
import { entryKey, type EntryMap, type Tracker } from "./types";

const base: Tracker = {
  id: "t1",
  name: "Test",
  emoji: "💧",
  color: "cyan",
  type: "check",
  goal: null,
  goal_op: "gte",
  unit: null,
  step: 1,
  days: [],
  position: 0,
  archived_at: null,
  created_at: "2026-09-01T08:00:00.000Z",
};
const tracker = (patch: Partial<Tracker>): Tracker => ({ ...base, ...patch });

const entries = (id: string, values: Record<string, number>): EntryMap =>
  new Map(Object.entries(values).map(([date, v]) => [entryKey(id, date), v]));

describe("isScheduled", () => {
  it("is every day when days is empty", () => {
    expect(isScheduled(base, "2026-09-13")).toBe(true);
  });
  it("respects weekdays", () => {
    const t = tracker({ days: [1, 3, 5] });
    expect(isScheduled(t, "2026-09-14")).toBe(true); // Mon
    expect(isScheduled(t, "2026-09-15")).toBe(false); // Tue
  });
  it("is false before the tracker was created", () => {
    expect(isScheduled(base, "2026-08-31")).toBe(false);
  });
  it("counts a tracker created in the small hours as created the previous day", () => {
    // 01:30 in Berlin on 2026-09-10.
    const t = tracker({ created_at: "2026-09-09T23:30:00.000Z" });
    expect(isScheduled(t, "2026-09-09")).toBe(true);
  });
});

describe("isDone / progress", () => {
  it("check", () => {
    expect(isDone(base, undefined)).toBe(false);
    expect(isDone(base, 0)).toBe(false);
    expect(isDone(base, 1)).toBe(true);
    expect(progress(base, 1)).toBe(1);
  });
  it("counter with goal", () => {
    const t = tracker({ type: "counter", goal: 8 });
    expect(isDone(t, 7)).toBe(false);
    expect(isDone(t, 8)).toBe(true);
    expect(progress(t, 4)).toBe(0.5);
    expect(progress(t, 12)).toBe(1);
  });
  it("counter without goal", () => {
    const t = tracker({ type: "counter" });
    expect(isDone(t, 0)).toBe(false);
    expect(isDone(t, 1)).toBe(true);
  });
  it("time lower-is-better", () => {
    const t = tracker({ type: "time", goal: 420, goal_op: "lte" });
    expect(isDone(t, 415)).toBe(true);
    expect(isDone(t, 421)).toBe(false);
    expect(progress(t, 421)).toBe(0);
  });
  it("time: after midnight is later than a late-evening goal", () => {
    const bedtime = tracker({ type: "time", goal: 23 * 60, goal_op: "lte" });
    expect(isDone(bedtime, 22 * 60 + 50)).toBe(true);
    expect(isDone(bedtime, 23 * 60 + 30)).toBe(false);
    expect(isDone(bedtime, 0)).toBe(false); // 00:00
    expect(isDone(bedtime, 60)).toBe(false); // 01:00
  });
  it("time: morning goals are unaffected", () => {
    const wake = tracker({ type: "time", goal: 7 * 60, goal_op: "lte" });
    expect(isDone(wake, 6 * 60 + 30)).toBe(true);
    expect(isDone(wake, 7 * 60 + 30)).toBe(false);
    expect(isDone(wake, 12 * 60)).toBe(false);
  });
  it("time: not-earlier-than goals treat the small hours as late", () => {
    const lateWorkout = tracker({ type: "time", goal: 22 * 60, goal_op: "gte" });
    expect(isDone(lateWorkout, 60)).toBe(true); // 01:00 is after 22:00
    expect(isDone(lateWorkout, 21 * 60)).toBe(false);
  });
  it("number without goal is done when logged", () => {
    const t = tracker({ type: "number" });
    expect(isDone(t, 0)).toBe(true);
    expect(isDone(t, undefined)).toBe(false);
  });
});

describe("streaks", () => {
  it("does not break on an unfinished today", () => {
    const map = entries("t1", { "2026-09-12": 1, "2026-09-13": 1, "2026-09-14": 1 });
    expect(currentStreak(base, map, "2026-09-15")).toBe(3);
  });
  it("counts today when done", () => {
    const map = entries("t1", { "2026-09-14": 1, "2026-09-15": 1 });
    expect(currentStreak(base, map, "2026-09-15")).toBe(2);
  });
  it("breaks on a missed scheduled day", () => {
    const map = entries("t1", { "2026-09-12": 1, "2026-09-14": 1 });
    expect(currentStreak(base, map, "2026-09-15")).toBe(1);
  });
  it("skips unscheduled days", () => {
    const t = tracker({ days: [1, 3, 5] }); // Mon Wed Fri
    const map = entries("t1", { "2026-09-09": 1, "2026-09-11": 1, "2026-09-14": 1 });
    expect(currentStreak(t, map, "2026-09-15")).toBe(3);
  });
  it("finds the best run", () => {
    const map = entries("t1", {
      "2026-09-02": 1, "2026-09-03": 1, "2026-09-04": 1, "2026-09-05": 1,
      "2026-09-07": 1, "2026-09-08": 1,
    });
    expect(bestStreak(base, map, "2026-09-15")).toBe(4);
  });
});

describe("completion", () => {
  it("ignores unfinished today and unscheduled days", () => {
    const t = tracker({ created_at: "2026-09-10T08:00:00.000Z" });
    const map = entries("t1", { "2026-09-10": 1, "2026-09-12": 1 });
    // period 2026-09-09..15: scheduled from 10th, today (15) excluded → 10..14 = 5 days, 2 done
    const r = completion([t], map, "2026-09-09", "2026-09-15", "2026-09-15");
    expect(r).toEqual({ done: 2, scheduled: 5, rate: 0.4 });
  });
  it("returns zero rate when nothing is scheduled", () => {
    expect(completion([base], new Map(), "2026-08-01", "2026-08-05", "2026-09-15").rate).toBe(0);
  });
});

describe("dayScore", () => {
  it("is the share of scheduled trackers done", () => {
    const a = tracker({ id: "a" });
    const b = tracker({ id: "b", type: "counter", goal: 8 });
    const c = tracker({ id: "c", days: [2] });
    const map: EntryMap = new Map([[entryKey("a", "2026-09-14"), 1], [entryKey("b", "2026-09-14"), 3]]);
    expect(dayScore([a, b, c], map, "2026-09-14")).toEqual({ done: 1, scheduled: 2 });
  });
});

describe("wake-up time and streaks", () => {
  const wake = tracker({ type: "time", goal: 7 * 60, goal_op: "lte" });

  it("an evening time is late for a morning goal", () => {
    expect(isDone(wake, 20 * 60)).toBe(false);
    expect(isDone(wake, 23 * 60 + 30)).toBe(false);
  });
  it("a small-hours time is late for a morning goal", () => {
    expect(isDone(wake, 2 * 60)).toBe(false);
  });
  it("a late-logged day breaks the streak", () => {
    const map = entries("t1", { "2026-09-10": 400, "2026-09-11": 400, "2026-09-12": 400, "2026-09-13": 20 * 60, "2026-09-14": 400 });
    expect(currentStreak(wake, map, "2026-09-14")).toBe(1);
    expect(bestStreak(wake, map, "2026-09-14")).toBe(3);
  });
  it("a bedtime just after midnight fits a 00:30 goal", () => {
    const bed = tracker({ type: "time", goal: 30, goal_op: "lte" });
    expect(isDone(bed, 23 * 60 + 30)).toBe(true);
    expect(isDone(bed, 20)).toBe(true);
    expect(isDone(bed, 60)).toBe(false);
  });
});

describe("sets", () => {
  it("is done when the sum reaches the goal", () => {
    const t = tracker({ type: "sets", goal: 100 });
    expect(isDone(t, 45)).toBe(false);
    expect(isDone(t, 100)).toBe(true);
    expect(progress(t, 50)).toBe(0.5);
  });
});

describe("dropStats", () => {
  const a = tracker({ id: "a" });
  const b = tracker({ id: "b", days: [1, 2, 3, 4, 5] }); // weekdays
  const map = (days: Record<string, string[]>): EntryMap =>
    new Map(Object.entries(days).flatMap(([date, ids]) => ids.map((id) => [entryKey(id, date), 1] as [string, number])));

  it("counts days where everything scheduled is done", () => {
    // Mon 14 both, Tue 15 only a, Wed 16 both; today Thu 17 unfinished.
    const m = map({ "2026-09-14": ["a", "b"], "2026-09-15": ["a"], "2026-09-16": ["a", "b"] });
    expect(isDrop([a, b], m, "2026-09-14")).toBe(true);
    expect(isDrop([a, b], m, "2026-09-15")).toBe(false);
    const s = dropStats([a, b], m, "2026-09-14", "2026-09-17");
    expect(s).toMatchObject({ drops: 2, days: 3, current: 1, best: 1 });
  });
  it("weekends with only a done count, and a missed day breaks the run", () => {
    // Fri 11 both, Sat 12 a, Sun 13 a, Mon 14 both → run of 4; Tue 15 missed; Wed 16 both.
    const m = map({ "2026-09-11": ["a", "b"], "2026-09-12": ["a"], "2026-09-13": ["a"], "2026-09-14": ["a", "b"], "2026-09-16": ["a", "b"] });
    const s = dropStats([a, b], m, "2026-09-10", "2026-09-16");
    expect(s.current).toBe(1);
    expect(s.best).toBe(4);
  });
});

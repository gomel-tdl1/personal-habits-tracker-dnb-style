import { aroundGoal, isScheduled, valueOf } from "./habits";
import { PIGMENTS, type EntryMap, type Tracker } from "./types";

export function compatibleChartTrackers(trackers: Tracker[]): Tracker[] {
  const first = trackers.find((t) => t.type !== "check");
  return first ? trackers.filter((t) => t.type === first.type &&
    (t.type === "time" || (t.unit ?? "") === (first.unit ?? ""))) : [];
}

export function buildChartSeries(trackers: Tracker[], map: EntryMap, days: string[]) {
  const eligible = compatibleChartTrackers(trackers);
  // Every series uses the same side of midnight, even with different goals.
  const anchor = eligible.find((t) => t.goal !== null)?.goal ??
    eligible.flatMap((t) => days.map((date) => valueOf(map, t, date))).find((v) => v !== undefined) ?? 0;
  const used = new Set<string>();
  return eligible.map((tracker, index) => {
    const preferred = PIGMENTS[tracker.color];
    const color = !used.has(preferred) ? preferred :
      Object.values(PIGMENTS).find((c) => !used.has(c)) ?? `hsl(${index * 137.508 % 360} 80% 65%)`;
    used.add(color);
    const align = (v: number) => tracker.type === "time" ? aroundGoal(v, anchor) : v;
    const points = days.map((date) => {
      const raw = valueOf(map, tracker, date);
      return { date, value: raw === undefined ? undefined : align(raw), scheduled: isScheduled(tracker, date) };
    });
    const values = points.flatMap((p) => p.value === undefined ? [] : [p.value]);
    return {
      tracker, color, points,
      goal: tracker.goal === null ? null : align(tracker.goal),
      average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  });
}

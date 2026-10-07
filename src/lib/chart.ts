import { onDayAxis, isScheduled, valueOf } from "./habits";
import { PIGMENTS, type EntryMap, type Tracker } from "./types";

export function compatibleChartTrackers(trackers: Tracker[]): Tracker[] {
  const first = trackers.find((t) => t.type !== "check");
  return first ? trackers.filter((t) => t.type === first.type &&
    (t.type === "time" || (t.unit ?? "") === (first.unit ?? ""))) : [];
}

export function buildChartSeries(trackers: Tracker[], map: EntryMap, days: string[]) {
  const eligible = compatibleChartTrackers(trackers);
  // Clock times share the habit day axis (04:00–04:00).
  const used = new Set<string>();
  return eligible.map((tracker, index) => {
    const preferred = PIGMENTS[tracker.color];
    const color = !used.has(preferred) ? preferred :
      Object.values(PIGMENTS).find((c) => !used.has(c)) ?? `hsl(${index * 137.508 % 360} 80% 65%)`;
    used.add(color);
    const align = (v: number) => tracker.type === "time" ? onDayAxis(v) : v;
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

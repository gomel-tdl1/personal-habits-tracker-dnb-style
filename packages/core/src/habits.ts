import { addDays, DAY_START_HOUR, dayKeyOf, isoWeekday } from "./dates";
import { entryKey, type EntryMap, type Tracker } from "./types";

export function createdKey(t: Tracker): string {
  return dayKeyOf(new Date(t.created_at));
}

/**
 * A clock time (minutes after midnight) placed on the habit day, which runs
 * from 04:00 to 04:00: the small hours come after the evening. 01:00 becomes
 * 25:00, later than a 23:00 bedtime; 20:00 stays 20:00, later than a 07:00 wake-up.
 */
export function onDayAxis(minutes: number): number {
  return minutes < DAY_START_HOUR * 60 ? minutes + 1440 : minutes;
}

export function isScheduled(t: Tracker, date: string): boolean {
  if (date < createdKey(t)) return false;
  return t.days.length === 0 || t.days.includes(isoWeekday(date));
}

export function isDone(t: Tracker, value: number | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (t.type === "check") return value >= 1;
  if (t.goal === null) return t.type === "counter" || t.type === "sets" ? value > 0 : true;
  const v = t.type === "time" ? onDayAxis(value) : value;
  const goal = t.type === "time" ? onDayAxis(t.goal) : t.goal;
  return t.goal_op === "gte" ? v >= goal : v <= goal;
}

export function progress(t: Tracker, value: number | undefined): number {
  if (value === undefined) return 0;
  if (t.type !== "check" && t.goal !== null && t.goal_op === "gte" && t.goal > 0) {
    return Math.max(0, Math.min(1, value / t.goal));
  }
  return isDone(t, value) ? 1 : 0;
}

export function valueOf(map: EntryMap, t: Tracker, date: string): number | undefined {
  return map.get(entryKey(t.id, date));
}

export function doneOn(t: Tracker, map: EntryMap, date: string): boolean {
  return isDone(t, valueOf(map, t, date));
}

export function currentStreak(t: Tracker, map: EntryMap, today: string): number {
  const start = createdKey(t);
  let streak = 0;
  let day = today;
  if (!doneOn(t, map, today)) day = addDays(today, -1);
  for (; day >= start; day = addDays(day, -1)) {
    if (!isScheduled(t, day)) continue;
    if (!doneOn(t, map, day)) break;
    streak++;
  }
  return streak;
}

export function bestStreak(t: Tracker, map: EntryMap, today: string): number {
  let best = 0;
  let run = 0;
  for (let day = createdKey(t); day <= today; day = addDays(day, 1)) {
    if (!isScheduled(t, day)) continue;
    if (doneOn(t, map, day)) {
      run++;
      best = Math.max(best, run);
    } else if (day !== today) {
      run = 0;
    }
  }
  return best;
}

export interface Completion {
  done: number;
  scheduled: number;
  rate: number;
}

export function completion(trackers: Tracker[], map: EntryMap, from: string, to: string, today: string): Completion {
  let done = 0;
  let scheduled = 0;
  for (const t of trackers) {
    const start = createdKey(t) > from ? createdKey(t) : from;
    for (let day = start; day <= to; day = addDays(day, 1)) {
      if (!isScheduled(t, day)) continue;
      const ok = doneOn(t, map, day);
      if (day === today && !ok) continue;
      scheduled++;
      if (ok) done++;
    }
  }
  return { done, scheduled, rate: scheduled ? done / scheduled : 0 };
}

export function dayScore(trackers: Tracker[], map: EntryMap, date: string): { done: number; scheduled: number } {
  let done = 0;
  let scheduled = 0;
  for (const t of trackers) {
    if (!isScheduled(t, date)) continue;
    scheduled++;
    if (doneOn(t, map, date)) done++;
  }
  return { done, scheduled };
}

/** A drop: every tracker scheduled that day is done. */
export function isDrop(trackers: Tracker[], map: EntryMap, date: string): boolean {
  const { done, scheduled } = dayScore(trackers, map, date);
  return scheduled > 0 && done === scheduled;
}

export interface DropStats {
  drops: number;
  /** Days with something scheduled; an unfinished today is left out. */
  days: number;
  rate: number;
  /** Drops in a row up to today; days with nothing scheduled don't break it. */
  current: number;
  best: number;
}

export function dropStats(trackers: Tracker[], map: EntryMap, from: string, today: string): DropStats {
  const start = trackers.reduce((min, t) => (createdKey(t) < min ? createdKey(t) : min), today);
  const counts = (day: string) => {
    const { done, scheduled } = dayScore(trackers, map, day);
    return { scheduled, drop: scheduled > 0 && done === scheduled };
  };

  let drops = 0;
  let days = 0;
  for (let day = from; day <= today; day = addDays(day, 1)) {
    const { scheduled, drop } = counts(day);
    if (!scheduled || (day === today && !drop)) continue;
    days++;
    if (drop) drops++;
  }

  let current = 0;
  let day = counts(today).drop ? today : addDays(today, -1);
  for (; day >= start; day = addDays(day, -1)) {
    const { scheduled, drop } = counts(day);
    if (!scheduled) continue;
    if (!drop) break;
    current++;
  }

  let best = 0;
  let run = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const { scheduled, drop } = counts(d);
    if (!scheduled) continue;
    if (drop) best = Math.max(best, ++run);
    else if (d !== today) run = 0;
  }

  return { drops, days, rate: days ? drops / days : 0, current, best };
}

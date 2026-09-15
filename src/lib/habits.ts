import { addDays, isoWeekday, toKey } from "./dates";
import { entryKey, type EntryMap, type Tracker } from "./types";

export function createdKey(t: Tracker): string {
  return toKey(new Date(t.created_at));
}

export function isScheduled(t: Tracker, date: string): boolean {
  if (date < createdKey(t)) return false;
  return t.days.length === 0 || t.days.includes(isoWeekday(date));
}

export function isDone(t: Tracker, value: number | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (t.type === "check") return value >= 1;
  if (t.goal === null) return t.type === "counter" ? value > 0 : true;
  return t.goal_op === "gte" ? value >= t.goal : value <= t.goal;
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

import { addDays, todayKey } from "../dates";
import type { Entry, Tracker, Widget } from "../types";
import type { Repo } from "./types";

/** localStorage-backed repo for local development without Supabase. */

const KEY = "habits-demo-v2";

interface Store {
  trackers: Tracker[];
  entries: Entry[];
  widgets: Widget[];
}

const uid = () => crypto.randomUUID();
const wait = () => new Promise((r) => setTimeout(r, 120));

function seed(): Store {
  const created = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const trackers: Tracker[] = [
    { id: uid(), name: "Подъём до 7:00", emoji: "⏰", color: "amber", type: "time", goal: 420, goal_op: "lte", unit: null, step: 1, days: [1, 2, 3, 4, 5], position: 0, archived_at: null, created_at: created },
    { id: uid(), name: "Утренняя зарядка", emoji: "🔥", color: "magenta", type: "check", goal: null, goal_op: "gte", unit: null, step: 1, days: [], position: 1, archived_at: null, created_at: created },
    { id: uid(), name: "Вода", emoji: "💧", color: "cyan", type: "counter", goal: 8, goal_op: "gte", unit: "стак.", step: 1, days: [], position: 2, archived_at: null, created_at: created },
    { id: uid(), name: "Сон", emoji: "🌙", color: "uv", type: "number", goal: 7.5, goal_op: "gte", unit: "ч", step: 0.5, days: [], position: 3, archived_at: null, created_at: created },
    { id: uid(), name: "Отжимания", emoji: "💪", color: "lime", type: "sets", goal: 100, goal_op: "gte", unit: "раз", step: 20, days: [], position: 4, archived_at: null, created_at: created },
  ];
  const entries: Entry[] = [];
  const today = todayKey();
  for (let i = 1; i <= 110; i++) {
    const date = addDays(today, -i);
    const r = () => Math.random();
    if (r() < 0.75) entries.push({ tracker_id: trackers[0].id, date, value: 380 + Math.round(r() * 70) });
    if (r() < 0.7) entries.push({ tracker_id: trackers[1].id, date, value: 1 });
    entries.push({ tracker_id: trackers[2].id, date, value: Math.round(3 + r() * 7) });
    if (r() < 0.9) entries.push({ tracker_id: trackers[3].id, date, value: Math.round((6 + r() * 3) * 2) / 2 });
    if (r() < 0.85) {
      const sets: number[] = [];
      const target = 60 + Math.round(r() * 60);
      for (let sum = 0; sum < target; ) {
        const n = Math.min(target - sum, 10 + Math.round(r() * 4) * 5);
        sets.push(n);
        sum += n;
      }
      entries.push({ tracker_id: trackers[4].id, date, value: sets.reduce((a, b) => a + b, 0), sets });
    }
  }
  const now = new Date().toISOString();
  const widgets: Widget[] = [
    { id: uid(), kind: "drops", tracker_ids: [], period: 30, size: "L", position: 0, created_at: now },
    { id: uid(), kind: "completion", tracker_ids: [], period: 30, size: "M", position: 1, created_at: now },
    { id: uid(), kind: "streak", tracker_ids: [trackers[1].id], period: 30, size: "S", position: 2, created_at: now },
    { id: uid(), kind: "streak", tracker_ids: [trackers[2].id], period: 30, size: "S", position: 3, created_at: now },
    { id: uid(), kind: "sets", tracker_ids: [trackers[4].id], period: 30, size: "L", position: 4, created_at: now },
    { id: uid(), kind: "daily_chart", tracker_ids: [trackers[2].id], period: 30, size: "L", position: 5, created_at: now },
    { id: uid(), kind: "heatmap", tracker_ids: [], period: 90, size: "L", position: 6, created_at: now },
  ];
  return { trackers, entries, widgets };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {}
  const store = seed();
  save(store);
  return store;
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

function mutate<T>(fn: (s: Store) => T): T {
  const store = load();
  const result = fn(store);
  save(store);
  return result;
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export const demoRepo: Repo = {
  async listTrackers() {
    await wait();
    return load().trackers.sort(byPosition);
  },
  async saveTracker(draft) {
    await wait();
    return mutate((s) => {
      const existing = draft.id ? s.trackers.find((t) => t.id === draft.id) : undefined;
      if (existing) return Object.assign(existing, draft);
      const t: Tracker = {
        ...draft,
        id: uid(),
        position: draft.position ?? s.trackers.length,
        archived_at: null,
        created_at: new Date().toISOString(),
      };
      s.trackers.push(t);
      return t;
    });
  },
  async deleteTracker(id) {
    await wait();
    mutate((s) => {
      s.trackers = s.trackers.filter((t) => t.id !== id);
      s.entries = s.entries.filter((e) => e.tracker_id !== id);
    });
  },
  async reorderTrackers(ids) {
    mutate((s) => s.trackers.forEach((t) => (t.position = ids.indexOf(t.id))));
  },
  async listEntries(from) {
    await wait();
    return load().entries.filter((e) => e.date >= from);
  },
  async setEntry(trackerId, date, value, sets) {
    mutate((s) => {
      s.entries = s.entries.filter((e) => !(e.tracker_id === trackerId && e.date === date));
      if (value !== null) s.entries.push({ tracker_id: trackerId, date, value, sets: sets ?? null });
    });
  },
  async listWidgets() {
    await wait();
    return load().widgets.sort(byPosition);
  },
  async saveWidget(draft) {
    await wait();
    return mutate((s) => {
      const existing = draft.id ? s.widgets.find((w) => w.id === draft.id) : undefined;
      if (existing) return Object.assign(existing, draft);
      const w: Widget = { ...draft, id: uid(), position: draft.position ?? s.widgets.length, created_at: new Date().toISOString() };
      s.widgets.push(w);
      return w;
    });
  },
  async deleteWidget(id) {
    mutate((s) => void (s.widgets = s.widgets.filter((w) => w.id !== id)));
  },
  async reorderWidgets(ids) {
    mutate((s) => s.widgets.forEach((w) => (w.position = ids.indexOf(w.id))));
  },
};

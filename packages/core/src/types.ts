export type TrackerType = "check" | "counter" | "sets" | "number" | "time";
export type GoalOp = "gte" | "lte";

export const PIGMENTS = {
  cyan: "#27E8F5",
  magenta: "#FF2E88",
  uv: "#8B5CFF",
  amber: "#FFB020",
  red: "#FF3B3B",
  lime: "#B6FF3B",
  ice: "#5AA9FF",
  white: "#F2F4FF",
} as const;
export type Pigment = keyof typeof PIGMENTS;

export interface Tracker {
  id: string;
  name: string;
  emoji: string;
  color: Pigment;
  type: TrackerType;
  goal: number | null;
  goal_op: GoalOp;
  unit: string | null;
  step: number;
  /** ISO weekdays 1 (Mon) … 7 (Sun). Empty means every day. */
  days: number[];
  position: number;
  archived_at: string | null;
  created_at: string;
}

export type TrackerDraft = Omit<Tracker, "id" | "created_at" | "position" | "archived_at"> & {
  id?: string;
  position?: number;
  archived_at?: string | null;
};

export interface Entry {
  tracker_id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** For a sets tracker, the sum of `sets`. */
  value: number;
  /** Sets tracker only: each set in the order it was logged. */
  sets?: number[] | null;
}

export type WidgetKind = "heatmap" | "daily_chart" | "streak" | "completion" | "drops" | "sets";
export type WidgetSize = "S" | "M" | "L";

export interface Widget {
  id: string;
  kind: WidgetKind;
  /** Empty means all active trackers. */
  tracker_ids: string[];
  period: 7 | 30 | 90 | 365;
  size: WidgetSize;
  position: number;
  created_at: string;
}

export type WidgetDraft = Omit<Widget, "id" | "created_at" | "position"> & {
  id?: string;
  position?: number;
};

/** Entry values keyed by `${trackerId}:${date}`. */
export type EntryMap = Map<string, number>;

/** Sets keyed like EntryMap; only days logged on a sets tracker. */
export type SetsMap = Map<string, number[]>;

export const entryKey = (trackerId: string, date: string) => `${trackerId}:${date}`;

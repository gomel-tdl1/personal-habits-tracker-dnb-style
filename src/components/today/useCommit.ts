"use client";

import { useCallback } from "react";
import { isDone, isScheduled } from "@/lib/habits";
import { useSetEntry } from "@/lib/queries";
import type { DropTimeline } from "@/lib/sound/drops";
import { sound } from "@/lib/sound/engine";
import { entryKey, PIGMENTS, type EntryMap, type Tracker } from "@/lib/types";
import { fx, type Origin } from "../fx/bus";

/** How the value changed, which picks the sound for a non-milestone change. */
export type CommitGesture = "toggle" | "step" | "log";

interface Args {
  trackers: Tracker[];
  map: EntryMap;
  date: string;
}

/**
 * Writes an entry and plays the matching cue:
 * the day's last habit → drop; goal reached → riser + sub drop;
 * undone → tape stop; otherwise a stab, pluck or growl.
 */
export function useCommit({ trackers, map, date }: Args) {
  const { mutate } = useSetEntry();

  return useCallback(
    (tracker: Tracker, value: number | null, gesture: CommitGesture, origin: Origin, sets?: number[]) => {
      const prev = map.get(entryKey(tracker.id, date));
      const next = value ?? undefined;
      if (prev === next && !sets) return;
      mutate({ trackerId: tracker.id, date, value, sets });

      const color = PIGMENTS[tracker.color];
      const index = Math.max(0, trackers.findIndex((t) => t.id === tracker.id));
      const wasDone = isDone(tracker, prev);
      const nowDone = isDone(tracker, next);

      const scheduled = trackers.filter((t) => isScheduled(t, date));
      const dayComplete =
        nowDone &&
        !wasDone &&
        scheduled.length > 0 &&
        scheduled.every((t) => (t.id === tracker.id ? true : isDone(t, map.get(entryKey(t.id, date)))));

      fx.emit({ type: "hit", color, strength: nowDone ? 1 : 0.5 });

      if (dayComplete) {
        const timeline = sound.drop();
        fx.emit({ type: "shockwave", origin, color });
        fx.emit({ type: "drop", timeline, clock: () => sound.dropClock() });
        sound.vibrate(vibrationFor(timeline));
        return;
      }

      if (nowDone && !wasDone) {
        if (tracker.type === "check") {
          sound.check(index);
          fx.emit({ type: "shockwave", origin, color });
          sound.vibrate(30);
        } else {
          const delay = sound.goal(index);
          fx.emit({ type: "shockwave", origin, color });
          fx.emit({ type: "shockwave", origin, color, big: true, delay });
          sound.vibrate([20, delay, 70]);
        }
        return;
      }

      if (wasDone && !nowDone) {
        sound.rewind();
        sound.vibrate(15);
        return;
      }

      if (gesture === "step") sound.step(pitchOf(tracker, next ?? 0));
      else if (gesture === "log") sound.growl(index);
      else sound.check(index);
      sound.vibrate(10);
    },
    [map, date, trackers, mutate],
  );
}

/** Where a stepped value sits on the scale: relative to the goal, or to 10 without one. */
function pitchOf(t: Tracker, value: number): number {
  const ref = t.goal && t.goal > 0 ? t.goal : 10;
  return Math.max(0, Math.min(1, value / ref));
}

/** Buzz on the tap, then on every kick of the drop. */
function vibrationFor(timeline: DropTimeline): number[] {
  const pattern = [30];
  let cursor = 30;
  for (const kick of timeline.kicks) {
    const buzz = kick === timeline.dropAt ? 120 : 45;
    pattern.push(Math.max(0, kick - cursor), buzz);
    cursor = kick + buzz;
  }
  return pattern;
}

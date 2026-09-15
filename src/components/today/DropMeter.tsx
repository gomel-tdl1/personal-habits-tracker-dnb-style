"use client";

import { motion } from "motion/react";
import { isDone, progress } from "@/lib/habits";
import { useI18n } from "@/lib/i18n/provider";
import { PIGMENTS, entryKey, type EntryMap, type Tracker } from "@/lib/types";

/** One LED segment per scheduled tracker, filled by that tracker's progress. */
export function DropMeter({ trackers, map, date }: { trackers: Tracker[]; map: EntryMap; date: string }) {
  const { t } = useI18n();
  const values = trackers.map((tr) => map.get(entryKey(tr.id, date)));
  const done = trackers.filter((tr, i) => isDone(tr, values[i])).length;
  const complete = trackers.length > 0 && done === trackers.length;

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className={complete ? "font-medium text-ink" : "text-dim"}>{complete ? t.today.allDone : t.today.meter(done, trackers.length)}</span>
        <span className="tabular text-dim">{trackers.length ? Math.round((done / trackers.length) * 100) : 0}%</span>
      </div>
      <div
        className="flex h-3 gap-1.5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={trackers.length}
        aria-valuenow={done}
        aria-label={t.today.meter(done, trackers.length)}
      >
        {trackers.map((tr, i) => {
          const color = PIGMENTS[tr.color];
          const p = progress(tr, values[i]);
          return (
            <div key={tr.id} className="relative flex-1 overflow-hidden rounded-[4px] bg-panel-2">
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{ background: color, boxShadow: p >= 1 ? `0 0 14px ${color}` : undefined }}
                initial={false}
                animate={{ width: `${p * 100}%` }}
                transition={{ type: "spring", damping: 22, stiffness: 240 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

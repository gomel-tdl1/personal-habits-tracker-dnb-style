"use client";

import { motion } from "motion/react";
import { addDays } from "@/lib/dates";
import { bestStreak, currentStreak, doneOn, isScheduled } from "@/lib/habits";
import { useI18n } from "@/lib/i18n/provider";
import { PIGMENTS, type EntryMap, type Tracker } from "@/lib/types";

export function StreakWidget({ tracker, map, today }: { tracker: Tracker; map: EntryMap; today: string }) {
  const { t } = useI18n();
  const color = PIGMENTS[tracker.color];
  const current = currentStreak(tracker, map, today);
  const best = bestStreak(tracker, map, today);
  const recent = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline gap-2">
        <motion.span
          key={current}
          initial={{ scale: 1.25, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="display-tight tabular text-7xl font-black"
          style={{ textShadow: current > 0 ? `0 0 28px color-mix(in oklab, ${color} 55%, transparent)` : undefined }}
        >
          {current}
        </motion.span>
        <span className="text-sm text-dim">{t.dashboard.days(current)}</span>
      </div>
      <p className="mt-1 text-sm text-dim">
        {t.dashboard.best}: <span className="font-display tabular text-ink">{best}</span>
      </p>
      <div className="mt-auto flex gap-1 pt-4" aria-hidden>
        {recent.map((day) => {
          const scheduled = isScheduled(tracker, day);
          const done = scheduled && doneOn(tracker, map, day);
          return (
            <span
              key={day}
              className="h-5 flex-1 rounded-[3px]"
              style={{
                background: done ? color : scheduled ? "var(--color-panel-2)" : "transparent",
                border: scheduled ? undefined : "1px dashed var(--color-rig)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

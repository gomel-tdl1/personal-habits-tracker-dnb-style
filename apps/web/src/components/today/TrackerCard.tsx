"use client";

import { Flame } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { goalText } from "@drop/core/format";
import { isDone } from "@drop/core/habits";
import { useI18n } from "@/lib/i18n/provider";
import { PIGMENTS, type Tracker } from "@drop/core/types";
import type { Origin } from "../fx/bus";
import { CheckPad, CounterControl, NumberControl, SetsControl, TimeControl } from "./TrackerControls";
import type { CommitGesture } from "./useCommit";

export interface CardProps {
  tracker: Tracker;
  value: number | undefined;
  sets?: number[];
  streak: number;
  onCommit: (value: number | null, gesture: CommitGesture, origin: Origin, sets?: number[]) => void;
}

export function TrackerCard({ tracker, value, sets, streak, onCommit }: CardProps) {
  const { t, locale } = useI18n();
  const color = PIGMENTS[tracker.color];
  const done = isDone(tracker, value);
  const flash = useFlashOnDone(done);
  const goal = goalText(tracker, t, locale);

  const header = (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl text-xl transition-colors"
        style={{ background: `color-mix(in oklab, ${color} ${done ? 22 : 10}%, transparent)` }}
        aria-hidden
      >
        {tracker.emoji}
      </span>
      <div className="min-w-0 text-left">
        <p className="truncate text-[15px] font-medium leading-tight">{tracker.name}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-dim">
          {goal && <span className="tabular">{goal}</span>}
          {streak >= 2 && (
            <span className="flex items-center gap-0.5 tabular" style={{ color }} title={t.today.streak(streak)}>
              <Flame size={12} aria-hidden />
              {streak}
              <span className="sr-only">{t.today.streak(streak)}</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );

  const frame = `relative isolate overflow-hidden rounded-card border bg-panel p-4 transition-colors duration-300`;
  const frameStyle = {
    borderColor: done ? `color-mix(in oklab, ${color} 45%, transparent)` : "var(--color-rig)",
    backgroundImage: done ? `radial-gradient(120% 90% at 100% 100%, color-mix(in oklab, ${color} 14%, transparent), transparent 70%)` : undefined,
  };

  const glow = flash > 0 && (
    <motion.span
      key={flash}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 rounded-card"
      style={{ boxShadow: `inset 0 0 0 2px ${color}, inset 0 0 60px ${color}` }}
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 0.2, 0.8, 0] }}
      transition={{ duration: 0.9, times: [0, 0.15, 0.3, 1] }}
    />
  );

  if (tracker.type === "check") {
    return (
      <motion.button
        type="button"
        layout
        aria-pressed={done}
        onClick={(e) => onCommit(done ? null : 1, "toggle", pointOf(e))}
        whileTap={{ scale: 0.975 }}
        className={`${frame} flex min-h-[5.5rem] w-full items-center justify-between gap-3`}
        style={frameStyle}
      >
        {glow}
        {header}
        <CheckPad done={done} color={color} />
      </motion.button>
    );
  }

  return (
    <motion.div layout className={`${frame} flex flex-col gap-4`} style={frameStyle}>
      {glow}
      {header}
      {tracker.type === "counter" && <CounterControl tracker={tracker} value={value} color={color} done={done} onCommit={onCommit} />}
      {tracker.type === "sets" && <SetsControl tracker={tracker} value={value} sets={sets} color={color} done={done} onCommit={onCommit} />}
      {tracker.type === "number" && <NumberControl tracker={tracker} value={value} color={color} onCommit={onCommit} />}
      {tracker.type === "time" && <TimeControl tracker={tracker} value={value} color={color} onCommit={onCommit} />}
    </motion.div>
  );
}

function pointOf(e: React.MouseEvent): Origin {
  if (e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.right - 40, y: r.top + r.height / 2 };
}

/** Increments each time `done` flips from false to true after mount. */
function useFlashOnDone(done: boolean) {
  const [state, setState] = useState({ prev: done, flash: 0 });
  if (state.prev !== done) setState({ prev: done, flash: done ? state.flash + 1 : state.flash });
  return state.flash;
}

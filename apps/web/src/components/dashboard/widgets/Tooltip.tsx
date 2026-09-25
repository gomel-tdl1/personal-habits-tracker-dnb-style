"use client";

import { AnimatePresence, motion } from "motion/react";

export interface TipState {
  x: number;
  y: number;
  value: string;
  label: string;
  color?: string;
}

/** Positioned inside a `relative` chart container. Value leads, label follows. */
export function Tooltip({ tip }: { tip: TipState | null }) {
  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-rig bg-stage/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur"
          style={{ left: tip.x, top: tip.y - 10 }}
        >
          <div className="flex items-center gap-1.5">
            {tip.color && <span className="h-0.5 w-3 rounded-full" style={{ background: tip.color }} aria-hidden />}
            <span className="font-display tabular text-sm font-semibold text-ink">{tip.value}</span>
          </div>
          <div className="mt-0.5 text-dim">{tip.label}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

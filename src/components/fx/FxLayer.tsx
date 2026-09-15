"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { DropTimeline } from "@/lib/sound/drops";
import { BEAT } from "@/lib/sound/tempo";
import { fx, type FxEvent, type Origin } from "./bus";
import { DropShow } from "./DropShow";

interface Wave {
  id: number;
  origin: Origin;
  color: string;
  big: boolean;
}

let seq = 0;
const noop = () => () => {};

/** Full-screen, pointer-transparent layer for shockwaves and the day-complete drop. */
export function FxLayer() {
  const [waves, setWaves] = useState<Wave[]>([]);
  const [drop, setDrop] = useState<{ id: number; timeline: DropTimeline; clock?: () => number | null } | null>(null);
  const reduced = useReducedMotion();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const clearDrop = useCallback(() => setDrop(null), []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const off = fx.on((e: FxEvent) => {
      if (e.type === "shockwave") {
        const wave = { id: ++seq, origin: e.origin, color: e.color, big: Boolean(e.big) };
        timers.push(
          setTimeout(() => {
            setWaves((w) => [...w, wave]);
            timers.push(setTimeout(() => setWaves((w) => w.filter((x) => x.id !== wave.id)), 1400));
          }, e.delay ?? 0),
        );
      }
      if (e.type === "drop") setDrop({ id: ++seq, timeline: e.timeline, clock: e.clock });
    });
    return () => {
      off();
      timers.forEach(clearTimeout);
    };
  }, []);

  // Portaled to <body>: the drop show transforms <main>, which would trap a fixed child.
  if (!mounted) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {!reduced &&
        waves.map((w) => (
          <div key={w.id} className="absolute" style={{ left: w.origin.x, top: w.origin.y }}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: w.big ? 520 : 260,
                  height: w.big ? 520 : 260,
                  left: w.big ? -260 : -130,
                  top: w.big ? -260 : -130,
                  border: `${w.big ? 3 : 2}px solid ${w.color}`,
                  boxShadow: `0 0 24px ${w.color}, inset 0 0 24px ${w.color}`,
                }}
                initial={{ scale: 0.05, opacity: 0.9 }}
                animate={{ scale: 1, opacity: 0 }}
                transition={{ duration: 0.9, delay: (i * BEAT) / 4, ease: [0.1, 0.8, 0.2, 1] }}
              />
            ))}
            <motion.span
              className="absolute size-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
              style={{ background: w.color }}
              initial={{ opacity: 0.55, scale: 0.3 }}
              animate={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.6 }}
            />
          </div>
        ))}

      <AnimatePresence>{drop && <DropShow key={drop.id} timeline={drop.timeline} clock={drop.clock} onDone={clearDrop} />}</AnimatePresence>
    </div>,
    document.body,
  );
}

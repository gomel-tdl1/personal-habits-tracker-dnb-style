"use client";

import { motion } from "motion/react";
import { BEAT } from "@/lib/sound/tempo";
import { EASE_OUT, rand, type SceneProps } from "./shared";

/* Scenes for the synthesized drops. */

export function Lasers({ colors, beat }: SceneProps) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const color = colors[(i + beat) % colors.length];
        const fromLeft = i % 2 === 0;
        const angle = (fromLeft ? -1 : 1) * (15 + rand(beat, i) * 50);
        return (
          <motion.span
            key={i}
            className="absolute bottom-[-10vh] h-[170vh] w-[3px] origin-bottom"
            style={{
              left: `${fromLeft ? 6 + i * 3 : 94 - i * 3}%`,
              background: `linear-gradient(to top, ${color}, transparent 85%)`,
              boxShadow: `0 0 14px ${color}, 0 0 44px ${color}`,
            }}
            initial={{ rotate: fromLeft ? -70 : 70, opacity: 0 }}
            animate={{ rotate: angle, opacity: [1, 0.55] }}
            transition={{ rotate: { duration: BEAT * 0.5, ease: EASE_OUT }, opacity: { duration: BEAT * 1.5 } }}
          />
        );
      })}
    </>
  );
}

export function LedWall({ colors, beat }: SceneProps) {
  const cols = 14;
  return (
    <div className="absolute inset-0 flex items-end gap-[1.2vw] px-[2vw] opacity-70">
      {Array.from({ length: cols }, (_, i) => {
        const h = 0.25 + rand(beat, i) * 0.75;
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            className="h-full flex-1 origin-bottom"
            style={{
              background: `repeating-linear-gradient(to top, ${color} 0 10px, transparent 10px 16px)`,
              filter: `drop-shadow(0 0 12px ${color})`,
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [h, h * 0.35] }}
            transition={{ duration: BEAT * 1.4, ease: EASE_OUT }}
          />
        );
      })}
    </div>
  );
}

export function Sunburst({ colors, beat }: SceneProps) {
  const rays = colors.flatMap((c) => [`${c}55 0deg 6deg`, "transparent 6deg 30deg"]).join(", ");
  return (
    <>
      <motion.div
        className="absolute left-1/2 top-1/2 size-[220vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `repeating-conic-gradient(from 0deg, ${rays})`,
          maskImage: "radial-gradient(circle, black 5%, transparent 45%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: BEAT * 32, ease: "linear", repeat: Infinity }}
      />
      {beat > 0 && (
        <motion.span
          key={beat}
          className="absolute left-1/2 top-1/2 size-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ border: `3px solid ${colors[beat % colors.length]}`, boxShadow: `0 0 40px ${colors[beat % colors.length]}` }}
          initial={{ scale: 0.1, opacity: 1 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: BEAT * 2, ease: EASE_OUT }}
        />
      )}
    </>
  );
}

export function Equalizer({ colors, beat }: SceneProps) {
  const bars = 32;
  return (
    <>
      <motion.div
        className="absolute inset-x-0 top-0 h-2/3"
        style={{ background: `linear-gradient(to bottom, ${colors[beat % colors.length]}40, transparent)` }}
        key={`wash-${beat}`}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: BEAT * 1.5 }}
      />
      <div className="absolute inset-x-0 bottom-0 flex h-[55vh] items-end gap-[3px] px-1">
        {Array.from({ length: bars }, (_, i) => {
          // A smooth hump that shifts each beat, like a spectrum analyser.
          const center = rand(beat, 0) * bars;
          const h = Math.max(0.08, Math.exp(-((i - center) ** 2) / 60) * 0.9 + rand(beat, i) * 0.25);
          const color = colors[Math.floor((i / bars) * colors.length)];
          return (
            <motion.span
              key={i}
              className="flex-1 origin-bottom rounded-t-sm"
              style={{ height: "100%", background: `linear-gradient(to top, ${color}, ${color}00)`, boxShadow: `0 0 16px ${color}` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: [h, h * 0.3] }}
              transition={{ duration: BEAT * 1.6, ease: EASE_OUT }}
            />
          );
        })}
      </div>
    </>
  );
}

"use client";

import { motion } from "motion/react";
import { BAR, BEAT } from "@/lib/sound/tempo";
import { EASE_OUT, type SceneProps } from "./shared";

/** Alarm: a rotating siren beacon, hazard tape at the edges and red alert on every kick. */
export function Siren({ colors, beat, hit }: SceneProps) {
  const [amber, red, light, orange] = colors;
  const tape = `repeating-linear-gradient(-45deg, ${amber} 0 22px, #140A00 22px 44px)`;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Beams from a beacon just below the top tape, so every angle sweeps across the screen. */}
      <div className="absolute left-1/2 top-[14%] size-[280vmax] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${amber}00 4deg, ${amber} 16deg, ${light} 22deg, ${amber} 28deg, ${amber}00 42deg, transparent 180deg, ${red}00 184deg, ${red} 196deg, ${light}cc 202deg, ${red} 208deg, ${red}00 222deg)`,
            filter: "blur(4px)",
            mixBlendMode: "screen",
            opacity: 0.8,
            maskImage: "radial-gradient(circle, transparent 1%, black 3%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: BAR, ease: "linear", repeat: Infinity }}
        />
      </div>

      {/* Beacon dome. */}
      <motion.div
        key={`dome-${beat}`}
        className="absolute left-1/2 top-[14%] size-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle at 50% 0%, ${light}, ${amber} 45%, ${red} 100%)` }}
        initial={{ boxShadow: `0 0 90px 30px ${red}` }}
        animate={{ boxShadow: `0 0 30px 6px ${amber}` }}
        transition={{ duration: BEAT, ease: EASE_OUT }}
      />

      {/* Red alert around the edges on every kick. */}
      {beat > 0 && (
        <motion.div
          key={`alert-${beat}`}
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at center, transparent 40%, ${red} 110%)` }}
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: BEAT * 0.9, ease: EASE_OUT }}
        />
      )}

      {/* Hazard tape crawling along the top and bottom edges. */}
      {["top-0", "bottom-0"].map((edge, i) => (
        <motion.div
          key={edge}
          className={`absolute inset-x-0 ${edge} h-[6vh] min-h-8`}
          style={{ backgroundImage: tape, backgroundSize: "62px 62px", boxShadow: `0 0 24px ${orange}` }}
          animate={{ backgroundPositionX: i ? ["62px", "0px"] : ["0px", "62px"] }}
          transition={{ duration: BEAT * 2, ease: "linear", repeat: Infinity }}
        />
      ))}

      {/* Snares blink the tape brighter. */}
      {hit > 0 && (
        <motion.div
          key={`blink-${hit}`}
          className="absolute inset-0"
          style={{ boxShadow: `inset 0 0 0 6px ${amber}, inset 0 0 80px ${amber}` }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: BEAT * 0.5 }}
        />
      )}
    </div>
  );
}

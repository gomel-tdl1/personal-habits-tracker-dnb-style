"use client";

import { motion } from "motion/react";
import { BEAT } from "@/lib/sound/tempo";
import { EASE_OUT, type SceneProps } from "./shared";

const WEDGES = 12;
/** A 30° slice from the centre up to the top edge (tan 30° ≈ 0.577). */
const WEDGE = "polygon(50% 50%, 50% 0%, 78.87% 0%)";

/** Rave Machine (VIP): a kaleidoscope that changes its face on every kick, amber and blue trading places. */
export function Kaleido({ colors, beat, hit }: SceneProps) {
  const [amber, blue, white, pink] = colors;
  const flip = beat % 2 === 1;
  const a = flip ? blue : amber;
  const b = flip ? amber : blue;
  const face = beat % 4;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ maskImage: "radial-gradient(circle, black 30%, transparent 75%)" }}>
      {/* Larger than the screen, so centre it absolutely (grid centring doesn't apply to overflowing items). */}
      <div className="absolute left-1/2 top-1/2 size-[150vmax] -translate-x-1/2 -translate-y-1/2">
        <motion.div className="absolute inset-0 opacity-80" animate={{ rotate: beat * 15 }} transition={{ type: "spring", stiffness: 160, damping: 13 }}>
          {Array.from({ length: WEDGES }, (_, i) => (
            <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 30}deg) scaleX(${i % 2 ? -1 : 1})`, clipPath: WEDGE }}>
              <Face key={`${beat}-${face}`} face={face} a={a} b={b} white={white} pink={pink} />
            </div>
          ))}
        </motion.div>
        {/* Snares flip every colour for a moment. */}
        {hit > 0 && (
          <motion.div
            key={`invert-${hit}`}
            className="absolute inset-0 bg-white"
            style={{ mixBlendMode: "difference" }}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          />
        )}
      </div>
    </div>
  );
}

function Face({ face, a, b, white, pink }: { face: number; a: string; b: string; white: string; pink: string }) {
  const pop = { initial: { opacity: 0, scale: 0.7 }, animate: { opacity: 1, scale: 1 }, transition: { duration: BEAT * 0.5, ease: EASE_OUT } };
  const at = (left: number, top: number, size: number) => ({ left: `${left}%`, top: `${top}%`, width: `${size}%`, height: `${size}%` });

  if (face === 0) {
    // Stacked bars cutting across the slice.
    return (
      <>
        {[6, 16, 28, 40].map((top, i) => (
          <motion.span key={top} {...pop} className="absolute" style={{ left: "48%", top: `${top}%`, width: "34%", height: `${2.4 - i * 0.4}%`, background: i % 2 ? b : a, transformOrigin: "left" }} />
        ))}
      </>
    );
  }
  if (face === 1) {
    // Beads along the edge.
    return (
      <>
        {[4, 13, 22, 31, 40].map((top, i) => (
          <motion.span key={top} {...pop} className="absolute rounded-full" style={{ ...at(53 + i * 1.6, top, 5 - i * 0.6), background: i % 2 ? white : a, boxShadow: `0 0 18px ${a}` }} />
        ))}
      </>
    );
  }
  if (face === 2) {
    // Big shards.
    return (
      <>
        <motion.span {...pop} className="absolute" style={{ ...at(50, 2, 26), background: a, clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
        <motion.span {...pop} className="absolute" style={{ ...at(52, 24, 18), background: b, clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }} />
        <motion.span {...pop} className="absolute" style={{ ...at(50, 40, 8), background: pink, clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />
      </>
    );
  }
  // Rings centred on the kaleidoscope's middle.
  return (
    <>
      {[46, 34, 22, 12].map((r, i) => (
        <motion.span
          key={r}
          {...pop}
          className="absolute rounded-full"
          style={{ left: `${50 - r}%`, top: `${50 - r}%`, width: `${r * 2}%`, height: `${r * 2}%`, border: `${6 - i}px solid ${i % 2 ? b : a}` }}
        />
      ))}
    </>
  );
}

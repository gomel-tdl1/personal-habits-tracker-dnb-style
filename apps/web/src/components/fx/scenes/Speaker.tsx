"use client";

import { motion } from "motion/react";
import { BEAT } from "@/lib/sound/tempo";
import { EASE_OUT, rand, type SceneProps } from "./shared";

/** Amplify: a giant subwoofer whose cone punches out on every kick, blowing dust off the grille. */
export function Speaker({ colors, beat, hit }: SceneProps) {
  const [lime, green, white, deep] = colors;

  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      {/* Grille dots that bulge with the air pressure. */}
      <motion.div
        key={`grille-${beat}`}
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${lime}55 1.6px, transparent 2.2px)`,
          backgroundSize: "18px 18px",
          maskImage: "radial-gradient(circle, black 15%, transparent 70%)",
        }}
        initial={{ scale: 1.1, opacity: 1 }}
        animate={{ scale: 1, opacity: 0.45 }}
        transition={{ duration: BEAT, ease: EASE_OUT }}
      />

      <div className="relative aspect-square w-[min(92vmin,680px)]">
        {/* Frame with bolts. */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, #0c120c 62%, #2e3a2e 66%, #070a07 71%)`, boxShadow: `0 0 60px ${green}33` }}
        />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <span
              key={i}
              className="absolute size-[2.4%] rounded-full"
              style={{ left: `${50 + Math.cos(a) * 46.5 - 1.2}%`, top: `${50 + Math.sin(a) * 46.5 - 1.2}%`, background: "#6d7a6d" }}
            />
          );
        })}

        {/* Cone: punches out, overshoots back, settles. */}
        <motion.div
          key={`cone-${beat}`}
          className="absolute inset-[9%] rounded-full"
          initial={{ scale: beat ? 1.17 : 1 }}
          animate={{ scale: [beat ? 1.17 : 1, 0.95, 1] }}
          transition={{ duration: BEAT * 0.9, ease: EASE_OUT }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, transparent 83%, #1b241b 84%, #405040 91%, #111811 100%)" }} />
          <div
            className="absolute inset-[9%] rounded-full"
            style={{
              background: `repeating-radial-gradient(circle, ${deep}66 0 2px, transparent 2px 16px), radial-gradient(circle, ${lime} 0%, ${green} 38%, ${deep} 100%)`,
            }}
          />
          <motion.div
            key={`cap-${beat}`}
            className="absolute inset-[35%] rounded-full"
            style={{ background: `radial-gradient(circle at 35% 30%, ${white} 0%, ${lime} 30%, ${green} 70%, ${deep} 100%)` }}
            initial={{ scale: 1.3, boxShadow: `0 0 70px 20px ${lime}` }}
            animate={{ scale: 1, boxShadow: `0 0 24px 4px ${lime}88` }}
            transition={{ duration: BEAT * 0.8, ease: EASE_OUT }}
          />
        </motion.div>
      </div>

      {/* Dust blown out by the kick. */}
      {beat > 0 &&
        Array.from({ length: 22 }, (_, i) => {
          const a = (i / 22) * Math.PI * 2 + rand(beat, i) * 0.4;
          const d = 32 + rand(beat, i + 50) * 30;
          return (
            <motion.span
              key={`${beat}-${i}`}
              className="absolute left-1/2 top-1/2 size-1.5 rounded-full"
              style={{ background: i % 3 ? lime : white }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: `${Math.cos(a) * d}vmin`, y: `${Math.sin(a) * d}vmin`, opacity: 0 }}
              transition={{ duration: BEAT * 1.6, ease: EASE_OUT }}
            />
          );
        })}

      {/* Snares ring the frame. */}
      {hit > 0 && (
        <motion.div
          key={`frame-${hit}`}
          className="absolute aspect-square w-[min(92vmin,680px)] rounded-full"
          style={{ boxShadow: `0 0 0 3px ${white}, 0 0 50px ${lime}` }}
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: BEAT * 0.5 }}
        />
      )}
    </div>
  );
}

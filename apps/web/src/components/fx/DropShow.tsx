"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { DropTimeline } from "@/lib/sound/drops";
import { SCENES } from "@/lib/sound/scenes";
import { BEAT, BEAT_MS } from "@/lib/sound/tempo";
import { useI18n } from "@/lib/i18n/provider";
import { SCENE_COMPONENTS } from "./scenes";
import { EASE_OUT } from "./scenes/shared";

/**
 * The day-complete light show. Follows the drop's timeline: tension during the
 * build, then the scene plays, the page pumps on every kick and strobes on every snare.
 */
export function DropShow({
  timeline,
  clock,
  onDone,
}: {
  timeline: DropTimeline;
  clock?: () => number | null;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const { t } = useI18n();
  const [phase, setPhase] = useState<"build" | "drop" | "out">("build");
  const [beat, setBeat] = useState(0);
  const [hit, setHit] = useState(0);
  const title = useRef<HTMLParagraphElement>(null);
  const { colors, style } = timeline;
  const Scene = SCENE_COMPONENTS[style];

  useEffect(() => {
    const main = document.querySelector("main");
    const mountedAt = performance.now();
    // The audio clock when a drop is playing; wall time otherwise (muted, previews).
    const now = () => clock?.() ?? performance.now() - mountedAt;
    const { pump, pumpBeats } = SCENES[style];
    let kick = 0;
    let snare = 0;
    let dropped = false;
    let fading = false;
    let frame = 0;

    if (!reduced && main) {
      main.animate([{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(1.025)", filter: "brightness(0.7)" }], {
        duration: Math.max(0, timeline.dropAt - now()),
        easing: "cubic-bezier(.5,0,.9,.4)",
      });
    }

    const tick = () => {
      // Half a frame of look-ahead: the frame being prepared is shown ~8 ms from now.
      const t = now() + 8;
      if (!dropped && t >= timeline.dropAt) {
        dropped = true;
        setPhase("drop");
      }
      while (kick < timeline.kicks.length && t >= timeline.kicks[kick]) {
        const late = t - timeline.kicks[kick];
        kick++;
        setBeat(kick);
        // A beat we're far behind on (a hidden tab catching up) doesn't get a pump.
        if (reduced || late > 120) continue;
        main?.animate(pump, { duration: BEAT_MS * pumpBeats, easing: "cubic-bezier(.2,.9,.1,1)" });
        title.current?.animate([{ transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: BEAT_MS * 0.8, easing: "cubic-bezier(.2,.9,.1,1)" });
      }
      const snaresBefore = snare;
      while (snare < timeline.snares.length && t >= timeline.snares[snare]) snare++;
      if (!reduced && snare !== snaresBefore) setHit(snare);
      if (!fading && t >= timeline.end - BEAT_MS) {
        fading = true;
        setPhase("out");
      }
      if (t >= timeline.end) return onDone();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timeline, clock, reduced, style, onDone]);

  return (
    <motion.div className="absolute inset-0" animate={{ opacity: phase === "out" ? 0 : 1 }} transition={{ duration: BEAT * 2 }}>
      {phase === "build" && (
        <motion.div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 55%, transparent 20%, rgb(7 8 26 / 0.9) 75%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: timeline.dropAt / 1000, ease: [0.6, 0, 1, 0.6] }}
        />
      )}

      {phase !== "build" && (
        <>
          {!reduced && (
            <>
              <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: BEAT * 1.5 }} />
              <Scene colors={colors} beat={beat} hit={hit} />
              {hit > 0 && (
                <motion.div
                  key={hit}
                  className="absolute inset-0"
                  style={{ background: colors[hit % colors.length], mixBlendMode: "screen" }}
                  initial={{ opacity: 0.28 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                />
              )}
            </>
          )}

          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <motion.p
                ref={title}
                className="display-tight text-[clamp(5rem,26vw,16rem)] font-black uppercase text-white"
                style={{ textShadow: `0 0 30px ${colors[0]}, 0 0 90px ${colors[2 % colors.length]}` }}
                initial={reduced ? { opacity: 0 } : { scale: 2.4, opacity: 0, filter: "blur(20px)" }}
                animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                {t.today.drop}
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: BEAT, duration: 0.4 }}>
                {timeline.track ? (
                  <>
                    <p className="mx-auto max-w-[85vw] truncate font-display text-xl font-semibold text-white/90">{timeline.track.title}</p>
                    <p className="mx-auto mt-1 max-w-[85vw] truncate text-base text-white/65">{timeline.track.artist}</p>
                  </>
                ) : (
                  <p className="font-display text-lg font-semibold tracking-[0.3em] text-white/80 uppercase">{style}</p>
                )}
              </motion.div>

            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

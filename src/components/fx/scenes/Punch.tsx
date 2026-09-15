"use client";

import { motion } from "motion/react";
import { useId, useMemo } from "react";
import { useViewport } from "@/lib/hooks/useViewport";
import { BEAT } from "@/lib/sound/tempo";
import { EASE_OUT, rand, type SceneProps } from "./shared";

const MAX_HOLES = 9;
const WALL = "#12020A";

/** Punching Holes: every kick punches a ragged hole through a dark wall; molten light shows through. */
export function Punch({ colors, beat, hit }: SceneProps) {
  const [red, violet, ember, hot] = colors;
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { w, h } = useViewport();
  const unit = Math.min(w, h);

  const holes = useMemo(
    () =>
      Array.from({ length: Math.min(beat, MAX_HOLES) }, (_, k) => {
        const b = beat - k;
        const r = unit * (0.07 + rand(b, 3) * 0.07);
        return { b, x: w * (0.1 + rand(b, 1) * 0.8), y: h * (0.12 + rand(b, 2) * 0.76), r, rot: rand(b, 4) * 360 };
      }),
    [beat, w, h, unit],
  );

  if (!w) return null;
  const newest = holes[0];

  return (
    <svg className="absolute inset-0 size-full" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={hot} />
          <stop offset="30%" stopColor={ember} />
          <stop offset="65%" stopColor={red} />
          <stop offset="100%" stopColor={violet} stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-wall`}>
          <rect width={w} height={h} fill="white" />
          {holes.map((hole) => (
            <g key={hole.b} transform={`translate(${hole.x} ${hole.y}) rotate(${hole.rot})`}>
              <motion.polygon
                points={ragged(hole.b, hole.r)}
                fill="black"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.18, 1] }}
                transition={{ duration: BEAT * 0.6, ease: EASE_OUT }}
              />
            </g>
          ))}
        </mask>
      </defs>

      {/* Light behind the wall, flaring on each kick. */}
      <rect width={w} height={h} fill={violet} opacity={0.35} />
      {holes.map((hole, k) => (
        <motion.circle
          key={hole.b}
          cx={hole.x}
          cy={hole.y}
          r={hole.r * 2.4}
          fill={`url(#${id}-glow)`}
          initial={{ opacity: 1 }}
          animate={{ opacity: k === 0 ? [1, 0.7] : 0.55 }}
          transition={{ duration: BEAT * 2 }}
        />
      ))}

      {/* The wall shudders on every snare. */}
      <motion.g key={`wall-${hit}`} animate={{ x: [0, -10, 7, -3, 0], y: [0, 4, -3, 1, 0] }} transition={{ duration: 0.28 }}>
        <rect width={w} height={h} fill={WALL} fillOpacity={0.94} mask={`url(#${id}-wall)`} />
        {holes.map((hole, k) =>
          cracks(hole.b, hole.r).map((points, i) => (
            <motion.polyline
              key={`${hole.b}-${i}`}
              points={points}
              transform={`translate(${hole.x} ${hole.y})`}
              fill="none"
              stroke={i % 2 ? violet : red}
              strokeWidth={k === 0 ? 2.5 : 1.5}
              strokeLinecap="round"
              opacity={k === 0 ? 0.95 : 0.45}
              initial={{ pathLength: k === 0 ? 0 : 1 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: BEAT * 0.4, ease: EASE_OUT }}
            />
          )),
        )}
      </motion.g>

      {newest && (
        <motion.circle
          key={`flash-${newest.b}`}
          cx={newest.x}
          cy={newest.y}
          r={newest.r}
          fill={hot}
          initial={{ opacity: 0.9, scale: 0.6 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: BEAT * 0.8, ease: EASE_OUT }}
        />
      )}
    </svg>
  );
}

/** Jagged outline around the origin. */
function ragged(seed: number, r: number) {
  const n = 16;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 0.72 + rand(seed, i + 10) * 0.42;
    return `${(Math.cos(a) * r * k).toFixed(1)},${(Math.sin(a) * r * k).toFixed(1)}`;
  }).join(" ");
}

/** A few zig-zag cracks running out from the hole's rim. */
function cracks(seed: number, r: number) {
  return Array.from({ length: 5 }, (_, c) => {
    let a = (c / 5) * Math.PI * 2 + rand(seed, c + 40) * 0.8;
    let d = r * 0.95;
    const pts = [[Math.cos(a) * d, Math.sin(a) * d]];
    for (let s = 0; s < 4; s++) {
      a += (rand(seed, c * 7 + s) - 0.5) * 0.9;
      d += r * (0.35 + rand(seed, c * 13 + s) * 0.5);
      pts.push([Math.cos(a) * d, Math.sin(a) * d]);
    }
    return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  });
}

"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { useViewport } from "@/lib/hooks/useViewport";
import { BEAT } from "@/lib/sound/tempo";
import { EASE_OUT, rand, type SceneProps } from "./shared";

const TRACES = 20;
const PULSE = 120;

/** Ex Machina: current races out of a central chip along circuit traces on every kick. */
export function Circuit({ colors, beat, hit }: SceneProps) {
  const [magenta, teal, white, steel] = colors;
  const { w, h } = useViewport();
  const unit = Math.min(w, h);
  const traces = useMemo(() => buildTraces(w, h, unit), [w, h, unit]);
  if (!w) return null;
  const cx = w / 2;
  const cy = h / 2;
  const chip = unit * 0.16;

  return (
    <div className="absolute inset-0 bg-[#04060c]/80">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(${teal}22 1px, transparent 1px), linear-gradient(90deg, ${teal}22 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${w} ${h}`} aria-hidden>
        {traces.map((t, i) => (
          <g key={i}>
            <polyline points={t.points} fill="none" stroke={teal} strokeOpacity={0.3} strokeWidth={2} strokeLinejoin="round" />
            <circle cx={t.via[0]} cy={t.via[1]} r={4} fill="none" stroke={teal} strokeOpacity={0.5} strokeWidth={1.5} />
          </g>
        ))}

        {/* Pulses: alternating halves of the board fire on alternate kicks; each half keeps its latest pulse. */}
        {[beat, beat - 1].filter((b) => b > 0).flatMap((b) =>
          traces.map((t, i) =>
            i % 2 === b % 2 ? (
              <motion.polyline
                key={`${b}-${i}`}
                points={t.points}
                fill="none"
                stroke={magenta}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                // Dash sizes in px: motion's own pathLength handling would override a custom dash pattern.
                strokeDasharray={`${PULSE} ${t.length + PULSE}`}
                style={{ filter: `drop-shadow(0 0 6px ${magenta})` }}
                initial={{ strokeDashoffset: PULSE }}
                animate={{ strokeDashoffset: -t.length }}
                transition={{ duration: BEAT * (2.6 + rand(i, 3) * 1.2), ease: "linear" }}
              />
            ) : null,
          ),
        )}

        {/* Snares flash the whole board. */}
        {hit > 0 && (
          <motion.g key={`flash-${hit}`} initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: BEAT * 0.6 }}>
            {traces.map((t, i) => (
              <polyline key={i} points={t.points} fill="none" stroke={white} strokeWidth={2.5} strokeLinejoin="round" />
            ))}
          </motion.g>
        )}

        {/* The chip. */}
        <g transform={`translate(${cx} ${cy})`}>
          <motion.circle
            r={chip * 0.95}
            fill="none"
            stroke={magenta}
            strokeWidth={2}
            strokeDasharray="3 9"
            animate={{ rotate: 360 }}
            transition={{ duration: BEAT * 16, ease: "linear", repeat: Infinity }}
          />
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1={-chip * 0.45 + (i * chip * 0.9) / 7}
              x2={-chip * 0.45 + (i * chip * 0.9) / 7}
              y1={-chip * 0.62}
              y2={chip * 0.62}
              stroke={steel}
              strokeWidth={2}
            />
          ))}
          <motion.rect
            key={`chip-${beat}`}
            x={-chip * 0.5}
            y={-chip * 0.5}
            width={chip}
            height={chip}
            rx={6}
            fill="#0B0F1A"
            stroke={magenta}
            strokeWidth={3}
            initial={{ scale: 1.12, filter: `drop-shadow(0 0 22px ${magenta})` }}
            animate={{ scale: 1, filter: `drop-shadow(0 0 6px ${magenta})` }}
            transition={{ duration: BEAT, ease: EASE_OUT }}
          />
          <rect x={-chip * 0.22} y={-chip * 0.22} width={chip * 0.44} height={chip * 0.44} rx={3} fill={magenta} opacity={0.35} />
        </g>
      </svg>
    </div>
  );
}

/** Orthogonal/diagonal traces from the chip to beyond the screen edge. */
function buildTraces(w: number, h: number, unit: number) {
  const cx = w / 2;
  const cy = h / 2;
  const reach = Math.hypot(w, h);
  return Array.from({ length: TRACES }, (_, i) => {
    const dir = Math.round((i / TRACES) * 8) % 8;
    const a = (dir * Math.PI) / 4;
    const turn = ((rand(i, 1) > 0.5 ? 1 : -1) * Math.PI) / 4;
    const offset = (rand(i, 2) - 0.5) * unit * 0.14;
    const perp = [-Math.sin(a), Math.cos(a)];
    const start = [cx + Math.cos(a) * unit * 0.1 + perp[0] * offset, cy + Math.sin(a) * unit * 0.1 + perp[1] * offset];
    const l1 = unit * (0.08 + rand(i, 3) * 0.14);
    const p1 = [start[0] + Math.cos(a) * l1, start[1] + Math.sin(a) * l1];
    const l2 = unit * (0.05 + rand(i, 4) * 0.12);
    const p2 = [p1[0] + Math.cos(a + turn) * l2, p1[1] + Math.sin(a + turn) * l2];
    const p3 = [p2[0] + Math.cos(a) * reach, p2[1] + Math.sin(a) * reach];
    const fmt = (p: number[]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    // Only the on-screen part matters for the pulse's travel.
    const length = l1 + l2 + Math.max(w, h);
    return { points: [start, p1, p2, p3].map(fmt).join(" "), via: p2, length };
  });
}

"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { BEAT, BEAT_MS } from "@/lib/sound/tempo";
import { rand, type SceneProps } from "./shared";

/** Where stones land, in fractions of the screen (below the horizon at 40%). */
const SOURCES = [
  [0.3, 0.58],
  [0.7, 0.66],
  [0.5, 0.82],
];
const RING_MS = BEAT_MS * 7;
/** Rings are squashed vertically so they read as a surface seen at an angle. */
const TILT = 0.3;

interface Ring {
  x: number;
  y: number;
  start: number;
  color: string;
  width: number;
}

/**
 * Everyday: a lake seen at an angle; each kick drops a stone at one of three spots
 * and the waves interfere. Rings are drawn on one canvas: a stack of huge, blurred
 * DOM rings made the browser juggle a dozen giant layers once the drop got going.
 */
export function Ripple({ colors, beat, hit }: SceneProps) {
  const [orchid, lime, light, deep] = colors;
  const canvas = useRef<HTMLCanvasElement>(null);
  const rings = useRef<Ring[]>([]);

  // Each kick drops a stone: three rings, half a beat apart.
  useEffect(() => {
    if (beat <= 0) return;
    const [x, y] = SOURCES[beat % SOURCES.length];
    const color = beat % 2 ? orchid : lime;
    const now = performance.now();
    for (let i = 0; i < 3; i++) rings.current.push({ x, y, start: now + (i * BEAT_MS) / 2, color, width: i === 0 ? 4 : 2.5 });
  }, [beat, orchid, lime]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let frame = 0;

    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      const reach = Math.max(w, h) * 0.6;
      rings.current = rings.current.filter((r) => now - r.start < RING_MS);
      for (const r of rings.current) {
        const p = (now - r.start) / RING_MS;
        if (p < 0) continue;
        const grow = 1 - Math.pow(1 - p, 2.4);
        const rx = reach * (0.02 + grow * 1.28);
        const alpha = 0.95 * (1 - p);
        ctx.strokeStyle = r.color;
        // Glow: a wide faint stroke under a thin bright one (cheaper than a blur).
        for (const [width, a] of [
          [r.width * 6, alpha * 0.12],
          [r.width * 2.5, alpha * 0.25],
          [r.width, alpha],
        ]) {
          ctx.globalAlpha = a;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.ellipse(r.x * w, r.y * h, rx, rx * TILT, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, ${deep}00 0%, ${deep}cc 42%, ${deep} 100%), radial-gradient(ellipse 80% 30% at 50% 40%, ${lime}40, transparent 70%)` }}
      />

      {/* Horizon line. */}
      <div className="absolute inset-x-0 top-[40%] h-px" style={{ background: `linear-gradient(90deg, transparent, ${light}99, transparent)` }} />

      <canvas ref={canvas} className="absolute inset-0 size-full" />

      {/* Snares send a glint across the surface (moved with transforms only). */}
      {hit > 0 && (
        <motion.div
          key={`glint-${hit}`}
          className="absolute inset-x-0 top-[42%] h-2"
          style={{ background: `linear-gradient(90deg, transparent, ${light}66 30%, ${light} 50%, ${light}66 70%, transparent)` }}
          initial={{ y: "27vh", scaleY: 0.6, opacity: 0.9 }}
          animate={{ y: "0vh", scaleY: 0.25, opacity: 0 }}
          transition={{ duration: BEAT * 1.2, ease: "easeOut" }}
        />
      )}

      {/* Airy top end: specks drifting up. */}
      {Array.from({ length: 18 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute size-1 rounded-full"
          style={{ left: `${rand(i, 1) * 100}%`, top: `${60 + rand(i, 2) * 40}%`, background: i % 3 ? light : lime }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: `-${30 + rand(i, 3) * 20}vh`, opacity: [0, 0.9, 0] }}
          transition={{ duration: BEAT * (8 + rand(i, 4) * 8), delay: rand(i, 5) * BEAT * 4, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

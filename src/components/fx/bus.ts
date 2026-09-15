"use client";

import type { DropTimeline } from "@/lib/sound/drops";

export interface Origin {
  x: number;
  y: number;
}

export type FxEvent =
  | { type: "shockwave"; origin: Origin; color: string; big?: boolean; delay?: number }
  | { type: "drop"; timeline: DropTimeline; clock?: () => number | null }
  | { type: "hit"; color: string; strength: number };

type Listener = (e: FxEvent) => void;
const listeners = new Set<Listener>();

export const fx = {
  emit(e: FxEvent) {
    listeners.forEach((l) => l(e));
  },
  on(l: Listener) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};

/** Screen point for an interaction; falls back to the element center for keyboard clicks. */
export function originOf(e: React.MouseEvent | React.PointerEvent): Origin {
  if (e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function originOfElement(el: Element | null): Origin {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

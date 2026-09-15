"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

/** Window size in CSS pixels; 0×0 during server rendering. */
export function useViewport(): { w: number; h: number } {
  const key = useSyncExternalStore(subscribe, () => `${window.innerWidth}x${window.innerHeight}`, () => "0x0");
  const [w, h] = key.split("x").map(Number);
  return { w, h };
}

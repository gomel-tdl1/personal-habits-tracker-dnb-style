"use client";

import { useCallback, useSyncExternalStore } from "react";
import { sound } from "./engine";

const KEY = "sound";
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === "off";
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") sound.muted = readMuted();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSoundEnabled(): [boolean, (on: boolean) => void] {
  const muted = useSyncExternalStore(subscribe, () => sound.muted, () => false);
  const set = useCallback((on: boolean) => {
    sound.muted = !on;
    try {
      localStorage.setItem(KEY, on ? "on" : "off");
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  return [!muted, set];
}

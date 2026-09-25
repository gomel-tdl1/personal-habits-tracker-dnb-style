"use client";

import { useSyncExternalStore } from "react";
import { todayKey } from "@drop/core/dates";

function subscribe(cb: () => void) {
  // Re-check the date when the app comes back to the foreground or once a minute.
  document.addEventListener("visibilitychange", cb);
  const timer = setInterval(cb, 60_000);
  return () => {
    document.removeEventListener("visibilitychange", cb);
    clearInterval(timer);
  };
}

/** Today's local date key, or null during server rendering. */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, todayKey, () => null);
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/provider";

type MessageKey = "saveError" | "loadError";

let current: { id: number; key: MessageKey } | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(key: MessageKey) {
  current = { id: Date.now(), key };
  listeners.forEach((l) => l());
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    listeners.forEach((l) => l());
  }, 3500);
}

export function Toaster() {
  const { t } = useI18n();
  const msg = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => current,
    () => null,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+var(--safe-bottom))] z-[70] flex justify-center px-4 md:bottom-8">
      <AnimatePresence>
        {msg && (
          <motion.div
            key={msg.id}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-full border border-red/40 bg-panel-2 px-4 py-2.5 text-sm text-ink shadow-[0_0_24px_rgb(255_59_59/0.25)]"
          >
            {t.common[msg.key]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useIsDesktop } from "@/lib/hooks/useMediaQuery";
import { useI18n } from "@/lib/i18n/provider";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const noop = () => () => {};

/** Bottom sheet on phones, centered dialog on desktop. */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const desktop = useIsDesktop();
  const { t } = useI18n();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-stage/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.75rem] border border-rig bg-panel outline-none md:max-h-[85dvh] md:max-w-lg md:rounded-[1.5rem]"
            initial={desktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.97, y: 8 } : { y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            drag={desktop ? false : "y"}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!desktop && (
              <div className="shrink-0 touch-none pt-2.5" onPointerDown={(e) => drag.start(e)} aria-hidden>
                <div className="mx-auto h-1 w-10 rounded-full bg-rig" />
              </div>
            )}
            <header
              className="flex shrink-0 touch-none items-center justify-between gap-4 px-5 pb-2 pt-3 md:touch-auto md:pt-5"
              onPointerDown={(e) => !desktop && drag.start(e)}
            >
              <h2 id={titleId} className="font-display text-xl font-semibold">
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label={t.common.close}
                className="grid size-10 place-items-center rounded-full text-dim transition-colors hover:bg-panel-2 hover:text-ink"
              >
                <X size={20} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              {children}
            </div>
            {footer && (
              <footer className="flex shrink-0 gap-3 border-t border-rig px-5 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] md:pb-5">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

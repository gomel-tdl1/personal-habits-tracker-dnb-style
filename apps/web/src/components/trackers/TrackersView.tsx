"use client";

import { ChevronDown, GripVertical, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { goalText, scheduleText } from "@drop/core/format";
import { useI18n } from "@/lib/i18n/provider";
import { useReorderTrackers, useTrackers } from "@/lib/queries";
import { PIGMENTS, type Tracker } from "@drop/core/types";
import { SortableItem, SortableList } from "../ui/Sortable";
import { Button } from "../ui/controls";
import { TrackerEditor } from "./TrackerEditor";

export function TrackersView() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { data = [], isLoading, isError } = useTrackers();
  const reorder = useReorderTrackers();
  const [editing, setEditing] = useState<Tracker | null>(null);
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [showArchive, setShowArchive] = useState(false);

  const active = data.filter((tr) => !tr.archived_at);
  const archived = data.filter((tr) => tr.archived_at);

  const close = () => {
    setEditing(null);
    setCreating(false);
    if (params.get("new")) router.replace("/trackers");
  };

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h1 className="display-tight text-[clamp(2.75rem,11vw,4.5rem)] font-extrabold uppercase">{t.trackers.title}</h1>
        <Button variant="primary" accent="var(--color-cyan)" onClick={() => setCreating(true)} className="mb-1 shrink-0">
          <Plus size={20} strokeWidth={2.5} />
          <span className="hidden sm:inline">{t.trackers.new}</span>
        </Button>
      </div>

      {isError && <p className="mt-6 text-red">{t.common.loadError}</p>}
      {isLoading && <div className="mt-8 h-40 animate-pulse rounded-card border border-rig bg-panel" />}
      {!isLoading && active.length === 0 && <p className="mt-8 text-dim">{t.trackers.empty}</p>}

      {active.length > 0 && (
        <>
          <p className="mt-6 text-sm text-faint">{t.trackers.reorder}</p>
          <SortableList items={active} onReorder={(ids) => reorder.mutate(ids)}>
            <ul className="mt-3 grid gap-2 lg:grid-cols-2">
              {active.map((tr) => (
                <li key={tr.id}>
                  <SortableItem id={tr.id}>
                    {(handle, dragging) => <Row tracker={tr} handle={handle} dragging={dragging} onOpen={() => setEditing(tr)} />}
                  </SortableItem>
                </li>
              ))}
            </ul>
          </SortableList>
        </>
      )}

      {archived.length > 0 && (
        <section className="mt-10">
          <button
            onClick={() => setShowArchive((s) => !s)}
            aria-expanded={showArchive}
            className="flex h-11 items-center gap-2 text-dim transition-colors hover:text-ink"
          >
            <motion.span animate={{ rotate: showArchive ? 0 : -90 }}>
              <ChevronDown size={18} />
            </motion.span>
            {t.trackers.archived}
            <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs tabular">{archived.length}</span>
          </button>
          <AnimatePresence initial={false}>
            {showArchive && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid gap-2 overflow-hidden lg:grid-cols-2"
              >
                {archived.map((tr) => (
                  <li key={tr.id} className="opacity-60">
                    <Row tracker={tr} onOpen={() => setEditing(tr)} />
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}

      <TrackerEditor open={creating || editing !== null} tracker={editing} nextPosition={active.length} onClose={close} />
    </>
  );
}

function Row({
  tracker,
  handle,
  dragging = false,
  onOpen,
}: {
  tracker: Tracker;
  handle?: React.HTMLAttributes<HTMLElement>;
  dragging?: boolean;
  onOpen: () => void;
}) {
  const { t, locale } = useI18n();
  const color = PIGMENTS[tracker.color];
  const goal = goalText(tracker, t, locale);
  return (
    <div
      className="flex items-center gap-1 rounded-card border bg-panel pr-2 transition-shadow"
      style={{
        borderColor: dragging ? color : "var(--color-rig)",
        boxShadow: dragging ? `0 0 28px color-mix(in oklab, ${color} 35%, transparent)` : undefined,
      }}
    >
      {handle ? (
        <button {...handle} type="button" aria-label={t.trackers.reorder} className="grid h-16 w-10 shrink-0 cursor-grab place-items-center text-faint active:cursor-grabbing">
          <GripVertical size={18} />
        </button>
      ) : (
        <span className="w-4" />
      )}
      <button type="button" onClick={onOpen} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} aria-hidden />
        <span className="text-xl" aria-hidden>
          {tracker.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{tracker.name}</span>
          <span className="mt-1 flex min-w-0 items-center gap-3 text-xs text-dim">
            <span className="truncate">{scheduleText(tracker, t)}</span>
            {goal && (
              <span className="shrink-0 tabular" style={{ color }}>
                {goal}
              </span>
            )}
            <span className="shrink-0 text-faint">{t.trackers.types[tracker.type]}</span>
          </span>
        </span>
      </button>
    </div>
  );
}

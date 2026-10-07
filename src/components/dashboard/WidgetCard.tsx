"use client";

import { GripVertical, Pencil, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useI18n } from "@/lib/i18n/provider";
import { useDeleteWidget, useSaveWidget } from "@/lib/queries";
import type { EntryMap, Tracker, Widget, WidgetSize } from "@/lib/types";
import { Segmented } from "../ui/controls";
import { CompletionWidget } from "./widgets/Completion";
import { DailyChart } from "./widgets/DailyChart";
import { Heatmap } from "./widgets/Heatmap";
import { StreakWidget } from "./widgets/Streak";

export const SPAN: Record<WidgetSize, string> = {
  S: "col-span-1",
  M: "col-span-2",
  L: "col-span-2 md:col-span-4",
};

/** Sizes a widget kind can use; charts need at least two columns. */
export const SIZES_FOR = (kind: Widget["kind"]): WidgetSize[] => (kind === "streak" || kind === "completion" ? ["S", "M", "L"] : ["M", "L"]);

interface Props {
  widget: Widget;
  trackers: Tracker[];
  allActive: Tracker[];
  map: EntryMap;
  today: string;
  editing: boolean;
  handle: React.HTMLAttributes<HTMLElement>;
  dragging: boolean;
  onEdit: () => void;
}

export function WidgetCard({ widget, trackers, allActive, map, today, editing, handle, dragging, onEdit }: Props) {
  const { t } = useI18n();
  const save = useSaveWidget();
  const remove = useDeleteWidget();
  const scoped = widget.tracker_ids.length === 0 ? allActive : widget.tracker_ids.flatMap((id) => trackers.find((tr) => tr.id === id) ?? []);
  const single = scoped[0];
  const needsSingle = widget.kind === "streak" || widget.kind === "daily_chart";

  const subtitle =
    widget.tracker_ids.length === 0
      ? t.dashboard.allTrackers
      : scoped.length === 1
        ? `${scoped[0].emoji} ${scoped[0].name}`
        : scoped.map((tr) => tr.emoji).join(" ");

  return (
    <motion.article
      className="flex h-full min-h-44 flex-col rounded-card border bg-panel p-4 transition-shadow md:p-5"
      style={{
        borderColor: dragging ? "var(--color-cyan)" : "var(--color-rig)",
        boxShadow: dragging ? "0 0 32px rgb(39 232 245 / 0.25)" : undefined,
      }}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{t.dashboard.kinds[widget.kind]}</h2>
          <p className="mt-0.5 truncate text-xs text-dim">
            {subtitle}
            {widget.kind !== "streak" && <span className="ml-2 text-faint">{t.dashboard.periods[widget.period]}</span>}
          </p>
        </div>
        <AnimatePresence initial={false}>
          {editing && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="-mr-2 -mt-2 flex shrink-0">
              <button type="button" onClick={onEdit} aria-label={t.common.edit} className="grid size-10 place-items-center rounded-lg text-dim hover:text-ink">
                <Pencil size={16} />
              </button>
              <button type="button" onClick={() => remove.mutate(widget.id)} aria-label={t.common.delete} className="grid size-10 place-items-center rounded-lg text-dim hover:text-red">
                <Trash size={16} />
              </button>
              <button {...handle} type="button" aria-label={t.trackers.reorder} className="grid size-10 cursor-grab place-items-center rounded-lg text-dim active:cursor-grabbing">
                <GripVertical size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="min-h-0 flex-1">
        {needsSingle && !single ? (
          <p className="text-sm text-dim">{t.dashboard.deleted}</p>
        ) : widget.kind === "streak" ? (
          <StreakWidget tracker={single} map={map} today={today} />
        ) : widget.kind === "daily_chart" ? (
          <DailyChart trackers={scoped} map={map} today={today} period={widget.period} />
        ) : widget.kind === "heatmap" ? (
          <Heatmap trackers={scoped} map={map} today={today} period={widget.period} />
        ) : (
          <CompletionWidget trackers={scoped} map={map} today={today} period={widget.period} compact={widget.size === "S"} />
        )}
      </div>

      {editing && SIZES_FOR(widget.kind).length > 1 && (
        <div className="mt-4">
          <Segmented<WidgetSize>
            label={t.dashboard.size}
            value={widget.size}
            onChange={(size) => save.mutate({ ...widget, size })}
            options={SIZES_FOR(widget.kind).map((s) => ({ value: s, label: t.dashboard.sizes[s] }))}
          />
        </div>
      )}
    </motion.article>
  );
}

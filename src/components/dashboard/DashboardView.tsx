"use client";

import { LayoutGrid, Plus } from "lucide-react";
import { useState } from "react";
import { useToday } from "@/lib/hooks/useToday";
import { useI18n } from "@/lib/i18n/provider";
import { useActiveTrackers, useEntryMap, useReorderWidgets, useTrackers, useWidgets } from "@/lib/queries";
import type { Widget } from "@/lib/types";
import { SortableItem, SortableList } from "../ui/Sortable";
import { Button } from "../ui/controls";
import { SPAN, WidgetCard } from "./WidgetCard";
import { WidgetEditor } from "./WidgetEditor";

export function DashboardView() {
  const { t } = useI18n();
  const today = useToday();
  const widgetsQuery = useWidgets();
  const trackersQuery = useTrackers();
  const active = useActiveTrackers();
  const { map, isLoading: entriesLoading } = useEntryMap();
  const reorder = useReorderWidgets();
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<{ widget: Widget | null } | null>(null);

  const widgets = widgetsQuery.data ?? [];
  const loading = !today || widgetsQuery.isLoading || trackersQuery.isLoading || entriesLoading;

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <h1 className="display-tight min-w-0 truncate text-[clamp(2.75rem,11vw,4.5rem)] font-extrabold uppercase">{t.dashboard.title}</h1>
        <div className="mb-1 flex shrink-0 gap-2">
          {widgets.length > 0 && (
            <Button onClick={() => setEditing((e) => !e)} aria-pressed={editing} aria-label={editing ? t.dashboard.finish : t.dashboard.editLayout} className="px-3.5 sm:px-5">
              <LayoutGrid size={18} className={editing ? "text-cyan" : undefined} />
              <span className="hidden sm:inline">{editing ? t.dashboard.finish : t.dashboard.editLayout}</span>
            </Button>
          )}
          <Button variant="primary" accent="var(--color-cyan)" onClick={() => setSheet({ widget: null })} aria-label={t.dashboard.addWidget}>
            <Plus size={20} strokeWidth={2.5} />
            <span className="hidden sm:inline">{t.dashboard.addWidget}</span>
          </Button>
        </div>
      </div>

      {widgetsQuery.isError && <p className="mt-6 text-red">{t.common.loadError}</p>}

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden>
          {["col-span-2", "col-span-1", "col-span-1", "col-span-2 md:col-span-4"].map((c, i) => (
            <div key={i} className={`${c} h-44 animate-pulse rounded-card border border-rig bg-panel`} />
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <button
          onClick={() => setSheet({ widget: null })}
          className="mt-8 flex w-full flex-col items-center gap-3 rounded-card border border-dashed border-rig p-10 text-dim transition-colors hover:border-cyan hover:text-ink"
        >
          <Plus size={28} />
          {t.dashboard.empty}
        </button>
      ) : (
        <SortableList items={widgets} onReorder={(ids) => reorder.mutate(ids)}>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {widgets.map((w) => (
              <SortableItem key={w.id} id={w.id} disabled={!editing} className={SPAN[w.size]}>
                {(handle, dragging) => (
                  <WidgetCard
                    widget={w}
                    trackers={trackersQuery.data ?? []}
                    allActive={active}
                    map={map}
                    today={today!}
                    editing={editing}
                    handle={handle}
                    dragging={dragging}
                    onEdit={() => setSheet({ widget: w })}
                  />
                )}
              </SortableItem>
            ))}
          </div>
        </SortableList>
      )}

      <WidgetEditor
        open={sheet !== null}
        widget={sheet?.widget ?? null}
        trackers={active}
        nextPosition={widgets.length}
        onClose={() => setSheet(null)}
      />
    </>
  );
}

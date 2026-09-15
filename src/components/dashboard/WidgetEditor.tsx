"use client";

import { AudioWaveform, Check, Flame, Grid3x3, Percent } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSaveWidget } from "@/lib/queries";
import { PIGMENTS, type Tracker, type Widget, type WidgetDraft, type WidgetKind } from "@/lib/types";
import { Sheet } from "../ui/Sheet";
import { Button, Field, Segmented } from "../ui/controls";
import { SIZES_FOR } from "./WidgetCard";

const KIND_ICONS: Record<WidgetKind, typeof Flame> = { streak: Flame, completion: Percent, daily_chart: AudioWaveform, heatmap: Grid3x3 };
const PERIODS: Record<WidgetKind, Widget["period"][]> = {
  streak: [30],
  completion: [7, 30, 90, 365],
  daily_chart: [7, 30, 90],
  heatmap: [90, 365],
};
const DEFAULT_SIZE: Record<WidgetKind, Widget["size"]> = { streak: "S", completion: "M", daily_chart: "L", heatmap: "L" };

interface Props {
  open: boolean;
  widget: Widget | null;
  trackers: Tracker[];
  nextPosition: number;
  onClose: () => void;
}

export function WidgetEditor({ open, widget, trackers, nextPosition, onClose }: Props) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={widget ? t.dashboard.editWidget : t.dashboard.addWidget}>
      <Form key={widget?.id ?? "new"} widget={widget} trackers={trackers} nextPosition={nextPosition} onClose={onClose} />
    </Sheet>
  );
}

function Form({ widget, trackers, nextPosition, onClose }: Omit<Props, "open">) {
  const { t } = useI18n();
  const save = useSaveWidget();
  const [draft, setDraft] = useState<WidgetDraft>(
    () => widget ?? { kind: "completion", tracker_ids: [], period: 30, size: "M", position: nextPosition },
  );

  const single = draft.kind === "streak" || draft.kind === "daily_chart";
  const eligible = draft.kind === "daily_chart" ? trackers.filter((tr) => tr.type !== "check") : trackers;

  const setKind = (kind: WidgetKind) => {
    const singleNext = kind === "streak" || kind === "daily_chart";
    const pool = kind === "daily_chart" ? trackers.filter((tr) => tr.type !== "check") : trackers;
    const keep = draft.tracker_ids.filter((id) => pool.some((tr) => tr.id === id));
    setDraft({
      ...draft,
      kind,
      tracker_ids: singleNext ? [keep[0] ?? pool[0]?.id].filter(Boolean) : keep,
      period: PERIODS[kind].includes(draft.period) ? draft.period : PERIODS[kind][PERIODS[kind].length > 2 ? 1 : 0],
      size: DEFAULT_SIZE[kind],
    });
  };

  const toggleTracker = (id: string) => {
    if (single) return setDraft({ ...draft, tracker_ids: [id] });
    const ids = draft.tracker_ids.includes(id) ? draft.tracker_ids.filter((x) => x !== id) : [...draft.tracker_ids, id];
    setDraft({ ...draft, tracker_ids: ids });
  };

  const valid = !single || draft.tracker_ids.length === 1;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save.mutate(draft, { onSuccess: onClose });
      }}
    >
      <Field label={t.dashboard.kind}>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(KIND_ICONS) as WidgetKind[]).map((kind) => {
            const Icon = KIND_ICONS[kind];
            const active = draft.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => setKind(kind)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${active ? "border-cyan bg-cyan/10" : "border-rig"}`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Icon size={16} className={active ? "text-cyan" : "text-dim"} />
                  {t.dashboard.kinds[kind]}
                </span>
                <span className="text-xs leading-snug text-dim">{t.dashboard.kindHints[kind]}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={single ? t.dashboard.tracker : t.dashboard.trackers}>
        {draft.kind === "daily_chart" && eligible.length === 0 && <p className="text-sm text-dim">{t.dashboard.noNumeric}</p>}
        <div className="flex flex-col gap-1.5">
          {!single && (
            <Option active={draft.tracker_ids.length === 0} color="var(--color-cyan)" onClick={() => setDraft({ ...draft, tracker_ids: [] })}>
              {t.dashboard.allTrackers}
            </Option>
          )}
          {eligible.map((tr) => (
            <Option key={tr.id} active={draft.tracker_ids.includes(tr.id)} color={PIGMENTS[tr.color]} onClick={() => toggleTracker(tr.id)}>
              <span aria-hidden>{tr.emoji}</span> {tr.name}
            </Option>
          ))}
        </div>
      </Field>

      {PERIODS[draft.kind].length > 1 && (
        <Field label={t.dashboard.period}>
          <Segmented<Widget["period"]>
            value={draft.period}
            onChange={(period) => setDraft({ ...draft, period })}
            options={PERIODS[draft.kind].map((p) => ({ value: p, label: t.dashboard.periods[p] }))}
          />
        </Field>
      )}

      {SIZES_FOR(draft.kind).length > 1 && (
        <Field label={t.dashboard.size}>
          <Segmented<Widget["size"]>
            value={draft.size}
            onChange={(size) => setDraft({ ...draft, size })}
            options={SIZES_FOR(draft.kind).map((s) => ({ value: s, label: t.dashboard.sizes[s] }))}
          />
        </Field>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-4 mt-4 border-t border-rig bg-panel px-5 pt-3 pb-[calc(0.75rem+var(--safe-bottom))]">
        <Button type="submit" variant="primary" accent="var(--color-cyan)" className="w-full" disabled={!valid || save.isPending}>
          {widget ? t.common.save : t.common.add}
        </Button>
      </div>
    </form>
  );
}

function Option({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 text-left transition-colors"
      style={{ borderColor: active ? color : "var(--color-rig)", background: active ? `color-mix(in oklab, ${color} 10%, transparent)` : undefined }}
    >
      <span className="truncate">{children}</span>
      <Check size={16} strokeWidth={3} style={{ color, opacity: active ? 1 : 0 }} aria-hidden />
    </button>
  );
}

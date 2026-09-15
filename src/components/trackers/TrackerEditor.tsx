"use client";

import { Archive, ArchiveRestore, Check, Clock, Hash, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { formatMinutes, parseTime } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/provider";
import { useDeleteTracker, useSaveTracker } from "@/lib/queries";
import { PIGMENTS, type GoalOp, type Pigment, type Tracker, type TrackerDraft, type TrackerType } from "@/lib/types";
import { Sheet } from "../ui/Sheet";
import { Button, Field, Segmented, inputClass } from "../ui/controls";

const EMOJIS = ["⚡", "🔥", "💧", "⏰", "🏃", "🧘", "💪", "📚", "🥗", "🌙", "☀️", "🚶", "🧠", "✍️", "🎧", "🚭", "🍎", "🦷", "💊", "🧹", "🎹", "🇬🇧", "💤", "🚴"];

const TYPE_ICONS: Record<TrackerType, typeof Check> = { check: Check, counter: Plus, number: Hash, time: Clock };

function blank(position: number): TrackerDraft {
  return { name: "", emoji: "⚡", color: "cyan", type: "check", goal: null, goal_op: "gte", unit: null, step: 1, days: [], position };
}

interface Props {
  open: boolean;
  tracker: Tracker | null;
  nextPosition: number;
  onClose: () => void;
}

export function TrackerEditor({ open, tracker, nextPosition, onClose }: Props) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={tracker ? t.trackers.editTitle : t.trackers.new}>
      {/* Remount the form per tracker so the draft starts fresh. */}
      <EditorForm key={tracker?.id ?? "new"} tracker={tracker} nextPosition={nextPosition} onClose={onClose} />
    </Sheet>
  );
}

function EditorForm({ tracker, nextPosition, onClose }: Omit<Props, "open">) {
  const { t } = useI18n();
  const save = useSaveTracker();
  const remove = useDeleteTracker();
  const [draft, setDraft] = useState<TrackerDraft>(() => (tracker ? { ...tracker } : blank(nextPosition)));
  const [showError, setShowError] = useState(false);
  const set = (patch: Partial<TrackerDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const color = PIGMENTS[draft.color];

  const setType = (type: TrackerType) =>
    set({
      type,
      goal: type === "time" ? 420 : type === "counter" ? 8 : null,
      goal_op: type === "time" ? "lte" : "gte",
      unit: null,
      step: type === "number" ? 0.5 : 1,
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return setShowError(true);
    save.mutate(
      { ...draft, name, unit: draft.unit?.trim() || null, step: draft.step > 0 ? draft.step : 1 },
      { onSuccess: onClose },
    );
  };

  const toggleArchive = () => {
    if (!tracker) return;
    save.mutate({ ...tracker, archived_at: tracker.archived_at ? null : new Date().toISOString() }, { onSuccess: onClose });
  };

  const destroy = () => {
    if (!tracker || !window.confirm(t.trackers.confirmDelete)) return;
    remove.mutate(tracker.id, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit} className="flex flex-col">
      <Field label={t.trackers.name}>
        <input
          className={inputClass}
          value={draft.name}
          maxLength={60}
          placeholder={t.trackers.namePlaceholder}
          aria-invalid={showError && !draft.name.trim()}
          onChange={(e) => set({ name: e.target.value })}
        />
        {showError && !draft.name.trim() && <span className="text-sm text-red">{t.trackers.nameRequired}</span>}
      </Field>

      <Field label={t.trackers.emoji}>
        <div className="-mx-1 flex flex-wrap gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => set({ emoji: e })}
              aria-pressed={draft.emoji === e}
              className="grid size-11 place-items-center rounded-xl text-xl transition-colors"
              style={{ background: draft.emoji === e ? `color-mix(in oklab, ${color} 25%, transparent)` : undefined }}
            >
              {e}
            </button>
          ))}
          <input
            aria-label={t.trackers.emoji}
            className="size-11 rounded-xl border border-rig bg-stage text-center text-xl outline-none focus:border-cyan/70"
            value={EMOJIS.includes(draft.emoji) ? "" : draft.emoji}
            placeholder="＋"
            onChange={(e) => {
              const glyph = [...new Intl.Segmenter().segment(e.target.value)].at(-1)?.segment;
              if (glyph) set({ emoji: glyph });
            }}
          />
        </div>
      </Field>

      <Field label={t.trackers.color}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PIGMENTS) as Pigment[]).map((p) => (
            <button
              key={p}
              type="button"
              aria-label={p}
              aria-pressed={draft.color === p}
              onClick={() => set({ color: p })}
              className="grid size-9 place-items-center rounded-full transition-transform active:scale-90"
              style={{
                background: PIGMENTS[p],
                boxShadow: draft.color === p ? `0 0 0 3px var(--color-panel), 0 0 0 5px ${PIGMENTS[p]}, 0 0 18px ${PIGMENTS[p]}` : undefined,
              }}
            />
          ))}
        </div>
      </Field>

      <Field label={t.trackers.type}>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TYPE_ICONS) as TrackerType[]).map((type) => {
            const Icon = TYPE_ICONS[type];
            const active = draft.type === type;
            return (
              <button
                key={type}
                type="button"
                disabled={Boolean(tracker) && !active}
                aria-pressed={active}
                onClick={() => setType(type)}
                className="flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors disabled:opacity-30"
                style={{ borderColor: active ? color : "var(--color-rig)", background: active ? `color-mix(in oklab, ${color} 10%, transparent)` : undefined }}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Icon size={16} style={{ color: active ? color : undefined }} />
                  {t.trackers.types[type]}
                </span>
                <span className="text-xs leading-snug text-dim">{t.trackers.typeHints[type]}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <GoalFields draft={draft} set={set} color={color} />

      <Field label={t.trackers.days}>
        <DaysPicker days={draft.days} color={color} onChange={(days) => set({ days })} />
      </Field>

      <div className="sticky bottom-0 -mx-5 -mb-4 mt-4 flex flex-wrap gap-2 border-t border-rig bg-panel px-5 pt-3 pb-[calc(0.75rem+var(--safe-bottom))]">
        <Button type="submit" variant="primary" accent={color} className="flex-1" disabled={save.isPending}>
          {t.common.save}
        </Button>
        {tracker && (
          <>
            <Button type="button" onClick={toggleArchive} aria-label={tracker.archived_at ? t.trackers.restore : t.trackers.archive}>
              {tracker.archived_at ? <ArchiveRestore size={18} /> : <Archive size={18} />}
              <span className="hidden sm:inline">{tracker.archived_at ? t.trackers.restore : t.trackers.archive}</span>
            </Button>
            <Button type="button" variant="danger" onClick={destroy} aria-label={t.common.delete}>
              <Trash size={18} />
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function GoalFields({ draft, set, color }: { draft: TrackerDraft; set: (p: Partial<TrackerDraft>) => void; color: string }) {
  const { t } = useI18n();
  if (draft.type === "check") return null;

  if (draft.type === "time") {
    return (
      <Field label={t.trackers.goal}>
        <Segmented<GoalOp>
          value={draft.goal_op}
          accent={color}
          onChange={(goal_op) => set({ goal_op })}
          options={[
            { value: "lte", label: t.trackers.notLater },
            { value: "gte", label: t.trackers.notEarlier },
          ]}
        />
        <input
          type="time"
          className={`${inputClass} font-display tabular text-xl`}
          value={draft.goal !== null ? formatMinutes(draft.goal) : ""}
          onChange={(e) => set({ goal: parseTime(e.target.value) })}
        />
      </Field>
    );
  }

  const hasGoal = draft.goal !== null;
  return (
    <>
      <Field label={t.trackers.goal}>
        <Segmented<"none" | GoalOp>
          value={hasGoal ? draft.goal_op : "none"}
          accent={color}
          onChange={(v) => (v === "none" ? set({ goal: null }) : set({ goal_op: v, goal: draft.goal ?? (draft.type === "counter" ? 8 : 1) }))}
          options={[
            { value: "none", label: t.trackers.noGoal },
            { value: "gte", label: t.trackers.atLeast },
            { value: "lte", label: t.trackers.atMost },
          ]}
        />
        {hasGoal && (
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            className={`${inputClass} font-display tabular text-xl`}
            value={draft.goal ?? ""}
            onChange={(e) => set({ goal: e.target.value === "" ? 0 : Number(e.target.value) })}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.trackers.unit}>
          <input className={inputClass} maxLength={20} placeholder={t.trackers.unitPlaceholder} value={draft.unit ?? ""} onChange={(e) => set({ unit: e.target.value })} />
        </Field>
        <Field label={t.trackers.step}>
          <input
            type="number"
            inputMode="decimal"
            min={0.01}
            step="any"
            className={`${inputClass} tabular`}
            value={draft.step}
            onChange={(e) => set({ step: Number(e.target.value) })}
          />
        </Field>
      </div>
    </>
  );
}

function DaysPicker({ days, color, onChange }: { days: number[]; color: string; onChange: (d: number[]) => void }) {
  const { t } = useI18n();
  const all = days.length === 0 || days.length === 7;
  const toggle = (d: number) => {
    const base = all ? [1, 2, 3, 4, 5, 6, 7] : days;
    const next = base.includes(d) ? base.filter((x) => x !== d) : [...base, d].sort((a, b) => a - b);
    onChange(next.length === 7 || next.length === 0 ? [] : next);
  };
  const quick: { label: string; value: number[] }[] = [
    { label: t.trackers.everyDay, value: [] },
    { label: t.trackers.weekdays, value: [1, 2, 3, 4, 5] },
    { label: t.trackers.weekends, value: [6, 7] },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1.5">
        {t.trackers.dayNames.map((name, i) => {
          const d = i + 1;
          const on = all || days.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(d)}
              className="h-11 rounded-xl border text-sm font-medium transition-colors"
              style={{ borderColor: on ? color : "var(--color-rig)", background: on ? `color-mix(in oklab, ${color} 18%, transparent)` : undefined, color: on ? "var(--color-ink)" : "var(--color-dim)" }}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onChange(q.value)}
            className="h-9 rounded-full border border-rig px-3 text-xs text-dim transition-colors hover:text-ink"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}

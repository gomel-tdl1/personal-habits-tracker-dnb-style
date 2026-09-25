"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { useSaveTracker } from "@/lib/queries";
import { sound } from "@/lib/sound/engine";
import { PIGMENTS, type TrackerDraft } from "@drop/core/types";

export function Presets() {
  const { t } = useI18n();
  const save = useSaveTracker();

  const presets: TrackerDraft[] = [
    { name: t.today.presets.wake, emoji: "⏰", color: "amber", type: "time", goal: 420, goal_op: "lte", unit: null, step: 1, days: [] },
    { name: t.today.presets.workout, emoji: "🔥", color: "magenta", type: "check", goal: null, goal_op: "gte", unit: null, step: 1, days: [] },
    { name: t.today.presets.water, emoji: "💧", color: "cyan", type: "counter", goal: 8, goal_op: "gte", unit: t.today.presets.waterUnit, step: 1, days: [] },
  ];

  return (
    <div className="mt-10 max-w-xl">
      <h2 className="font-display text-2xl font-bold">{t.today.emptyTitle}</h2>
      <p className="mt-2 text-dim">{t.today.emptyText}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {presets.map((p, i) => (
          <button
            key={p.name}
            onClick={() => {
              sound.check(i);
              save.mutate({ ...p, position: i });
            }}
            className="flex items-center gap-3 rounded-card border border-rig bg-panel p-4 text-left transition-colors hover:border-[var(--c)] sm:flex-col sm:items-start"
            style={{ "--c": PIGMENTS[p.color] } as React.CSSProperties}
          >
            <span className="text-2xl" aria-hidden>
              {p.emoji}
            </span>
            <span className="flex-1 font-medium">{p.name}</span>
            <Plus size={18} className="text-dim" aria-hidden />
          </button>
        ))}
      </div>
      <Link href="/trackers?new=1" className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl border border-rig px-5 hover:bg-panel-2">
        <Plus size={18} />
        {t.today.createOwn}
      </Link>
    </div>
  );
}

"use client";

import { motion } from "motion/react";
import { addDays } from "@/lib/dates";
import { completion } from "@/lib/habits";
import { useI18n } from "@/lib/i18n/provider";
import { PIGMENTS, type EntryMap, type Tracker } from "@/lib/types";

interface Props {
  trackers: Tracker[];
  map: EntryMap;
  today: string;
  period: number;
  compact: boolean;
}

export function CompletionWidget({ trackers, map, today, period, compact }: Props) {
  const { t } = useI18n();
  const from = addDays(today, -(period - 1));
  const total = completion(trackers, map, from, today, today);
  const rows = trackers.map((tr) => ({ tracker: tr, ...completion([tr], map, from, today, today) }));
  const pct = Math.round(total.rate * 100);
  const R = 42;
  const C = 2 * Math.PI * R;

  return (
    <div className={`flex h-full gap-5 ${compact ? "flex-col" : "flex-col sm:flex-row sm:items-center"}`}>
      <div className="relative mx-auto size-32 shrink-0 sm:mx-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-panel-2)" strokeWidth="7" />
          <motion.circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="var(--color-cyan)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - total.rate) }}
            transition={{ duration: 1, ease: [0.2, 0.9, 0.1, 1] }}
            style={{ filter: "drop-shadow(0 0 6px var(--color-cyan))" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <span className="display-tight tabular text-4xl font-black">{pct}</span>
            <span className="text-sm text-dim">%</span>
          </div>
        </div>
        <p className="sr-only">
          {pct}% · {t.dashboard.doneOf(total.done, total.scheduled)}
        </p>
      </div>

      {!compact && rows.length > 1 && (
        <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
          {rows.map(({ tracker, rate, done, scheduled }, i) => (
            <li key={tracker.id} className="min-w-0" title={t.dashboard.doneOf(done, scheduled)}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">
                  <span aria-hidden>{tracker.emoji} </span>
                  {tracker.name}
                </span>
                <span className="tabular text-dim">{Math.round(rate * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: PIGMENTS[tracker.color] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${rate * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: [0.2, 0.9, 0.1, 1] }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {(compact || rows.length <= 1) && <p className="text-sm text-dim">{t.dashboard.doneOf(total.done, total.scheduled)}</p>}
    </div>
  );
}

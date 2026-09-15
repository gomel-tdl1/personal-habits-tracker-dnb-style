"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { addDays, diffDays, fromKey, isoWeekday } from "@/lib/dates";
import { localeTag } from "@/lib/format";
import { dayScore } from "@/lib/habits";
import { useWidth } from "@/lib/hooks/useWidth";
import { useI18n } from "@/lib/i18n/provider";
import { PIGMENTS, type EntryMap, type Tracker } from "@/lib/types";
import { Tooltip, type TipState } from "./Tooltip";

const LABELS_W = 30;
const GAP = 3;
const LEVELS = [0.22, 0.45, 0.72, 1];

interface Props {
  trackers: Tracker[];
  map: EntryMap;
  today: string;
  period: number;
}

/** Step-sequencer grid: weeks as columns, Monday…Sunday as rows. */
export function Heatmap({ trackers, map, today, period }: Props) {
  const { t, locale } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [box, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TipState | null>(null);
  const color = trackers.length === 1 ? PIGMENTS[trackers[0].color] : "var(--color-cyan)";

  // Start on a Monday so every column is a full week.
  const first = addDays(today, -(period - 1));
  const start = addDays(first, -(isoWeekday(first) - 1));
  const weeks = Math.floor(diffDays(start, today) / 7) + 1;
  // Fill the card on wide screens; scroll horizontally on narrow ones.
  const CELL = Math.max(12, Math.min(30, Math.floor((width - LABELS_W) / weeks) - GAP));
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [period, CELL]);

  const monthFmt = new Intl.DateTimeFormat(localeTag(locale), { month: "short" });
  const dayFmt = new Intl.DateTimeFormat(localeTag(locale), { weekday: "short", day: "numeric", month: "short" });

  const showTip = (el: Element, day: string, done: number, scheduled: number) => {
    const frame = box.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!frame) return;
    setTip({
      x: Math.min(Math.max(r.left - frame.left + r.width / 2, 70), frame.width - 70),
      y: r.top - frame.top,
      value: scheduled ? `${done} / ${scheduled}` : "—",
      label: dayFmt.format(fromKey(day)),
      color: trackers.length === 1 ? color : undefined,
    });
  };

  return (
    <div ref={box} className="relative" onPointerLeave={(e) => e.pointerType !== "touch" && setTip(null)}>
      <div ref={scroller} className="overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="inline-flex gap-2">
          <div className="sticky left-0 z-[1] flex flex-col bg-panel" style={{ gap: GAP, paddingTop: 16 + GAP, width: LABELS_W - 8 }} aria-hidden>
            {t.trackers.dayNames.map((n, i) => (
              <span key={n} className="flex items-center text-[10px] text-faint" style={{ height: CELL, visibility: i % 2 ? "hidden" : "visible" }}>
                {n}
              </span>
            ))}
          </div>
          <div className="flex" style={{ gap: GAP }}>
            {cols.map((col, w) => {
              const month = fromKey(col[0]).getMonth();
              const newMonth = w === 0 || fromKey(cols[w - 1][0]).getMonth() !== month;
              return (
                <div key={col[0]} className="flex flex-col" style={{ gap: GAP }}>
                  <span className="h-4 whitespace-nowrap text-[10px] capitalize text-faint" aria-hidden>
                    {newMonth ? monthFmt.format(fromKey(col[0])) : ""}
                  </span>
                  {col.map((day) => {
                    if (day > today || day < first) return <span key={day} style={{ width: CELL, height: CELL }} />;
                    const { done, scheduled } = dayScore(trackers, map, day);
                    const ratio = scheduled ? done / scheduled : 0;
                    const level = ratio === 0 ? -1 : LEVELS.findIndex((l) => ratio <= l + 1e-9);
                    const label = `${dayFmt.format(fromKey(day))}: ${scheduled ? `${done} / ${scheduled}` : "—"}`;
                    return (
                      <motion.span
                        key={day}
                        role="img"
                        tabIndex={-1}
                        aria-label={label}
                        className="rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ink"
                        style={{
                          width: CELL,
                          height: CELL,
                          background: !scheduled ? "transparent" : level < 0 ? "var(--color-panel-2)" : color,
                          opacity: scheduled && level >= 0 ? LEVELS[level] : 1,
                          boxShadow: level === LEVELS.length - 1 ? `0 0 8px ${color}` : undefined,
                          border: scheduled ? undefined : "1px dashed var(--color-rig)",
                        }}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: scheduled && level >= 0 ? LEVELS[level] : 1 }}
                        transition={{ duration: 0.3, delay: Math.min(w * 0.012, 0.6) }}
                        whileHover={{ scale: 1.3 }}
                        onPointerEnter={(e) => showTip(e.currentTarget, day, done, scheduled)}
                        onPointerDown={(e) => showTip(e.currentTarget, day, done, scheduled)}
                        onFocus={(e) => showTip(e.currentTarget, day, done, scheduled)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-faint" aria-hidden>
        {t.dashboard.less}
        <span className="rounded-[3px] bg-panel-2" style={{ width: 11, height: 11 }} />
        {LEVELS.map((l) => (
          <span key={l} className="rounded-[3px]" style={{ width: 11, height: 11, background: color, opacity: l }} />
        ))}
        {t.dashboard.more}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

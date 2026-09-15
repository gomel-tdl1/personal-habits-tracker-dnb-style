"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { addDays, fromKey } from "@/lib/dates";
import { localeTag } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { BEAT } from "@/lib/sound/tempo";
import { fx } from "../fx/bus";

interface Props {
  date: string;
  today: string;
  minDate: string;
  onChange: (date: string) => void;
}

export function DayHeader({ date, today, minDate, onChange }: Props) {
  const { t, locale } = useI18n();
  const d = fromKey(date);
  const title =
    date === today
      ? t.today.today
      : date === addDays(today, -1)
        ? t.today.yesterday
        : new Intl.DateTimeFormat(localeTag(locale), { day: "numeric", month: "long" }).format(d);
  const sub = new Intl.DateTimeFormat(localeTag(locale), { weekday: "long", day: "numeric", month: "long" }).format(d);

  const nav = "grid size-11 place-items-center rounded-xl border border-rig text-dim transition-colors hover:text-ink disabled:opacity-30";

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-end gap-3">
          <motion.h1
            key={date}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-tight truncate text-[clamp(2.75rem,11vw,4.5rem)] font-extrabold uppercase"
          >
            {title}
          </motion.h1>
          <Equalizer />
        </div>
        <p className="mt-2 flex items-center gap-3 text-sm text-dim first-letter:uppercase">
          {sub}
          {date !== today && (
            <button onClick={() => onChange(today)} className="normal-case text-cyan underline-offset-4 hover:underline">
              {t.today.backToToday}
            </button>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button className={nav} aria-label={t.today.prev} disabled={date <= minDate} onClick={() => onChange(addDays(date, -1))}>
          <ChevronLeft size={20} />
        </button>
        <button className={nav} aria-label={t.today.next} disabled={date >= today} onClick={() => onChange(addDays(date, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

const BARS = 7;

/** Small spectrum display that jumps on every commit, tinted with the tracker's color. */
function Equalizer() {
  const reduced = useReducedMotion();
  const [hit, setHit] = useState<{ id: number; color: string; heights: number[] } | null>(null);

  useEffect(
    () =>
      fx.on((e) => {
        if (e.type !== "hit") return;
        setHit({
          id: Date.now(),
          color: e.color,
          heights: Array.from({ length: BARS }, (_, i) => 0.35 + Math.abs(Math.sin(Date.now() / 97 + i * 1.7)) * 0.65 * e.strength),
        });
      }),
    [],
  );

  return (
    <div className="mb-2 hidden h-8 items-end gap-[3px] sm:flex" aria-hidden>
      {Array.from({ length: BARS }, (_, i) => (
        <motion.span
          key={`${hit?.id ?? 0}-${i}`}
          className="w-1.5 rounded-sm"
          style={{ background: hit?.color ?? "var(--color-rig)", height: "100%", transformOrigin: "bottom" }}
          initial={{ scaleY: 0.15 }}
          animate={hit && !reduced ? { scaleY: [0.15, hit.heights[i], 0.15] } : { scaleY: 0.15 }}
          transition={{ duration: BEAT * 2, ease: [0.2, 0.9, 0.3, 1], delay: i * 0.015 }}
        />
      ))}
    </div>
  );
}

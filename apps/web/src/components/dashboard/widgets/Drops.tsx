"use client";

import { Flame, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { addDays, fromKey, isoWeekday, rangeKeys } from "@drop/core/dates";
import { localeTag } from "@drop/core/format";
import { dayScore, dropStats } from "@drop/core/habits";
import { useWidth } from "@/lib/hooks/useWidth";
import { useI18n } from "@/lib/i18n/provider";
import type { EntryMap, Tracker, WidgetSize } from "@drop/core/types";
import { Tooltip, type TipState } from "./Tooltip";

/** The drop gradient: the colors of the day-complete light show. */
const GRADIENT = "linear-gradient(100deg, var(--color-cyan), var(--color-uv) 55%, var(--color-magenta))";
/** Narrowest bar before days are grouped. */
const MIN_BAR = 4;

interface Props {
  trackers: Tracker[];
  map: EntryMap;
  today: string;
  period: number;
  size: WidgetSize;
}

interface Day {
  date: string;
  done: number;
  scheduled: number;
  drop: boolean;
}

interface Bucket {
  from: string;
  to: string;
  /** 0…1: bar height. */
  level: number;
  /** Every scheduled day in the bucket was a drop. */
  full: boolean;
  /** Share of drop days, 0 when nothing was scheduled. */
  drops: number;
  eligible: number;
  single?: Day;
}

/** Days where every scheduled tracker was done, drawn as the peaks of a waveform. */
export function DropsWidget({ trackers, map, today, period, size }: Props) {
  const { t } = useI18n();
  const from = addDays(today, -(period - 1));
  const stats = dropStats(trackers, map, from, today);
  const days: Day[] = rangeKeys(from, today).map((date) => {
    const { done, scheduled } = dayScore(trackers, map, date);
    return { date, done, scheduled, drop: scheduled > 0 && done === scheduled };
  });
  const pct = Math.round(stats.rate * 100);
  const compact = size === "S";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className={`flex gap-4 ${compact ? "flex-col" : "flex-wrap items-end justify-between"}`}>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <motion.span
              key={stats.drops}
              initial={{ scale: 1.25, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="display-tight tabular text-7xl font-black"
              style={
                stats.drops > 0
                  ? {
                      backgroundImage: GRADIENT,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      filter: "drop-shadow(0 0 18px rgb(139 92 255 / 0.5))",
                    }
                  : undefined
              }
            >
              {stats.drops}
            </motion.span>
            <span className="font-display text-sm font-semibold uppercase tracking-wider text-dim">{t.dashboard.drops(stats.drops)}</span>
          </div>
          <p className="mt-1 text-sm text-dim">{t.dashboard.dropsOf(stats.drops, stats.days)}</p>
        </div>

        <dl className={`flex gap-2 ${compact ? "flex-wrap" : ""}`}>
          <Stat icon={<Flame size={14} className="text-magenta" />} label={t.dashboard.dropStreak} value={stats.current} glow={stats.current >= 2 ? "var(--color-magenta)" : undefined} />
          <Stat icon={<Trophy size={14} className="text-amber" />} label={t.dashboard.dropBest} value={stats.best} />
          {!compact && <Stat label={t.dashboard.dropRate} value={`${pct}%`} />}
        </dl>
      </div>

      <Waveform days={days} today={today} height={compact ? 56 : size === "L" ? 112 : 88} />

      {size === "L" && <Weekdays days={days} today={today} />}

      <p className="sr-only">
        {stats.drops} {t.dashboard.drops(stats.drops)}, {t.dashboard.dropsOf(stats.drops, stats.days)}. {t.dashboard.dropStreak}: {stats.current}.{" "}
        {t.dashboard.dropBest}: {stats.best}.
      </p>
    </div>
  );
}

function Stat({ icon, label, value, glow }: { icon?: React.ReactNode; label: string; value: React.ReactNode; glow?: string }) {
  return (
    <div
      className="min-w-[4.5rem] rounded-xl border border-rig bg-stage/60 px-3 py-2"
      style={glow ? { borderColor: `color-mix(in oklab, ${glow} 45%, transparent)`, boxShadow: `0 0 18px color-mix(in oklab, ${glow} 22%, transparent)` } : undefined}
    >
      <dt className="flex items-center gap-1 text-[11px] text-dim">
        {icon}
        {label}
      </dt>
      <dd className="font-display tabular text-2xl font-bold leading-tight">{value}</dd>
    </div>
  );
}

/** Mirrored waveform, one bar per day (or per group of days on narrow cards). Drops hit full height. */
function Waveform({ days, today, height }: { days: Day[]; today: string; height: number }) {
  const { t, locale } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const per = width ? Math.max(1, Math.ceil(days.length / Math.floor(width / MIN_BAR))) : 1;
  const buckets: Bucket[] = [];
  // Group from the newest day back, so today always ends the last bar.
  for (let end = days.length; end > 0; end -= per) {
    const group = days.slice(Math.max(0, end - per), end);
    const counted = group.filter((d) => d.scheduled > 0 && !(d.date === today && !d.drop));
    const drops = counted.filter((d) => d.drop).length;
    const single = per === 1 ? group[0] : undefined;
    buckets.unshift({
      from: group[0].date,
      to: group[group.length - 1].date,
      level: single ? (single.drop ? 1 : single.scheduled ? (single.done / single.scheduled) * 0.55 : 0) : counted.length ? drops / counted.length : 0,
      full: counted.length > 0 && drops === counted.length,
      drops,
      eligible: counted.length,
      single,
    });
  }

  const step = width / Math.max(1, buckets.length);
  const barW = Math.max(1.5, Math.min(step * 0.64, 14));
  const mid = height / 2;
  const half = height / 2 - 2;
  const dateFmt = new Intl.DateTimeFormat(localeTag(locale), { day: "numeric", month: "short" });
  const id = `drop-grad-${days[0]?.date}-${height}`;

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.floor((clientX - rect.left) / step);
    setActive(i >= 0 && i < buckets.length ? i : null);
  };

  const b = active !== null ? buckets[active] : null;
  const tip: TipState | null =
    b && width
      ? {
          x: Math.min(Math.max(step * active! + step / 2, 60), width - 60),
          y: mid - Math.max(b.level, 0.08) * half,
          value: b.single
            ? b.single.drop
              ? t.dashboard.dropDay
              : b.single.scheduled
                ? `${b.single.done} / ${b.single.scheduled}`
                : "—"
            : `${b.drops} ${t.dashboard.drops(b.drops)}`,
          label: b.from === b.to ? dateFmt.format(fromKey(b.from)) : `${dateFmt.format(fromKey(b.from))} – ${dateFmt.format(fromKey(b.to))}`,
          color: b.full || b.single?.drop ? "var(--color-uv)" : undefined,
        }
      : null;

  return (
    <div ref={ref} className="relative mt-auto">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-hidden
          className="block touch-pan-y"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={(e) => e.pointerType !== "touch" && setActive(null)}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--color-cyan)" />
              <stop offset="0.5" stopColor="var(--color-uv)" />
              <stop offset="1" stopColor="var(--color-magenta)" />
            </linearGradient>
          </defs>

          <line x1={0} x2={width} y1={mid} y2={mid} stroke="var(--color-rig)" strokeWidth={1} />

          <motion.g
            key={`${days.length}:${per}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.7, ease: [0.2, 0.9, 0.1, 1] }}
            style={{ originY: 0.5 }}
          >
            {buckets.map((bk, i) => {
              const cx = step * i + step / 2;
              const dim = active !== null && active !== i;
              if (bk.eligible === 0 && !bk.single?.drop) {
                const empty = !bk.single || bk.single.scheduled === 0;
                return empty ? (
                  <circle key={bk.from} cx={cx} cy={mid} r={1.2} fill="var(--color-faint)" />
                ) : (
                  // An unfinished today: a hollow marker.
                  <rect
                    key={bk.from}
                    x={cx - barW / 2}
                    y={mid - Math.max(bk.level * half, 3)}
                    width={barW}
                    height={Math.max(bk.level * half, 3) * 2}
                    rx={Math.min(barW / 2, 3)}
                    fill="none"
                    stroke="var(--color-dim)"
                    strokeDasharray="2 2"
                  />
                );
              }
              const h = Math.max(bk.level * half, 1.5);
              const lit = bk.single ? bk.single.drop : bk.drops > 0;
              return (
                <rect
                  key={bk.from}
                  x={cx - barW / 2}
                  y={mid - h}
                  width={barW}
                  height={h * 2}
                  rx={Math.min(barW / 2, 3)}
                  fill={lit ? `url(#${id})` : "var(--color-dim)"}
                  fillOpacity={(lit ? (bk.single ? 1 : 0.45 + bk.level * 0.55) : 0.3) * (dim ? 0.45 : 1)}
                  style={bk.full || bk.single?.drop ? { filter: "drop-shadow(0 0 5px rgb(139 92 255 / 0.8))" } : undefined}
                />
              );
            })}
          </motion.g>

          {b && <line x1={step * active! + step / 2} x2={step * active! + step / 2} y1={0} y2={height} stroke="var(--color-ink)" strokeOpacity={0.25} />}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

/** Share of drop days per weekday; the strongest day glows. */
function Weekdays({ days, today }: { days: Day[]; today: string }) {
  const { t } = useI18n();
  const rows = Array.from({ length: 7 }, (_, i) => {
    const counted = days.filter((d) => isoWeekday(d.date) === i + 1 && d.scheduled > 0 && !(d.date === today && !d.drop));
    const drops = counted.filter((d) => d.drop).length;
    return { name: t.trackers.dayNames[i], drops, total: counted.length, rate: counted.length ? drops / counted.length : 0 };
  });
  const top = Math.max(...rows.map((r) => r.rate));

  return (
    <div>
      <p className="mb-2 text-xs text-dim">{t.dashboard.byWeekday}</p>
      <div className="grid grid-cols-7 gap-2">
        {rows.map((r, i) => {
          const best = top > 0 && r.rate === top;
          return (
            <div key={r.name} className="flex flex-col items-center gap-1.5" title={t.dashboard.dropsOf(r.drops, r.total)}>
              <div className="relative h-14 w-full overflow-hidden rounded-lg bg-panel-2">
                <motion.div
                  className="absolute inset-x-0 bottom-0 rounded-lg"
                  style={{
                    background: best ? "linear-gradient(to top, var(--color-magenta), var(--color-uv), var(--color-cyan))" : "var(--color-uv)",
                    opacity: best ? 1 : 0.35 + r.rate * 0.4,
                    boxShadow: best ? "0 0 16px rgb(139 92 255 / 0.6)" : undefined,
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${r.rate * 100}%` }}
                  transition={{ duration: 0.7, delay: 0.15 + i * 0.04, ease: [0.2, 0.9, 0.1, 1] }}
                />
              </div>
              <span className={`text-[11px] ${best ? "font-semibold text-ink" : "text-faint"}`}>{r.name}</span>
              <span className="-mt-1 text-[10px] tabular text-dim">{r.total ? `${Math.round(r.rate * 100)}%` : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

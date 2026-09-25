"use client";

import { motion } from "motion/react";
import { addDays, rangeKeys } from "@drop/core/dates";
import { formatNumber } from "@drop/core/format";
import { valueOf } from "@drop/core/habits";
import { useI18n } from "@/lib/i18n/provider";
import { entryKey, PIGMENTS, type EntryMap, type SetsMap, type Tracker, type WidgetSize } from "@drop/core/types";
import { DailyChart } from "./DailyChart";

interface Props {
  tracker: Tracker;
  map: EntryMap;
  sets: SetsMap;
  today: string;
  period: number;
  size: WidgetSize;
}

/** Volume over the period, records, and a chart with one slice per set. */
export function SetsWidget({ tracker, map, sets, today, period, size }: Props) {
  const { t, locale } = useI18n();
  const color = PIGMENTS[tracker.color];
  if (tracker.type !== "sets") return <p className="text-sm text-dim">{t.dashboard.noSets}</p>;

  const days = rangeKeys(addDays(today, -(period - 1)), today);
  const totals = days.flatMap((d) => {
    const v = valueOf(map, tracker, d);
    return v ? [v] : [];
  });
  // Days logged before sets were stored count as one set.
  const allSets = days.flatMap((d) => sets.get(entryKey(tracker.id, d)) ?? (valueOf(map, tracker, d) ? [valueOf(map, tracker, d)!] : []));

  const total = totals.reduce((a, b) => a + b, 0);
  const perDay = totals.length ? total / totals.length : 0;
  const bestDay = totals.length ? Math.max(...totals) : 0;
  const bestSet = allSets.length ? Math.max(...allSets) : 0;
  const avgSet = allSets.length ? total / allSets.length : 0;
  const fmt = (n: number) => formatNumber(Math.round(n * 10) / 10, locale);
  const unit = tracker.unit ? ` ${tracker.unit}` : "";

  const tiles = [
    { label: t.dashboard.setsPerDay, value: fmt(perDay) },
    { label: t.dashboard.bestDay, value: fmt(bestDay) },
    { label: t.dashboard.bestSet, value: fmt(bestSet) },
    { label: t.dashboard.avgSet, value: fmt(avgSet) },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className={`flex flex-col gap-4 ${size === "L" ? "md:flex-row md:items-end md:justify-between" : ""}`}>
        <div>
          <div className="flex items-baseline gap-2">
            <motion.span
              key={total}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="display-tight tabular text-6xl font-black"
              style={{ textShadow: total > 0 ? `0 0 28px color-mix(in oklab, ${color} 55%, transparent)` : undefined }}
            >
              {fmt(total)}
            </motion.span>
            <span className="text-sm text-dim">
              {t.dashboard.setsTotal}
              {unit}
            </span>
          </div>
          <p className="mt-1 text-sm text-dim">{t.dashboard.setsCount(allSets.length)}</p>
        </div>

        <dl className={`grid gap-2 ${size === "L" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.label}
              className="rounded-xl border border-rig bg-stage/60 px-3 py-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <dt className="text-[11px] text-dim">{tile.label}</dt>
              <dd className="font-display tabular text-2xl font-bold leading-tight" style={i === 2 && bestSet > 0 ? { color } : undefined}>
                {tile.value}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>

      <DailyChart tracker={tracker} map={map} sets={sets} today={today} period={period} summary={false} />
    </div>
  );
}

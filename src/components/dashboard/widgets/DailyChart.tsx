"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { addDays, fromKey, rangeKeys } from "@/lib/dates";
import { formatValue, localeTag } from "@/lib/format";
import { isDone, isScheduled, onDayAxis, valueOf } from "@/lib/habits";
import { useWidth } from "@/lib/hooks/useWidth";
import { useI18n } from "@/lib/i18n/provider";
import { entryKey, PIGMENTS, type EntryMap, type SetsMap, type Tracker } from "@/lib/types";
import { Tooltip, type TipState } from "./Tooltip";

const H = 160;
const PAD = { top: 12, right: 8, bottom: 22, left: 36 };

interface Props {
  tracker: Tracker;
  map: EntryMap;
  today: string;
  period: number;
  /** Given for a sets tracker: bars are stacked one segment per set. */
  sets?: SetsMap;
  /** Hide the average above the chart when the widget shows its own numbers. */
  summary?: boolean;
}

export function DailyChart({ tracker, map, today, period, sets, summary = true }: Props) {
  const { t, locale } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const color = PIGMENTS[tracker.color];

  const days = rangeKeys(addDays(today, -(period - 1)), today);
  const raw = days.map((date) => valueOf(map, tracker, date));
  // Clock times are plotted on the habit day (04:00–04:00), so 01:00 sits above 23:00.
  const axis = (v: number) => (tracker.type === "time" ? onDayAxis(v) : v);
  const goal = tracker.goal !== null ? axis(tracker.goal) : null;
  const points = days.map((date, i) => ({
    date,
    value: raw[i] !== undefined ? axis(raw[i]) : undefined,
    scheduled: isScheduled(tracker, date),
  }));
  const values = points.flatMap((p) => (p.value === undefined ? [] : [p.value]));

  if (tracker.type === "check") return <p className="text-sm text-dim">{t.dashboard.noNumeric}</p>;

  const fmt = (v: number) => formatValue(tracker, v, locale);
  const bars = tracker.type === "counter" || tracker.type === "sets";
  const candidates = [...values, ...(goal !== null ? [goal] : [])];
  let lo = bars ? 0 : Math.min(...candidates);
  let hi = Math.max(...candidates, bars ? 1 : -Infinity);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) [lo, hi] = [0, 1];
  if (!bars) {
    const pad = Math.max((hi - lo) * 0.15, tracker.type === "time" ? 15 : 0.5);
    lo -= pad;
    hi += pad;
  }
  if (hi === lo) hi = lo + 1;

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / days.length;
  const x = (i: number) => PAD.left + step * i + step / 2;
  const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  const ticks = [lo, (lo + hi) / 2, hi];
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const dateFmt = new Intl.DateTimeFormat(localeTag(locale), { day: "numeric", month: "short" });
  const labelIdx = [0, Math.floor((days.length - 1) / 2), days.length - 1];

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.floor((clientX - rect.left - PAD.left) / step);
    setActive(i >= 0 && i < days.length ? i : null);
  };

  const activePoint = active !== null ? points[active] : null;
  const tip: TipState | null =
    activePoint && width
      ? {
          x: Math.min(Math.max(x(active!), 60), width - 60),
          y: activePoint.value !== undefined ? y(activePoint.value) : PAD.top + innerH,
          value: activePoint.value !== undefined ? `${fmt(activePoint.value)}${tracker.unit && tracker.type !== "time" ? ` ${tracker.unit}` : ""}` : "—",
          label: dateFmt.format(fromKey(activePoint.date)),
          color,
        }
      : null;

  const line = points
    .map((p, i) => (p.value === undefined ? null : `${x(i)},${y(p.value)}`))
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex h-full flex-col">
      <div className={`mb-2 flex items-baseline gap-2 ${summary ? "" : "hidden"}`}>
        <span className="display-tight tabular text-4xl font-bold">{avg !== null ? fmt(avg) : "—"}</span>
        <span className="text-sm text-dim">
          {t.dashboard.avg}
          {tracker.unit && tracker.type !== "time" ? `, ${tracker.unit}` : ""}
        </span>
      </div>

      <div ref={ref} className="relative mt-auto">
        {values.length === 0 && <p className="absolute inset-x-0 top-1/3 text-center text-sm text-dim">{t.dashboard.noData}</p>}
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label={`${tracker.name}: ${t.dashboard.avg} ${avg !== null ? fmt(avg) : "—"}`}
            tabIndex={0}
            className="block touch-pan-y outline-none"
            onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerLeave={(e) => e.pointerType !== "touch" && setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? days.length) - 1));
              if (e.key === "ArrowRight") setActive((a) => Math.min(days.length - 1, (a ?? -1) + 1));
            }}
          >
            {ticks.map((v, i) => (
              <g key={i}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-rig)" strokeWidth={1} strokeOpacity={0.6} />
                <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px] tabular">
                  {fmt(bars ? Math.round(v) : v)}
                </text>
              </g>
            ))}

            {goal !== null && (
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(goal)}
                y2={y(goal)}
                stroke="var(--color-ink)"
                strokeOpacity={0.55}
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            )}

            {bars && (
              <motion.g
                key={period}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, ease: [0.2, 0.9, 0.1, 1] }}
                style={{ originY: 1 }}
              >
                {points.map((p, i) => {
                  if (p.value === undefined || p.value <= 0) return null;
                  const w = Math.max(1, step - 2);
                  const top = y(p.value);
                  const base = PAD.top + innerH;
                  const r = Math.min(4, w / 2, base - top);
                  const x0 = x(i) - w / 2;
                  const d = `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + w - r} Q${x0 + w},${top} ${x0 + w},${top + r} V${base} Z`;
                  const done = isDone(tracker, p.value);
                  const opacity = active === null || active === i ? (done ? 1 : 0.45) : done ? 0.6 : 0.25;
                  const parts = sets?.get(entryKey(tracker.id, p.date));
                  if (parts && parts.length > 1) {
                    // Clip the stack to the rounded bar, then cut it into one slice per set.
                    let acc = 0;
                    return (
                      <g key={p.date}>
                        <clipPath id={`bar-${tracker.id}-${i}`}>
                          <path d={d} />
                        </clipPath>
                        <g clipPath={`url(#bar-${tracker.id}-${i})`}>
                          {parts.map((n, k) => {
                            const y0 = y(acc + n);
                            const y1 = y(acc);
                            acc += n;
                            return (
                              <rect
                                key={k}
                                x={x0}
                                y={y0}
                                width={w}
                                height={Math.max(0, y1 - y0 - (k < parts.length - 1 && y1 - y0 > 3 ? 1.5 : 0))}
                                fill={color}
                                fillOpacity={opacity * (k % 2 ? 0.7 : 1)}
                              />
                            );
                          })}
                        </g>
                      </g>
                    );
                  }
                  return <path key={p.date} d={d} fill={color} fillOpacity={opacity} />;
                })}
              </motion.g>
            )}

            {!bars && line && (
              <>
                <motion.polyline
                  points={line}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: [0.2, 0.9, 0.1, 1] }}
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
                {period <= 30 &&
                  points.map((p, i) =>
                    p.value === undefined ? null : (
                      <circle
                        key={p.date}
                        cx={x(i)}
                        cy={y(p.value)}
                        r={4}
                        fill={isDone(tracker, p.value) ? color : "var(--color-panel)"}
                        stroke={color}
                        strokeWidth={2}
                      />
                    ),
                  )}
              </>
            )}

            {activePoint && (
              <line x1={x(active!)} x2={x(active!)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={1} />
            )}

            {labelIdx.map((i, k) => (
              <text
                key={k}
                x={x(i)}
                y={H - 6}
                textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
                className="fill-faint text-[10px]"
                style={{ opacity: points[i].scheduled ? 1 : 0.7 }}
              >
                {dateFmt.format(fromKey(days[i]))}
              </text>
            ))}
          </svg>
        )}
        <Tooltip tip={tip} />
      </div>
    </div>
  );
}

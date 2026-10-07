"use client";

import { motion } from "motion/react";
import { useId, useState } from "react";
import { buildChartSeries } from "@/lib/chart";
import { addDays, fromKey, rangeKeys } from "@/lib/dates";
import { formatValue, localeTag } from "@/lib/format";
import { isDone } from "@/lib/habits";
import { useWidth } from "@/lib/hooks/useWidth";
import { useI18n } from "@/lib/i18n/provider";
import { entryKey, type EntryMap, type SetsMap, type Tracker } from "@/lib/types";
import { Tooltip, type TipState } from "./Tooltip";

const H = 160;
const PAD = { top: 12, right: 8, bottom: 22, left: 36 };

interface Props {
  trackers: Tracker[];
  map: EntryMap;
  today: string;
  period: number;
  /** Given for a sets tracker: bars are stacked one segment per set. */
  sets?: SetsMap;
  /** Hide the average above the chart when the widget shows its own numbers. */
  summary?: boolean;
}

export function DailyChart({ trackers, map, today, period, sets, summary = true }: Props) {
  const { t, locale } = useI18n();
  const chartId = useId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const days = rangeKeys(addDays(today, -(period - 1)), today);
  const series = buildChartSeries(trackers, map, days);
  const tracker = series[0]?.tracker;

  if (!tracker) return <p className="text-sm text-dim">{t.dashboard.noNumeric}</p>;

  const fmt = (v: number) => formatValue(tracker, v, locale);
  const display = (tr: Tracker, value: number | null | undefined) => value == null ? "—" :
    `${formatValue(tr, value, locale)}${tr.unit && tr.type !== "time" ? ` ${tr.unit}` : ""}`;
  const bars = tracker.type === "counter" || tracker.type === "sets";
  const multiple = series.length > 1;
  const values = series.flatMap((s) => s.points.flatMap((p) => p.value === undefined ? [] : [p.value]));
  const candidates = [...values, ...series.flatMap((s) => s.goal === null ? [] : [s.goal])];
  let lo = bars ? Math.min(0, ...candidates) : Math.min(...candidates);
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
  const dateFmt = new Intl.DateTimeFormat(localeTag(locale), { day: "numeric", month: "short" });
  const labelIdx = [0, Math.floor((days.length - 1) / 2), days.length - 1];

  const pick = (clientX: number, rect: DOMRect) => {
    const i = step > 0 ? Math.floor((clientX - rect.left - PAD.left) / step) : -1;
    setActive(i >= 0 && i < days.length ? i : null);
  };
  const activeIndex = active !== null && active < days.length ? active : null;
  const activeValues = activeIndex === null ? [] : series.flatMap((s) => {
    const value = s.points[activeIndex].value;
    return value === undefined ? [] : [value];
  });
  const tip: TipState | null = activeIndex !== null && width ? {
    x: Math.min(Math.max(x(activeIndex), Math.min(100, width / 2)), Math.max(width / 2, width - 100)),
    y: activeValues.length ? y(Math.max(...activeValues)) : PAD.top + innerH,
    value: display(tracker, series[0].points[activeIndex].value),
    label: dateFmt.format(fromKey(days[activeIndex])),
    color: series[0].color,
    rows: multiple ? series.map((s) => ({
      name: s.tracker.name, value: display(s.tracker, s.points[activeIndex].value), color: s.color,
    })) : undefined,
  } : null;

  return (
    <div className="flex h-full flex-col">
      {summary && (multiple ? (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
          {series.map((s) => (
            <li key={s.tracker.id} className="min-w-0 max-w-full">
              <div className="flex items-center gap-2 text-xs text-dim">
                <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="truncate" title={s.tracker.name}>{s.tracker.emoji} {s.tracker.name}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display tabular text-xl font-bold">{display(s.tracker, s.average)}</span>
                <span className="text-xs text-dim">{t.dashboard.avg}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-2 flex items-baseline gap-2">
          <span className="display-tight tabular text-4xl font-bold">{series[0].average !== null ? fmt(series[0].average) : "—"}</span>
          <span className="text-sm text-dim">{t.dashboard.avg}{tracker.unit && tracker.type !== "time" ? `, ${tracker.unit}` : ""}</span>
        </div>
      ))}

      <div ref={ref} className="relative mt-auto">
        {values.length === 0 && <p className="absolute inset-x-0 top-1/3 text-center text-sm text-dim">{t.dashboard.noData}</p>}
        {width > 0 && (
          <svg
            width={width} height={H} role="img"
            aria-label={series.map((s) => `${s.tracker.name}: ${t.dashboard.avg} ${display(s.tracker, s.average)}`).join("; ")}
            tabIndex={0} className="block touch-pan-y outline-none"
            onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerLeave={(e) => e.pointerType !== "touch" && setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? days.length) - 1));
                else setActive((a) => Math.min(days.length - 1, (a ?? -1) + 1));
              }
            }}
          >
            {ticks.map((v, i) => (
              <g key={i}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-rig)" strokeWidth={1} strokeOpacity={0.6} />
                <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px] tabular">{fmt(bars ? Math.round(v) : v)}</text>
              </g>
            ))}

            {series.map((s, seriesIndex) => {
              const line = s.points.map((p, i) => p.value === undefined ? null : `${x(i)},${y(p.value)}`).filter(Boolean).join(" ");
              return (
                <g key={s.tracker.id}>
                  {s.goal !== null && (
                    <line x1={PAD.left} x2={width - PAD.right} y1={y(s.goal)} y2={y(s.goal)}
                      stroke={multiple ? s.color : "var(--color-ink)"} strokeOpacity={0.55} strokeDasharray="4 4" strokeWidth={1.5} />
                  )}
                  {bars ? (
                    <motion.g key={period} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                      transition={{ duration: 0.6, ease: [0.2, 0.9, 0.1, 1] }} style={{ originY: 1 }}>
                      {s.points.map((p, i) => {
                        if (p.value === undefined || p.value === 0) return null;
                        const groupWidth = Math.max(0, step - 2);
                        const w = Math.max(0.5, groupWidth / series.length);
                        const top = Math.min(y(p.value), y(0));
                        const base = Math.max(y(p.value), y(0));
                        const done = isDone(s.tracker, p.value);
                        const opacity = activeIndex === null || activeIndex === i ? (done ? 1 : 0.45) : done ? 0.6 : 0.25;
                        const x0 = x(i) - groupWidth / 2 + seriesIndex * w;
                        const barWidth = Math.max(0.5, w - (multiple ? 1 : 0));
                        const parts = s.tracker.type === "sets" ? sets?.get(entryKey(s.tracker.id, p.date)) : undefined;
                        if (parts && parts.length > 1) {
                          const clipId = `${chartId}-bar-${s.tracker.id}-${i}`;
                          let acc = 0;
                          return (
                            <g key={p.date}>
                              <defs>
                                <clipPath id={clipId}>
                                  <rect x={x0} y={top} width={barWidth} height={base - top} rx={Math.min(4, w / 2, (base - top) / 2)} />
                                </clipPath>
                              </defs>
                              <g clipPath={`url(#${clipId})`}>
                                {parts.map((n, k) => {
                                  const y0 = y(acc + n);
                                  const y1 = y(acc);
                                  acc += n;
                                  return <rect key={k} x={x0} y={y0} width={barWidth}
                                    height={Math.max(0, y1 - y0 - (k < parts.length - 1 && y1 - y0 > 3 ? 1.5 : 0))}
                                    fill={s.color} fillOpacity={opacity * (k % 2 ? 0.7 : 1)} />;
                                })}
                              </g>
                            </g>
                          );
                        }
                        return <rect key={p.date} x={x0}
                          y={top} width={Math.max(0.5, w - (multiple ? 1 : 0))} height={base - top} rx={Math.min(4, w / 2, (base - top) / 2)}
                          fill={s.color} fillOpacity={opacity} />;
                      })}
                    </motion.g>
                  ) : line ? (
                    <>
                      <motion.polyline points={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.2, 0.9, 0.1, 1] }}
                        style={{ filter: `drop-shadow(0 0 4px ${s.color})` }} />
                      {period <= 30 && s.points.map((p, i) => p.value === undefined ? null : (
                        <circle key={p.date} cx={x(i)} cy={y(p.value)} r={4}
                          fill={isDone(s.tracker, p.value) ? s.color : "var(--color-panel)"} stroke={s.color} strokeWidth={2} />
                      ))}
                    </>
                  ) : null}
                </g>
              );
            })}

            {activeIndex !== null && <line x1={x(activeIndex)} x2={x(activeIndex)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={1} />}
            {labelIdx.map((i, k) => (
              <text key={k} x={x(i)} y={H - 6} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
                className="fill-faint text-[10px]" style={{ opacity: series.some((s) => s.points[i].scheduled) ? 1 : 0.7 }}>
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

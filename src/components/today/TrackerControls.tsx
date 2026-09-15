"use client";

import { Clock, Minus, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMinutes, parseTime } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { isDone, progress } from "@/lib/habits";
import { useI18n } from "@/lib/i18n/provider";
import type { Tracker } from "@/lib/types";
import { originOf, originOfElement, type Origin } from "../fx/bus";
import type { CommitGesture } from "./useCommit";

type Commit = (value: number | null, gesture: CommitGesture, origin: Origin) => void;

/* ---------- Check ---------- */

export function CheckPad({ done, color }: { done: boolean; color: string }) {
  return (
    <span
      className="relative grid size-14 shrink-0 place-items-center rounded-2xl border-2 transition-[background-color,border-color,box-shadow] duration-200"
      style={{
        borderColor: done ? color : "var(--color-rig)",
        background: done ? color : "var(--color-stage)",
        boxShadow: done ? `0 0 22px color-mix(in oklab, ${color} 60%, transparent)` : "none",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-7">
        <motion.path
          d="M5 12.5l4.2 4.2L19 7"
          fill="none"
          stroke="var(--color-stage)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      </svg>
      {!done && <span className="absolute size-2 rounded-full bg-rig" />}
    </span>
  );
}

/* ---------- Shared pieces ---------- */

function BigValue({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="display-tight tabular text-5xl font-bold">{children}</span>
      {sub && <span className="truncate text-sm text-dim">{sub}</span>}
    </div>
  );
}

function RoundButton({
  onClick,
  label,
  children,
  color,
  primary = false,
  disabled = false,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  children: React.ReactNode;
  color: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      className={`grid shrink-0 place-items-center rounded-2xl transition-[opacity,background-color] disabled:opacity-30 ${primary ? "size-14" : "size-12 border border-rig text-dim hover:text-ink"}`}
      style={primary ? { background: color, color: "var(--color-stage)", boxShadow: `0 0 18px color-mix(in oklab, ${color} 45%, transparent)` } : undefined}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Counter ---------- */

export function CounterControl({
  tracker,
  value,
  color,
  done,
  onCommit,
}: {
  tracker: Tracker;
  value: number | undefined;
  color: string;
  done: boolean;
  onCommit: Commit;
}) {
  const { t, locale } = useI18n();
  const current = value ?? 0;
  const goal = tracker.goal;
  const next = (delta: number) => {
    const v = Math.max(0, Math.round((current + delta) * 100) / 100);
    return v === 0 ? null : v;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <BigValue sub={goal !== null ? `/ ${formatNumber(goal, locale)} ${tracker.unit ?? ""}` : tracker.unit}>
          {formatNumber(current, locale)}
        </BigValue>
        <div className="flex items-center gap-2">
          <RoundButton label="−" color={color} disabled={current <= 0} onClick={(e) => onCommit(next(-tracker.step), "step", originOf(e))}>
            <Minus size={20} />
          </RoundButton>
          <RoundButton label="+" color={color} primary onClick={(e) => onCommit(next(tracker.step), "step", originOf(e))}>
            <Plus size={26} strokeWidth={2.6} />
          </RoundButton>
        </div>
      </div>
      <LevelMeter tracker={tracker} value={current} color={color} done={done} />
      <span className="sr-only" aria-live="polite">
        {formatNumber(current, locale)} {tracker.unit ?? ""} {done ? t.today.marked : ""}
      </span>
    </div>
  );
}

/** LED level meter: one segment per goal unit (up to 16), otherwise a continuous bar. */
function LevelMeter({ tracker, value, color, done }: { tracker: Tracker; value: number; color: string; done: boolean }) {
  const goal = tracker.goal;
  const segments = goal !== null && goal > 0 && goal / tracker.step <= 16 ? Math.round(goal / tracker.step) : 0;

  if (!segments) {
    const p = goal ? progress(tracker, value) : Math.min(1, value / 10);
    return (
      <div className="h-2.5 overflow-hidden rounded-full bg-stage" aria-hidden>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
          initial={false}
          animate={{ width: `${p * 100}%` }}
          transition={{ type: "spring", damping: 20, stiffness: 260 }}
        />
      </div>
    );
  }

  const lit = Math.min(segments, Math.floor(value / tracker.step + 1e-9));
  return (
    <div className="flex h-2.5 gap-1" aria-hidden>
      {Array.from({ length: segments }, (_, i) => {
        const on = i < lit;
        return (
          <motion.span
            key={i}
            className="flex-1 rounded-[3px]"
            initial={false}
            animate={{
              backgroundColor: on ? color : "var(--color-stage)",
              boxShadow: on && done ? `0 0 10px ${color}` : "0 0 0px transparent",
              scaleY: on ? [1, 1.8, 1] : 1,
            }}
            transition={{ duration: 0.25 }}
          />
        );
      })}
    </div>
  );
}

/* ---------- Number ---------- */

export function NumberControl({
  tracker,
  value,
  color,
  onCommit,
}: {
  tracker: Tracker;
  value: number | undefined;
  color: string;
  onCommit: Commit;
}) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelled = useRef(false);

  const start = () => {
    cancelled.current = false;
    setDraft(value !== undefined ? String(value) : "");
    setEditing(true);
  };

  const finish = (el: HTMLElement) => {
    setEditing(false);
    if (cancelled.current) return;
    const trimmed = draft.trim().replace(",", ".");
    if (trimmed === "") return;
    const n = Number(trimmed);
    if (Number.isFinite(n)) onCommit(n, "log", originOfElement(el));
  };

  const stepFrom = value ?? tracker.goal ?? 0;
  const stepped = (delta: number) => Math.max(0, Math.round((stepFrom + (value === undefined ? 0 : delta)) * 100) / 100);

  return (
    <div className="flex items-end justify-between gap-3">
      {editing ? (
        <input
          autoFocus
          inputMode="decimal"
          aria-label={tracker.name}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => finish(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancelled.current = true;
              e.currentTarget.blur();
            }
          }}
          className="display-tight tabular h-14 w-full min-w-0 rounded-xl border bg-stage px-3 text-4xl font-bold outline-none"
          style={{ borderColor: color }}
        />
      ) : (
        <button type="button" onClick={start} className="-mx-1 min-w-0 rounded-lg px-1 text-left" aria-label={`${t.today.enterValue}: ${tracker.name}`}>
          <BigValue sub={tracker.unit}>{value !== undefined ? formatNumber(value, locale) : <span className="font-sans font-normal text-faint">–</span>}</BigValue>
        </button>
      )}
      {!editing && (
        <div className="flex items-center gap-2">
          <RoundButton label="−" color={color} disabled={value === undefined} onClick={(e) => onCommit(stepped(-tracker.step), "step", originOf(e))}>
            <Minus size={20} />
          </RoundButton>
          <RoundButton label="+" color={color} primary onClick={(e) => onCommit(stepped(tracker.step), "step", originOf(e))}>
            <Plus size={26} strokeWidth={2.6} />
          </RoundButton>
        </div>
      )}
    </div>
  );
}

/* ---------- Time ---------- */

export function TimeControl({
  tracker,
  value,
  color,
  onCommit,
}: {
  tracker: Tracker;
  value: number | undefined;
  color: string;
  onCommit: Commit;
}) {
  const { t } = useI18n();
  const done = isDone(tracker, value);
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<{ value: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const shown = draft ?? (value !== undefined ? formatMinutes(value) : "");

  const latest = useRef({ value, onCommit });
  useEffect(() => {
    latest.current = { value, onCommit };
  });

  // Saves the picked time. Runs after a pause in picking, on blur, or on unmount,
  // so a value chosen in the picker is never lost when focus stays in the field.
  const flush = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    setDraft(null);
    const minutes = parseTime(p.value);
    if (minutes !== null && minutes !== latest.current.value) latest.current.onCommit(minutes, "log", originOfElement(input.current));
  }, []);
  useEffect(() => flush, [flush]);

  const change = (next: string) => {
    setDraft(next);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { value: next, timer: setTimeout(flush, 1200) };
  };

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker();
    } catch {
      // Already open, or unsupported: the field still accepts typing.
    }
  };

  const now = (e: React.MouseEvent) => {
    const d = new Date();
    onCommit(d.getHours() * 60 + d.getMinutes(), "log", originOf(e));
  };

  return (
    <div className="flex items-end justify-between gap-3">
      <div className="relative min-w-0">
        <input
          ref={input}
          type="time"
          aria-label={tracker.name}
          value={shown}
          onChange={(e) => change(e.target.value)}
          onClick={openPicker}
          onBlur={flush}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="time-field display-tight tabular -ml-1.5 h-14 w-[3.3em] cursor-pointer rounded-xl bg-transparent px-1.5 text-5xl font-bold outline-none transition-colors hover:bg-panel-2 focus:bg-panel-2"
          style={{ color: value !== undefined && !done && draft === null ? "var(--color-dim)" : "var(--color-ink)" }}
        />
        {!shown && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-5xl font-light text-faint" aria-hidden>
            ––:––
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {value !== undefined && (
          <RoundButton label={t.today.clear} color={color} onClick={(e) => onCommit(null, "log", originOf(e))}>
            <X size={18} />
          </RoundButton>
        )}
        <motion.button
          type="button"
          onClick={now}
          whileTap={{ scale: 0.92 }}
          className="flex h-14 shrink-0 items-center gap-2 rounded-2xl px-4 font-semibold text-stage"
          style={{ background: color, boxShadow: `0 0 18px color-mix(in oklab, ${color} 45%, transparent)` }}
        >
          <Clock size={18} strokeWidth={2.4} />
          {t.today.now}
        </motion.button>
      </div>
    </div>
  );
}

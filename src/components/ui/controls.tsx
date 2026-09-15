"use client";

import { motion } from "motion/react";
import { useId } from "react";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-2 py-2.5">
      <span className="text-sm text-dim">{label}</span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-rig bg-stage px-4 text-base text-ink placeholder:text-faint outline-none transition-colors focus:border-cyan/70";

interface SegmentedProps<T extends string | number> {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  label?: string;
  accent?: string;
}

export function Segmented<T extends string | number>({ value, options, onChange, label, accent }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl border border-rig bg-stage p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg px-2 text-sm transition-colors ${active ? "text-stage" : "text-dim hover:text-ink"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg"
                style={{ background: accent ?? "var(--color-ink)" }}
                transition={{ type: "spring", damping: 30, stiffness: 420 }}
              />
            )}
            <span className="relative truncate font-medium">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger";

export function Button({
  variant = "ghost",
  className = "",
  accent,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; accent?: string }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "text-stage font-semibold",
    ghost: "border border-rig text-ink hover:bg-panel-2",
    danger: "border border-red/40 text-red hover:bg-red/10",
  };
  return (
    <button
      {...props}
      style={variant === "primary" ? { background: accent ?? "var(--color-ink)", ...props.style } : props.style}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] transition-[transform,background-color,opacity] active:scale-[0.97] disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  );
}

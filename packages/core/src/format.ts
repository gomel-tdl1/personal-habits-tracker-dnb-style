import { formatMinutes } from "./dates";
import type { Dict, Locale } from "./i18n/dict";
import type { Tracker } from "./types";

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2 }).format(value);
}

export function formatValue(t: Tracker, value: number, locale: Locale): string {
  return t.type === "time" ? formatMinutes(value) : formatNumber(value, locale);
}

/** "≥ 8 стак." / "≤ 07:00" / "" */
export function goalText(t: Tracker, dict: Dict, locale: Locale): string {
  if (t.type === "check" || t.goal === null) return "";
  const v = `${formatValue(t, t.goal, locale)}${t.unit && t.type !== "time" ? ` ${t.unit}` : ""}`;
  return dict.trackers.goalSummary[t.goal_op](v);
}

export function scheduleText(t: Tracker, dict: Dict): string {
  const days = [...t.days].sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return dict.trackers.everyDay;
  if (days.join() === "1,2,3,4,5") return dict.trackers.weekdays;
  if (days.join() === "6,7") return dict.trackers.weekends;
  return days.map((d) => dict.trackers.dayNames[d - 1]).join(", ");
}

export function localeTag(locale: Locale) {
  return locale === "ru" ? "ru-RU" : "en-US";
}

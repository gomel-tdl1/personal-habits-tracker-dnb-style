/** Local calendar date helpers. Keys are YYYY-MM-DD strings in the device's timezone. */

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses a key as local noon, which keeps day arithmetic safe across DST shifts. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** A day runs from 04:00 to 04:00, so a late night still belongs to the evening before. */
export const DAY_START_HOUR = 4;

/** The habit day a moment belongs to. */
export function dayKeyOf(moment: Date): string {
  const d = new Date(moment);
  d.setHours(d.getHours() - DAY_START_HOUR);
  return toKey(d);
}

export function todayKey(): string {
  return dayKeyOf(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(from: string, to: string): number {
  return Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86_400_000);
}

/** 1 = Monday … 7 = Sunday. */
export function isoWeekday(key: string): number {
  return fromKey(key).getDay() || 7;
}

export function rangeKeys(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

/** HH:MM for minutes after midnight; values past midnight (or before it) wrap around. */
export function formatMinutes(total: number): string {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

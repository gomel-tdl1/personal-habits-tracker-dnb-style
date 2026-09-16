import { describe, expect, it } from "vitest";
import { addDays, dayKeyOf, diffDays, fromKey, isoWeekday, rangeKeys, toKey, formatMinutes, parseTime } from "./dates";

describe("dates", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("round-trips keys", () => {
    expect(toKey(fromKey("2026-02-28"))).toBe("2026-02-28");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("survives DST changes", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("returns ISO weekday with Monday = 1", () => {
    expect(isoWeekday("2026-09-14")).toBe(1);
    expect(isoWeekday("2026-09-20")).toBe(7);
  });

  it("builds inclusive ranges", () => {
    expect(rangeKeys("2026-09-13", "2026-09-15")).toEqual(["2026-09-13", "2026-09-14", "2026-09-15"]);
    expect(rangeKeys("2026-09-15", "2026-09-13")).toEqual([]);
  });

  it("counts days between keys", () => {
    expect(diffDays("2026-09-01", "2026-09-15")).toBe(14);
  });

  it("counts the small hours as the previous day", () => {
    expect(dayKeyOf(new Date(2026, 8, 16, 1, 0))).toBe("2026-09-15");
    expect(dayKeyOf(new Date(2026, 8, 16, 3, 59))).toBe("2026-09-15");
    expect(dayKeyOf(new Date(2026, 8, 16, 4, 0))).toBe("2026-09-16");
    expect(dayKeyOf(new Date(2026, 8, 15, 23, 30))).toBe("2026-09-15");
  });

  it("wraps clock minutes past midnight", () => {
    expect(formatMinutes(1500)).toBe("01:00");
    expect(formatMinutes(-30)).toBe("23:30");
  });

  it("formats and parses clock minutes", () => {
    expect(formatMinutes(420)).toBe("07:00");
    expect(formatMinutes(1439)).toBe("23:59");
    expect(parseTime("06:45")).toBe(405);
    expect(parseTime("bad")).toBeNull();
  });
});

import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import type { Entry, Tracker, TrackerDraft, Widget, WidgetDraft } from "../types";
import type { Repo } from "./types";

const PAGE = 1000;

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const toNumber = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function normalizeTracker(row: Tracker): Tracker {
  return { ...row, goal: toNumber(row.goal), step: Number(row.step), days: row.days ?? [] };
}

export const supabaseRepo: Repo = {
  async listTrackers() {
    const db = getSupabase();
    const rows = check(await db.from("trackers").select("*").order("position").order("created_at"));
    return (rows as Tracker[]).map(normalizeTracker);
  },

  async saveTracker({ id, ...fields }: TrackerDraft) {
    const db = getSupabase();
    const query = id
      ? db.from("trackers").update(fields).eq("id", id)
      : db.from("trackers").insert(fields);
    const row = check(await query.select().single());
    return normalizeTracker(row as Tracker);
  },

  async deleteTracker(id) {
    check(await getSupabase().from("trackers").delete().eq("id", id));
  },

  async reorderTrackers(ids) {
    const db = getSupabase();
    await Promise.all(ids.map(async (id, position) => check(await db.from("trackers").update({ position }).eq("id", id))));
  },

  async listEntries(from) {
    const db = getSupabase();
    const all: Entry[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const rows = check(
        await db
          .from("entries")
          // "*" keeps working on a database without the `sets` column (before 004).
          .select("*")
          .gte("date", from)
          .order("date")
          .order("tracker_id")
          .range(offset, offset + PAGE - 1),
      ) as Entry[];
      all.push(
        ...rows.map(({ tracker_id, date, value, sets }) => ({ tracker_id, date, value: Number(value), sets: sets ? sets.map(Number) : null })),
      );
      if (rows.length < PAGE) return all;
    }
  },

  async setEntry(trackerId, date, value, sets) {
    const db = getSupabase();
    if (value === null) {
      check(await db.from("entries").delete().eq("tracker_id", trackerId).eq("date", date));
      return;
    }
    check(
      await db
        .from("entries")
        .upsert(
          { tracker_id: trackerId, date, value, ...(sets ? { sets } : {}), updated_at: new Date().toISOString() },
          { onConflict: "tracker_id,date" },
        ),
    );
  },

  async listWidgets() {
    const rows = check(await getSupabase().from("dashboard_widgets").select("*").order("position").order("created_at"));
    return rows as Widget[];
  },

  async saveWidget({ id, ...fields }: WidgetDraft) {
    const db = getSupabase();
    const query = id
      ? db.from("dashboard_widgets").update(fields).eq("id", id)
      : db.from("dashboard_widgets").insert(fields);
    return check(await query.select().single()) as Widget;
  },

  async deleteWidget(id) {
    check(await getSupabase().from("dashboard_widgets").delete().eq("id", id));
  },

  async reorderWidgets(ids) {
    const db = getSupabase();
    await Promise.all(
      ids.map(async (id, position) => check(await db.from("dashboard_widgets").update({ position }).eq("id", id))),
    );
  },
};

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { addDays, todayKey } from "./dates";
import { repo } from "./repo";
import { entryKey, type Entry, type EntryMap, type SetsMap, type Tracker, type TrackerDraft, type Widget, type WidgetDraft } from "./types";

export const HISTORY_DAYS = 400;
export const historyFrom = () => addDays(todayKey(), -HISTORY_DAYS);

const keys = {
  trackers: ["trackers"] as const,
  entries: ["entries"] as const,
  widgets: ["widgets"] as const,
};

/* ---------- Trackers ---------- */

export function useTrackers() {
  return useQuery({ queryKey: keys.trackers, queryFn: repo.listTrackers });
}

export function useActiveTrackers(): Tracker[] {
  const { data } = useTrackers();
  return useMemo(() => (data ?? []).filter((t) => !t.archived_at), [data]);
}

export function useSaveTracker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: TrackerDraft) => repo.saveTracker(draft),
    onSuccess: (saved) => {
      qc.setQueryData<Tracker[]>(keys.trackers, (list = []) => {
        const exists = list.some((t) => t.id === saved.id);
        return exists ? list.map((t) => (t.id === saved.id ? saved : t)) : [...list, saved];
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.trackers }),
  });
}

export function useDeleteTracker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteTracker(id),
    onMutate: (id) => {
      qc.setQueryData<Tracker[]>(keys.trackers, (list = []) => list.filter((t) => t.id !== id));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.trackers });
      qc.invalidateQueries({ queryKey: keys.entries });
    },
  });
}

export function useReorderTrackers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => repo.reorderTrackers(ids),
    onMutate: (ids) => {
      qc.setQueryData<Tracker[]>(keys.trackers, (list = []) =>
        list
          .map((t) => (ids.includes(t.id) ? { ...t, position: ids.indexOf(t.id) } : t))
          .sort((a, b) => a.position - b.position),
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: keys.trackers }),
  });
}

/* ---------- Entries ---------- */

export function useEntries() {
  return useQuery({ queryKey: keys.entries, queryFn: () => repo.listEntries(historyFrom()) });
}

export function useEntryMap(): { map: EntryMap; sets: SetsMap; isLoading: boolean } {
  const { data, isLoading } = useEntries();
  const map = useMemo(() => new Map((data ?? []).map((e) => [entryKey(e.tracker_id, e.date), e.value])), [data]);
  const sets = useMemo(
    () => new Map((data ?? []).flatMap((e) => (e.sets?.length ? [[entryKey(e.tracker_id, e.date), e.sets] as const] : []))),
    [data],
  );
  return { map, sets, isLoading };
}

interface SetEntryVars {
  trackerId: string;
  date: string;
  value: number | null;
  sets?: number[];
}

export function useSetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trackerId, date, value, sets }: SetEntryVars) => repo.setEntry(trackerId, date, value, sets),
    // Serialize entry writes so rapid taps land in order.
    scope: { id: "entries" },
    onMutate: ({ trackerId, date, value, sets }) => {
      const previous = qc.getQueryData<Entry[]>(keys.entries);
      qc.setQueryData<Entry[]>(keys.entries, (list = []) => {
        const rest = list.filter((e) => !(e.tracker_id === trackerId && e.date === date));
        return value === null ? rest : [...rest, { tracker_id: trackerId, date, value, sets: sets ?? null }];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.entries, ctx.previous);
    },
  });
}

/* ---------- Widgets ---------- */

export function useWidgets() {
  return useQuery({ queryKey: keys.widgets, queryFn: repo.listWidgets });
}

export function useSaveWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: WidgetDraft) => repo.saveWidget(draft),
    onMutate: (draft) => {
      if (!draft.id) return;
      qc.setQueryData<Widget[]>(keys.widgets, (list = []) =>
        list.map((w) => (w.id === draft.id ? { ...w, ...draft, id: w.id } : w)),
      );
    },
    onSuccess: (saved) => {
      qc.setQueryData<Widget[]>(keys.widgets, (list = []) => {
        const exists = list.some((w) => w.id === saved.id);
        return exists ? list.map((w) => (w.id === saved.id ? saved : w)) : [...list, saved];
      });
    },
    onError: () => qc.invalidateQueries({ queryKey: keys.widgets }),
  });
}

export function useDeleteWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteWidget(id),
    onMutate: (id) => {
      qc.setQueryData<Widget[]>(keys.widgets, (list = []) => list.filter((w) => w.id !== id));
    },
    onError: () => qc.invalidateQueries({ queryKey: keys.widgets }),
  });
}

export function useReorderWidgets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => repo.reorderWidgets(ids),
    onMutate: (ids) => {
      qc.setQueryData<Widget[]>(keys.widgets, (list = []) =>
        list.map((w) => ({ ...w, position: ids.indexOf(w.id) })).sort((a, b) => a.position - b.position),
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: keys.widgets }),
  });
}

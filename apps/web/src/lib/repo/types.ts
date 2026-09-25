import type { Entry, Tracker, TrackerDraft, Widget, WidgetDraft } from "@drop/core/types";

export interface Repo {
  listTrackers(): Promise<Tracker[]>;
  saveTracker(draft: TrackerDraft): Promise<Tracker>;
  deleteTracker(id: string): Promise<void>;
  reorderTrackers(ids: string[]): Promise<void>;

  /** Entries with date >= from. */
  listEntries(from: string): Promise<Entry[]>;
  /** `null` removes the entry. `sets` is stored for sets trackers only. */
  setEntry(trackerId: string, date: string, value: number | null, sets?: number[]): Promise<void>;

  listWidgets(): Promise<Widget[]>;
  saveWidget(draft: WidgetDraft): Promise<Widget>;
  deleteWidget(id: string): Promise<void>;
  reorderWidgets(ids: string[]): Promise<void>;
}

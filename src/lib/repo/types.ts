import type { Entry, Tracker, TrackerDraft, Widget, WidgetDraft } from "../types";

export interface Repo {
  listTrackers(): Promise<Tracker[]>;
  saveTracker(draft: TrackerDraft): Promise<Tracker>;
  deleteTracker(id: string): Promise<void>;
  reorderTrackers(ids: string[]): Promise<void>;

  /** Entries with date >= from. */
  listEntries(from: string): Promise<Entry[]>;
  /** `null` removes the entry. */
  setEntry(trackerId: string, date: string, value: number | null): Promise<void>;

  listWidgets(): Promise<Widget[]>;
  saveWidget(draft: WidgetDraft): Promise<Widget>;
  deleteWidget(id: string): Promise<void>;
  reorderWidgets(ids: string[]): Promise<void>;
}

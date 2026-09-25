import { Suspense } from "react";
import { TrackersView } from "@/components/trackers/TrackersView";

export default function TrackersPage() {
  return (
    <Suspense>
      <TrackersView />
    </Suspense>
  );
}

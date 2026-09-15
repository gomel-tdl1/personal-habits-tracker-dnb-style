"use client";

import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useEffect, useState } from "react";
import { addDays } from "@/lib/dates";
import { currentStreak, doneOn, isScheduled } from "@/lib/habits";
import { useToday } from "@/lib/hooks/useToday";
import { useI18n } from "@/lib/i18n/provider";
import { HISTORY_DAYS, useActiveTrackers, useEntryMap, useTrackers } from "@/lib/queries";
import { sound } from "@/lib/sound/engine";
import { entryKey } from "@/lib/types";
import { FxLayer } from "../fx/FxLayer";
import { DayHeader } from "./DayHeader";
import { DropMeter } from "./DropMeter";
import { Presets } from "./Presets";
import { TrackerCard } from "./TrackerCard";
import { useCommit } from "./useCommit";

export function TodayView() {
  const today = useToday();
  if (!today) return <CardsSkeleton />;
  return <Day today={today} />;
}

function Day({ today }: { today: string }) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<{ date: string; dir: number } | null>(null);
  const date = picked && picked.date <= today ? picked.date : today;
  const dir = picked?.dir ?? 0;
  const minDate = addDays(today, -HISTORY_DAYS);

  const trackersQuery = useTrackers();
  const active = useActiveTrackers();
  const { map, isLoading: entriesLoading } = useEntryMap();
  const scheduled = active.filter((tr) => isScheduled(tr, date));
  const commit = useCommit({ trackers: active, map, date });

  // Fetch a real drop track once the day is one or two habits away from closing.
  const remaining = scheduled.filter((tr) => !doneOn(tr, map, date)).length;
  useEffect(() => {
    if (remaining > 0 && remaining <= 2) sound.prepareTrack();
  }, [remaining]);

  const go = (next: string) => {
    if (next > today || next < minDate || next === date) return;
    setPicked({ date: next, dir: next > date ? 1 : -1 });
  };

  const onPanEnd = (_: unknown, info: PanInfo) => {
    const { x, y } = info.offset;
    if (Math.abs(x) < 70 || Math.abs(x) < Math.abs(y) * 1.5) return;
    go(addDays(date, x < 0 ? 1 : -1));
  };

  if (trackersQuery.isError) return <p className="text-red">{t.common.loadError}</p>;

  return (
    <>
      <FxLayer />
      <DayHeader date={date} today={today} minDate={minDate} onChange={go} />

      {trackersQuery.isLoading || entriesLoading ? (
        <CardsSkeleton />
      ) : active.length === 0 ? (
        <Presets />
      ) : (
        <motion.div onPanEnd={onPanEnd} style={{ touchAction: "pan-y" }} className="min-h-[50dvh]">
          <DropMeter trackers={scheduled} map={map} date={date} />
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={date}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 40 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -40 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.2, 0.9, 0.1, 1] }}
              className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            >
              {scheduled.length === 0 ? (
                <div className="rounded-card border border-dashed border-rig p-8 text-center md:col-span-2 xl:col-span-3">
                  <p className="font-medium">{t.today.nothing}</p>
                  <p className="mt-1 text-sm text-dim">{t.today.nothingHint}</p>
                </div>
              ) : (
                scheduled.map((tr) => (
                  <TrackerCard
                    key={tr.id}
                    tracker={tr}
                    value={map.get(entryKey(tr.id, date))}
                    streak={currentStreak(tr, map, date)}
                    onCommit={(value, gesture, origin) => commit(tr, value, gesture, origin)}
                  />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}

function CardsSkeleton() {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-card border border-rig bg-panel" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

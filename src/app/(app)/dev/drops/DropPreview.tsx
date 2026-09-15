"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { fx } from "@/components/fx/bus";
import { FxLayer } from "@/components/fx/FxLayer";
import type { DropTimeline } from "@/lib/sound/drops";
import { SCENES, isSceneId, type SceneId } from "@/lib/sound/scenes";
import { BAR, S16 } from "@/lib/sound/tempo";

const TRACK_OF: Partial<Record<SceneId, { artist: string; title: string }>> = {
  punch: { artist: "Delta Heavy", title: "Punching Holes" },
  circuit: { artist: "Metrik", title: "Ex Machina" },
  ripple: { artist: "Ripple", title: "Everyday" },
  kaleido: { artist: "Changing Faces", title: "Rave Machine (VIP)" },
  siren: { artist: "Sub Focus, MC ID", title: "Alarm" },
  speaker: { artist: "Flowidus, Loboski", title: "Amplify" },
};

/** A drop on a plain 174 BPM grid: one bar of build, eight bars of kicks on 1 and the "and" of 3. */
function fakeTimeline(scene: SceneId): DropTimeline {
  const ms = (sec: number) => Math.round(sec * 1000);
  const hits = (slots: number[]) => Array.from({ length: 8 }, (_, bar) => slots.map((s) => ms(BAR + bar * BAR + s * S16))).flat();
  return { style: scene, colors: SCENES[scene].colors, dropAt: ms(BAR), kicks: hits([0, 10]), snares: hits([4, 12]), end: ms(BAR * 9), track: TRACK_OF[scene] };
}

function Preview() {
  const params = useSearchParams();
  const auto = params.get("scene");

  useEffect(() => {
    if (isSceneId(auto)) fx.emit({ type: "drop", timeline: fakeTimeline(auto) });
  }, [auto]);

  return (
    <>
      <FxLayer />
      <h1 className="display-tight text-5xl font-extrabold uppercase">Drops</h1>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(Object.keys(SCENES) as SceneId[]).map((scene) => (
          <button
            key={scene}
            onClick={() => fx.emit({ type: "drop", timeline: fakeTimeline(scene) })}
            className="h-12 rounded-xl border border-rig px-3 text-left transition-colors hover:bg-panel-2"
            style={{ borderLeft: `4px solid ${SCENES[scene].colors[0]}` }}
          >
            {scene}
          </button>
        ))}
      </div>
    </>
  );
}

export function DropPreview() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}

import type { SceneId } from "@/lib/sound/scenes";
import { Circuit } from "./Circuit";
import { Kaleido } from "./Kaleido";
import { Punch } from "./Punch";
import { Ripple } from "./Ripple";
import type { SceneProps } from "./shared";
import { Siren } from "./Siren";
import { Speaker } from "./Speaker";
import { Equalizer, Lasers, LedWall, Sunburst } from "./Synth";

export const SCENE_COMPONENTS: Record<SceneId, (props: SceneProps) => React.ReactNode> = {
  rave: Lasers,
  bounce: LedWall,
  euphoria: Sunburst,
  anthem: Equalizer,
  punch: Punch,
  circuit: Circuit,
  ripple: Ripple,
  kaleido: Kaleido,
  siren: Siren,
  speaker: Speaker,
};

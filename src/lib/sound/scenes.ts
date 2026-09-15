import type { DropStyleId } from "./drops";

/**
 * Light shows for drops. The synth scenes belong to the synthesized drops; the
 * track scenes were designed for specific tracks. Track palettes come from each
 * drop's key: the tonic sets the main hue on a circle-of-fifths colour wheel
 * (G red, D orange, A amber, E lime … F magenta), the next strongest note sets
 * the accent, minor keys sit on darker grounds.
 */

export const TRACK_SCENE_IDS = ["punch", "circuit", "ripple", "kaleido", "siren", "speaker"] as const;
export type TrackSceneId = (typeof TRACK_SCENE_IDS)[number];
export type SceneId = DropStyleId | TrackSceneId;

export interface SceneMeta {
  colors: string[];
  /** How the page reacts to each kick. */
  pump: Keyframe[];
  pumpBeats: number;
}

const squeeze = (scale: number, brightness = 1.2): Keyframe[] => [
  { transform: `scale(${scale})`, filter: `brightness(${brightness})` },
  { transform: "none", filter: "none" },
];

export const SCENES: Record<SceneId, SceneMeta> = {
  // Synthesized drops.
  rave: { colors: ["#27E8F5", "#F2F4FF", "#FF2E88", "#5AA9FF"], pump: squeeze(0.97), pumpBeats: 0.8 },
  bounce: {
    colors: ["#FFB020", "#FF3B3B", "#F2F4FF", "#FF2E88"],
    pump: [{ transform: "translateY(10px) scale(0.975)" }, { transform: "translateY(-3px) scale(1.005)", offset: 0.4 }, { transform: "none" }],
    pumpBeats: 0.8,
  },
  euphoria: { colors: ["#FFB020", "#FF2E88", "#27E8F5", "#B6FF3B"], pump: squeeze(0.97), pumpBeats: 0.8 },
  anthem: { colors: ["#8B5CFF", "#5AA9FF", "#FF2E88", "#F2F4FF"], pump: squeeze(0.955, 1.35), pumpBeats: 1.1 },

  // Delta Heavy — Punching Holes. G minor, chromatic A/B♭/F♯ clusters: blood red and bruise violet on char.
  punch: {
    colors: ["#E3122C", "#7A2CFF", "#FF6B4A", "#FFE3D6"],
    pump: [
      { transform: "translate(0, 0) scale(0.96)", filter: "brightness(1.3) contrast(1.1)" },
      { transform: "translate(-6px, 3px) scale(0.99)", offset: 0.25 },
      { transform: "translate(4px, -2px)", offset: 0.5 },
      { transform: "none", filter: "none" },
    ],
    pumpBeats: 0.9,
  },
  // Metrik — Ex Machina. F major with a metallic F♯: magenta current on teal traces.
  circuit: { colors: ["#FF2BD6", "#19F2C3", "#F4F8FF", "#7D8BA6"], pump: squeeze(0.975, 1.25), pumpBeats: 0.7 },
  // Ripple — Everyday. F, major/minor ambiguous, airy top: orchid and lime over deep violet water.
  ripple: {
    colors: ["#D65CFF", "#A6FF4D", "#EAF7FF", "#2A1147"],
    pump: [{ transform: "translateY(6px) scale(0.985)" }, { transform: "translateY(-2px)", offset: 0.5 }, { transform: "none" }],
    pumpBeats: 1.2,
  },
  // Changing Faces — Rave Machine (VIP). A minor against E♭ (a tritone): amber versus electric blue.
  kaleido: {
    colors: ["#FFB21E", "#2F5BFF", "#FFFFFF", "#FF3DA8"],
    pump: [{ transform: "rotate(-0.6deg) scale(0.975)", filter: "brightness(1.2)" }, { transform: "none", filter: "none" }],
    pumpBeats: 0.8,
  },
  // Sub Focus — Alarm. A minor, the siren swings between A and F: amber and alarm red.
  siren: {
    colors: ["#FFA000", "#FF1F4B", "#FFF3D6", "#FF5A1F"],
    pump: [
      { transform: "translateX(-5px)", filter: "brightness(1.25)" },
      { transform: "translateX(4px)", offset: 0.3 },
      { transform: "translateX(-2px)", offset: 0.6 },
      { transform: "none", filter: "none" },
    ],
    pumpBeats: 0.7,
  },
  // Flowidus, Loboski — Amplify. E major, open E–B fifth: acid lime and green with white highlights.
  speaker: { colors: ["#C6FF1A", "#28F07A", "#F7FFE8", "#0B2A12"], pump: squeeze(0.94, 1.3), pumpBeats: 1 },
};

export function isSceneId(value: unknown): value is SceneId {
  return typeof value === "string" && value in SCENES;
}

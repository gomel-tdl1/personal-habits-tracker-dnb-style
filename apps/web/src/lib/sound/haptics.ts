import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * Plays a vibration pattern ([buzz, pause, buzz, …] in ms) on the Taptic Engine,
 * which can't hold a buzz: each buzz becomes one tap, heavier for longer buzzes.
 */
export function tapPattern(pattern: number | number[]) {
  const steps = typeof pattern === "number" ? [pattern] : pattern;
  let at = 0;
  steps.forEach((ms, i) => {
    if (i % 2 === 0 && ms > 0) {
      const style = ms >= 100 ? ImpactStyle.Heavy : ms >= 40 ? ImpactStyle.Medium : ImpactStyle.Light;
      if (at === 0) void Haptics.impact({ style });
      else setTimeout(() => void Haptics.impact({ style }), at);
    }
    at += ms;
  });
}

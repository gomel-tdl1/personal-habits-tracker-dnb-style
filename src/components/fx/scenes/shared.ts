export interface SceneProps {
  colors: string[];
  /** Kicks so far; changes on every kick. */
  beat: number;
  /** Snares so far; changes on every snare. */
  hit: number;
}

export const EASE_OUT: [number, number, number, number] = [0.2, 0.9, 0.1, 1];

/** Pseudo-random in [0, 1), stable for the same inputs so renders don't reshuffle. */
export const rand = (seed: number, i: number) => {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

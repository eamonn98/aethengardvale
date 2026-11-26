export interface PathSegment {
  id: string;
  w: number;
  d: number;
  x: number;
  z: number;
}

/**
 * Strictly non-overlapping, flush rectangular cobblestone path segments.
 * Eliminates coplanar Z-fighting and lets world-space UVs tile seamlessly across junctions.
 */
export const PATH_SEGMENTS: readonly PathSegment[] = [
  { id: "south_bridge_approach", w: 4.8, d: 1.9, x: 0, z: 5.35 }, // z: 4.4 .. 6.3
  { id: "crossroad_west", w: 10.6, d: 3.0, x: -7.7, z: 7.8 }, // x: -13.0 .. -2.4, z: 6.3 .. 9.3
  { id: "crossroad_hub", w: 4.8, d: 3.0, x: 0, z: 7.8 }, // x: -2.4 .. 2.4, z: 6.3 .. 9.3
  { id: "crossroad_east", w: 10.6, d: 3.0, x: 7.7, z: 7.8 }, // x: 2.4 .. 13.0, z: 6.3 .. 9.3
  { id: "south_main_road", w: 4.8, d: 6.5, x: 0, z: 12.55 }, // z: 9.3 .. 15.8
  { id: "north_bridge_approach", w: 4.8, d: 0.5, x: 0, z: -4.65 }, // z: -4.9 .. -4.4
  { id: "sanctuary_courtyard", w: 15.5, d: 8.6, x: 0, z: -9.2 }, // z: -13.5 .. -4.9
];

export const BRAZIER_SPOTS: readonly [number, number][] = [
  [-3.15, 4.15],
  [3.15, 4.15],
  [-3.15, -4.15],
  [3.15, -4.15],
  [-3.4, -10.8],
  [3.4, -10.8],
];

export const TABLE_SPOTS: readonly [number, number][] = [
  [-6.2, 10.6],
  [6.4, 10.4],
];

export const CRATE_SPOTS: readonly [number, number, number][] = [
  [-9.8, 6.2, 1.0],
  [-10.7, 5.8, 0.85],
  [8.4, -7.2, 1.0],
];

export const CHEST_SPOT = {
  x: -6.2,
  z: -9.6,
  goldBonus: 50,
  atkBonus: 4,
} as const;

export const TREE_SPOTS: readonly [number, number, number, boolean?][] = [
  [-12.5, 4.6, 1.15],
  [-10.2, 4.8, 0.95],
  [10.4, 4.7, 1.1],
  [13.2, 5.2, 1.25],
  [-11.8, -5.2, 1.2],
  [-9.2, -5.0, 0.95],
  [9.6, -5.1, 1.15],
  [12.4, -4.8, 1.05],
  [-15.5, 11.2, 1.3],
  [-14.2, -10.5, 1.25],
  [15.0, 10.5, 1.25],
  [14.8, -10.2, 1.3],
  [-10.8, -14.2, 1.15],
  [10.8, -14.2, 1.2],
  [-16.8, -15.5, 1.4],
  [16.8, -15.5, 1.4],
  [-8.5, -21.5, 1.45, false],
  [-3.2, -23.0, 1.5, false],
  [4.5, -22.5, 1.4, false],
  [11.0, -21.0, 1.5, false],
  [-18.5, -2.5, 1.35, false],
  [18.5, -2.0, 1.35, false],
];

export const FOREGROUND_TREE_XS: readonly number[] = [-11, -5.5, 5.5, 11.5];

export const BUSH_SPOTS: readonly [number, number][] = [
  [-6.2, 4.5],
  [6.5, 4.6],
  [-5.8, -4.6],
  [6.2, -4.5],
  [-12.4, 9.6],
  [11.8, 9.2],
  [-9.8, -11.4],
  [9.5, -11.2],
  [-14.2, 6.8],
  [13.8, 6.2],
];

export const HILL_SPOTS: readonly [number, number, number, number][] = [
  [-16, -29, 14, 7],
  [0, -32, 20, 8.5],
  [17, -28, 15, 7.5],
];

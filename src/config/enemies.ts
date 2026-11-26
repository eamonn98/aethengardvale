import type { SlimeTier } from "../core/types.ts";

export interface SlimeTierConfig {
  hp: number;
  atk: number;
  xp: number;
  gold: number;
  speed: number;
  scale: number;
  hopInterval: number;
  color: string;
}

export const SLIME_TIERS: Record<SlimeTier, SlimeTierConfig> = {
  green: {
    hp: 20,
    atk: 5,
    xp: 10,
    gold: 6,
    speed: 2.3,
    scale: 1.0,
    hopInterval: 1.55,
    color: "#69e05a",
  },
  blue: {
    hp: 32,
    atk: 7,
    xp: 16,
    gold: 10,
    speed: 3.1,
    scale: 1.08,
    hopInterval: 1.15,
    color: "#5ecbff",
  },
  red: {
    hp: 48,
    atk: 10,
    xp: 26,
    gold: 18,
    speed: 3.4,
    scale: 1.22,
    hopInterval: 1.05,
    color: "#ff694e",
  },
  king: {
    hp: 145,
    atk: 14,
    xp: 90,
    gold: 75,
    speed: 2.7,
    scale: 1.85,
    hopInterval: 1.3,
    color: "#ffd859",
  },
};

export interface SlimeSpawnPoint {
  tier: SlimeTier;
  x: number;
  z: number;
}

export const INITIAL_SLIME_SPAWNS: readonly SlimeSpawnPoint[] = [
  { tier: "green", x: -5.5, z: 6.2 },
  { tier: "green", x: 6.8, z: 6.5 },
  { tier: "green", x: -9.2, z: 10.5 },
  { tier: "green", x: 9.8, z: 9.8 },
  { tier: "blue", x: 0.2, z: 0.0 },
  { tier: "blue", x: -6.8, z: -6.2 },
  { tier: "blue", x: 6.5, z: -6.4 },
  { tier: "red", x: -3.2, z: -9.8 },
  { tier: "red", x: 3.8, z: -9.5 },
];

export interface Vec2 {
  x: number;
  z: number;
}

export type SpriteDir = "up" | "down" | "left" | "right";

export type SlimeTier = "green" | "blue" | "red" | "king";

export type PickupType = "gold" | "heart";

export interface CircleObstacle {
  x: number;
  z: number;
  r: number;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlayerStatsSnapshot {
  lvl: number;
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  atk: number;
  gold: number;
  slimesDefeated: number;
}

export interface GameEvents {
  "stats:changed": PlayerStatsSnapshot;
  "banner:show": { message: string; duration: number };
  "player:died": { slimesDefeated: number; lvl: number };
  "boss:spawned": { tier: SlimeTier };
  "boss:defeated": { tier: SlimeTier };
  "chest:opened": { goldBonus: number; atkBonus: number };
}

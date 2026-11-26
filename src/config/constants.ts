import type { WorldBounds } from "../core/types.ts";

export const SEEDS = {
  ENV_TEXTURES: 4219,
  WORLD_VALE: 9001,
  MUSIC_REVERB: 1337,
} as const;

export const MUSIC_CONFIG = {
  bpm: 84,
  stepsPerBeat: 4,
  totalSteps: 32,
  lookaheadSeconds: 0.1,
  tickMs: 25,
  maxCatchUpSteps: 8,
  delaySeconds: 0.28,
  delayFeedback: 0.32,
  delayLowpassHz: 2200,
  reverbSeconds: 2.6,
  reverbDecay: 2.4,
} as const;

export const WORLD_BOUNDS: WorldBounds = {
  minX: -19.5,
  maxX: 19.5,
  minZ: -14.5,
  maxZ: 15.5,
};

export const RIVER_HALF_Z = 3.1;
export const BRIDGE_HALF_X = 2.85;
export const BRIDGE_HALF_Z = 4.4;
export const BRIDGE_ARCH_HEIGHT = 1.45;

export const WORLD_UV_SCALES = {
  grass: 3.2,
  cobble: 2.4,
  masonry: 2.4,
  wood: 1.4,
} as const;

export const CAMERA_CONFIG = {
  fov: 34,
  near: 0.5,
  far: 120,
  initialPos: { x: 0, y: 12.5, z: 22 },
  followOffsetY: 9.2,
  followOffsetZ: 13.8,
  followDamping: 5.5,
} as const;

export const HD2D_DEFAULTS = {
  focusY: 0.48,
  focusBand: 0.16,
  blurAmount: 1.0,
  bloomStrength: 0.38,
  bloomRadius: 0.55,
  bloomThreshold: 0.76,
} as const;

export const PLAYER_DEFAULTS = {
  startX: 0,
  startZ: 9.8,
  speed: 6.2,
  hp: 40,
  lvl: 1,
  xp: 0,
  xpNext: 30,
  atk: 10,
  dashSpeed: 15.5,
  dashDuration: 0.16,
  dashCooldown: 0.72,
  dashInvuln: 0.22,
  atkDuration: 0.24,
  atkCooldown: 0.3,
  stepInterval: 0.28,
  collisionRadius: 0.46,
} as const;

export const COMBAT_CONFIG = {
  swordReach: 2.25,
  critChance: 0.22,
  critMultiplier: 1.65,
  critHitstop: 0.055,
  normalHitstop: 0.036,
  critShake: 0.26,
  normalShake: 0.14,
  bossKillThreshold: 10,
  xpLevelScale: 1.48,
  levelUpHpGain: 10,
  levelUpAtkGain: 3,
} as const;

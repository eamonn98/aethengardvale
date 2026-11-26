import type { SlimeTier } from "../core/types.ts";

export interface BossHpSource {
  tier: SlimeTier;
  hp: number;
  maxHp: number;
}

export interface BossHpSnapshot {
  tier: SlimeTier;
  hp: number;
  maxHp: number;
}

/**
 * Picks the active boss (currently only the King Slime) out of the living slimes.
 * Returns null when no boss is on the field so the HUD can hide its bar.
 */
export function findActiveBoss(
  slimes: readonly BossHpSource[],
): BossHpSnapshot | null {
  for (const slime of slimes) {
    if (slime.tier !== "king") continue;
    return {
      tier: slime.tier,
      hp: Math.min(Math.max(slime.hp, 0), slime.maxHp),
      maxHp: slime.maxHp,
    };
  }
  return null;
}

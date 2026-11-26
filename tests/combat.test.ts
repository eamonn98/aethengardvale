import { describe, expect, test } from "bun:test";
import {
  applyExperienceGain,
  computeSwordDamage,
  isTargetInSwordArc,
} from "../src/gameplay/combat.ts";

describe("combat math & RPG progression", () => {
  test("isTargetInSwordArc detects targets in front and rejects targets behind or too far", () => {
    const player = { x: 0, z: 0 };
    const facingNorth = { x: 0, z: -1 };

    expect(
      isTargetInSwordArc(player, facingNorth, { x: 0, z: -1.8 }, 0.56),
    ).toBe(true);
    expect(
      isTargetInSwordArc(player, facingNorth, { x: 0, z: 1.8 }, 0.56),
    ).toBe(false);
    expect(
      isTargetInSwordArc(player, facingNorth, { x: 0, z: 0.6 }, 0.56),
    ).toBe(true); // point-blank overlap
    expect(
      isTargetInSwordArc(player, facingNorth, { x: 0, z: -4.0 }, 0.56),
    ).toBe(false);
  });

  test("computeSwordDamage applies variance and crit multiplier deterministically", () => {
    // crit roll < 0.22 (0.1), variance roll -> 0
    const critHit = computeSwordDamage(10, () => 0.1);
    expect(critHit.crit).toBe(true);
    expect(critHit.damage).toBe(Math.round(10 * 1.65));

    // crit roll >= 0.22 (0.5), variance roll -> floor(0.5 * 4) = 2
    const normalHit = computeSwordDamage(10, () => 0.5);
    expect(normalHit.crit).toBe(false);
    expect(normalHit.damage).toBe(12);
  });

  test("applyExperienceGain handles single and multi-level-ups cleanly", () => {
    const stats = {
      lvl: 1,
      xp: 0,
      xpNext: 30,
      maxHp: 40,
      hp: 15,
      atk: 10,
    };

    // 30 XP -> LV 2, xpNext = round(30 * 1.48) = 44
    // +44 XP (total 74) -> LV 3, xpNext = round(44 * 1.48) = 65
    const levels = applyExperienceGain(stats, 74);
    expect(levels).toBe(2);
    expect(stats.lvl).toBe(3);
    expect(stats.xp).toBe(0);
    expect(stats.xpNext).toBe(65);
    expect(stats.maxHp).toBe(60);
    expect(stats.hp).toBe(60); // full heal on level up
    expect(stats.atk).toBe(16);
  });
});

import { describe, expect, test } from "bun:test";
import { findActiveBoss, type BossHpSource } from "../src/gameplay/bossHp.ts";

const slime = (tier: BossHpSource["tier"], hp: number, maxHp = 145): BossHpSource =>
  ({ tier, hp, maxHp });

describe("findActiveBoss", () => {
  test("returns null when nothing is alive", () => {
    expect(findActiveBoss([])).toBeNull();
  });

  test("ignores non-boss slimes", () => {
    expect(
      findActiveBoss([slime("green", 20, 20), slime("blue", 32, 32)]),
    ).toBeNull();
  });

  test("finds the king slime among regular slimes", () => {
    expect(
      findActiveBoss([
        slime("green", 20, 20),
        slime("king", 96, 145),
        slime("red", 48, 48),
      ]),
    ).toEqual({ tier: "king", hp: 96, maxHp: 145 });
  });

  test("clamps hp into [0, maxHp]", () => {
    expect(findActiveBoss([slime("king", -12, 145)])?.hp).toBe(0);
    expect(findActiveBoss([slime("king", 900, 145)])?.hp).toBe(145);
  });
});

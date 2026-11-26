import { describe, expect, test } from "bun:test";
import {
  BRIDGE_HALF_X,
  RIVER_HALF_Z,
  WORLD_BOUNDS,
} from "../src/config/constants.ts";
import { resolveMovement } from "../src/world/collision.ts";

describe("resolveMovement", () => {
  test("clamps movement within WORLD_BOUNDS", () => {
    const res = resolveMovement({ x: 0, z: 10 }, -999, 999, []);
    expect(res.x).toBe(WORLD_BOUNDS.minX);
    expect(res.z).toBe(WORLD_BOUNDS.maxZ);
  });

  test("blocks walking into the river outside the bridge span", () => {
    const radius = 0.46;
    const res = resolveMovement({ x: 8, z: 4.5 }, 8, 2.0, [], radius);
    expect(res.z).toBeCloseTo(RIVER_HALF_Z + radius, 6);
  });

  test("keeps entities inside bridge parapets while crossing the river", () => {
    const radius = 0.46;
    const res = resolveMovement({ x: 0, z: 0 }, 5.0, 0, [], radius);
    expect(res.x).toBeCloseTo(BRIDGE_HALF_X - radius * 0.7, 6);
  });

  test("allows crossing the bridge deck freely along Z", () => {
    const res = resolveMovement({ x: 0, z: 1.0 }, 0.5, -1.0, [], 0.46);
    expect(res.x).toBe(0.5);
    expect(res.z).toBe(-1.0);
  });

  test("pushes entity out of circular obstacles", () => {
    const obstacles = [{ x: 0, z: 10, r: 1.0 }];
    const radius = 0.5;
    const res = resolveMovement({ x: 0.8, z: 10 }, 0.5, 10, obstacles, radius);
    expect(Math.hypot(res.x - 0, res.z - 10)).toBeCloseTo(1.5, 5);
  });
});

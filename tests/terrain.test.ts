import { describe, expect, test } from "bun:test";
import { BRIDGE_ARCH_HEIGHT, BRIDGE_HALF_Z } from "../src/config/constants.ts";
import {
  getBridgeHeight,
  getTerrainHeight,
  isOnCobble,
} from "../src/world/terrain.ts";

describe("terrain height & surface queries", () => {
  test("bridge peaks at z = 0 and tapers symmetrically to 0 at edges", () => {
    expect(getBridgeHeight(0)).toBeCloseTo(BRIDGE_ARCH_HEIGHT, 6);
    expect(getBridgeHeight(BRIDGE_HALF_Z)).toBeCloseTo(0, 6);
    expect(getBridgeHeight(-BRIDGE_HALF_Z)).toBeCloseTo(0, 6);
    expect(getBridgeHeight(BRIDGE_HALF_Z + 5)).toBeCloseTo(0, 6);
    expect(getBridgeHeight(2.1)).toBeCloseTo(getBridgeHeight(-2.1), 6);
  });

  test("getTerrainHeight returns arch height on bridge and 0 off bridge", () => {
    expect(getTerrainHeight(0, 0)).toBeCloseTo(BRIDGE_ARCH_HEIGHT, 6);
    expect(getTerrainHeight(10, 0)).toBe(0);
    expect(getTerrainHeight(0, 9.8)).toBe(0);
  });

  test("isOnCobble identifies stone paths, bridge, and sanctuary courtyard", () => {
    expect(isOnCobble(0, 0)).toBe(true); // bridge
    expect(isOnCobble(8, 7.8)).toBe(true); // south crossroad
    expect(isOnCobble(0, -9.2)).toBe(true); // sanctuary courtyard
    expect(isOnCobble(-14, 12)).toBe(false); // grass meadow
  });
});

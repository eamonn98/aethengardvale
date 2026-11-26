import { describe, expect, test } from "bun:test";
import { BRIDGE_HALF_Z } from "../src/config/constants.ts";
import { PATH_SEGMENTS } from "../src/config/worldLayout.ts";

describe("worldLayout path segments", () => {
  test("PATH_SEGMENTS have zero pairwise XZ overlap (no coplanar Z-fighting)", () => {
    const eps = 1e-6;
    for (let i = 0; i < PATH_SEGMENTS.length; i++) {
      const a = PATH_SEGMENTS[i];
      if (!a) continue;
      const aMinX = a.x - a.w * 0.5;
      const aMaxX = a.x + a.w * 0.5;
      const aMinZ = a.z - a.d * 0.5;
      const aMaxZ = a.z + a.d * 0.5;

      for (let j = i + 1; j < PATH_SEGMENTS.length; j++) {
        const b = PATH_SEGMENTS[j];
        if (!b) continue;
        const bMinX = b.x - b.w * 0.5;
        const bMaxX = b.x + b.w * 0.5;
        const bMinZ = b.z - b.d * 0.5;
        const bMaxZ = b.z + b.d * 0.5;

        const overlapX = Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX);
        const overlapZ = Math.min(aMaxZ, bMaxZ) - Math.max(aMinZ, bMinZ);
        const intersects = overlapX > eps && overlapZ > eps;
        expect(intersects).toBe(false);
      }
    }
  });

  test("bridge approaches meet ±BRIDGE_HALF_Z flush", () => {
    const south = PATH_SEGMENTS.find((s) => s.id === "south_bridge_approach");
    const north = PATH_SEGMENTS.find((s) => s.id === "north_bridge_approach");
    expect(south).toBeDefined();
    expect(north).toBeDefined();
    if (south && north) {
      expect(south.z - south.d * 0.5).toBeCloseTo(BRIDGE_HALF_Z, 6);
      expect(north.z + north.d * 0.5).toBeCloseTo(-BRIDGE_HALF_Z, 6);
    }
  });
});

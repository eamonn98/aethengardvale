import {
  BRIDGE_HALF_X,
  RIVER_HALF_Z,
  WORLD_BOUNDS,
} from "../config/constants.ts";
import type { CircleObstacle, Vec2 } from "../core/types.ts";

/**
 * Resolves entity movement against world bounds, river/bridge parapets, and circular obstacles.
 */
export function resolveMovement(
  ent: Vec2,
  nextX: number,
  nextZ: number,
  obstacles: readonly CircleObstacle[],
  radius = 0.48,
): Vec2 {
  let x = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, nextX));
  let z = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, nextZ));

  const inBridgeX = Math.abs(x) <= BRIDGE_HALF_X - radius * 0.7;
  if (!inBridgeX && Math.abs(z) < RIVER_HALF_Z + radius) {
    if (
      Math.abs(ent.x) <= BRIDGE_HALF_X &&
      Math.abs(ent.z) < RIVER_HALF_Z + radius
    ) {
      x = Math.sign(x) * (BRIDGE_HALF_X - radius * 0.7);
    } else {
      z = Math.sign(ent.z || 1) * (RIVER_HALF_Z + radius);
    }
  }

  for (const ob of obstacles) {
    const dx = x - ob.x;
    const dz = z - ob.z;
    const minDist = ob.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < minDist * minDist && d2 > 0.00001) {
      const d = Math.sqrt(d2);
      const push = minDist - d;
      x += (dx / d) * push;
      z += (dz / d) * push;
    }
  }

  return { x, z };
}

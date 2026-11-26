import {
  BRIDGE_ARCH_HEIGHT,
  BRIDGE_HALF_X,
  BRIDGE_HALF_Z,
} from "../config/constants.ts";

export function getBridgeHeight(z: number): number {
  const t = Math.max(-1, Math.min(1, z / BRIDGE_HALF_Z));
  return Math.cos(t * Math.PI * 0.5) * BRIDGE_ARCH_HEIGHT;
}

export function getTerrainHeight(x: number, z: number): number {
  if (Math.abs(x) <= BRIDGE_HALF_X + 0.15 && Math.abs(z) <= BRIDGE_HALF_Z) {
    return getBridgeHeight(z);
  }
  return 0;
}

export function isOnCobble(x: number, z: number): boolean {
  if (Math.abs(x) <= BRIDGE_HALF_X + 0.4 && Math.abs(z) <= 13.5) return true;
  if (z >= 6.4 && z <= 9.2 && Math.abs(x) <= 13) return true;
  if (z <= -5.5 && z >= -13.5 && Math.abs(x) <= 8.5) return true;
  return false;
}

import type * as THREE from "three";

/**
 * Rewrites a BoxGeometry's UVs in linear world-space units so adjacent tiles
 * align seamlessly with uniform texel density and zero stretching.
 */
export function applyWorldSpaceBoxUVs(
  geometry: THREE.BoxGeometry,
  worldX: number,
  worldY: number,
  worldZ: number,
  tileSize: number,
): THREE.BoxGeometry {
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const uvAttr = geometry.attributes.uv;
  if (!posAttr || !normAttr || !uvAttr) return geometry;

  for (let i = 0; i < posAttr.count; i++) {
    const wx = posAttr.getX(i) + worldX;
    const wy = posAttr.getY(i) + worldY;
    const wz = posAttr.getZ(i) + worldZ;
    const nx = Math.abs(normAttr.getX(i));
    const ny = Math.abs(normAttr.getY(i));

    if (ny > 0.5) {
      uvAttr.setXY(i, wx / tileSize, -wz / tileSize);
    } else if (nx > 0.5) {
      uvAttr.setXY(i, wz / tileSize, wy / tileSize);
    } else {
      uvAttr.setXY(i, wx / tileSize, wy / tileSize);
    }
  }
  uvAttr.needsUpdate = true;
  return geometry;
}

/**
 * Rewrites a BoxGeometry's UVs in uniform local world-scale units (for rotated props/walls).
 */
export function applyLocalBoxUVs(
  geometry: THREE.BoxGeometry,
  tileSize: number,
): THREE.BoxGeometry {
  return applyWorldSpaceBoxUVs(geometry, 0, 0, 0, tileSize);
}

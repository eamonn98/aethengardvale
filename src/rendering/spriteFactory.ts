import * as THREE from "three";

export type SpriteMesh = THREE.Mesh<
  THREE.PlaneGeometry,
  THREE.MeshStandardMaterial
>;

/**
 * Creates a shadow-casting 2D billboard quad in 3D space with binary alpha cutouts.
 */
export function createSpriteMesh(
  texture: THREE.Texture,
  w: number,
  h: number,
): SpriteMesh {
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.88,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

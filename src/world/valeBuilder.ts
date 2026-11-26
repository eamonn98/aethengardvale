import * as THREE from "three";
import type { EnvironmentTextures } from "../assets/environmentTextures.ts";
import { SEEDS, WORLD_UV_SCALES } from "../config/constants.ts";
import {
  BRAZIER_SPOTS,
  BUSH_SPOTS,
  CHEST_SPOT,
  CRATE_SPOTS,
  FOREGROUND_TREE_XS,
  HILL_SPOTS,
  PATH_SEGMENTS,
  TABLE_SPOTS,
  TREE_SPOTS,
} from "../config/worldLayout.ts";
import { mulberry32 } from "../core/prng.ts";
import type { CircleObstacle } from "../core/types.ts";
import { createReliefStandardMaterial } from "../rendering/reliefMaterial.ts";
import { applyWorldSpaceBoxUVs } from "./geometryUtils.ts";
import {
  buildBridge,
  buildSanctuaryRotunda,
  type ChestProp,
  createBrazier,
  createBush,
  createChest,
  createCrate,
  createDistantHills,
  createTable,
  createTree,
  type TorchProp,
} from "./props.ts";

export interface WorldInstance {
  obstacles: CircleObstacle[];
  torches: TorchProp[];
  chest: ChestProp;
}

export function buildValeWorld(
  scene: THREE.Scene,
  envTex: EnvironmentTextures,
): WorldInstance {
  const rng = mulberry32(SEEDS.WORLD_VALE);
  const obstacles: CircleObstacle[] = [];
  const torches: TorchProp[] = [];

  const grassMat = createReliefStandardMaterial({
    map: envTex.grassMap,
    normalMap: envTex.grassNormal,
    normalScale: 0.7,
    roughnessMap: envTex.grassRoughness,
    heightMap: envTex.grassHeight,
    parallaxScale: 0.012,
    reliefAO: 0.14,
    metalness: 0.02,
  });

  const southGrass = new THREE.Mesh(
    applyWorldSpaceBoxUVs(
      new THREE.BoxGeometry(56, 2, 23),
      0,
      -1,
      14.7,
      WORLD_UV_SCALES.grass,
    ),
    grassMat,
  );
  southGrass.position.set(0, -1, 14.7);
  southGrass.receiveShadow = true;
  scene.add(southGrass);

  const northGrass = new THREE.Mesh(
    applyWorldSpaceBoxUVs(
      new THREE.BoxGeometry(56, 2, 25),
      0,
      -1,
      -15.7,
      WORLD_UV_SCALES.grass,
    ),
    grassMat,
  );
  northGrass.position.set(0, -1, -15.7);
  northGrass.receiveShadow = true;
  scene.add(northGrass);

  const bankGeo = new THREE.BoxGeometry(56, 1.3, 1.2);
  const bankMat = new THREE.MeshStandardMaterial({
    color: "#3b4a22",
    roughness: 0.96,
  });
  const bankS = new THREE.Mesh(bankGeo, bankMat);
  bankS.position.set(0, -0.78, 3.05);
  bankS.rotation.x = 0.42;
  bankS.receiveShadow = true;
  scene.add(bankS);

  const bankN = new THREE.Mesh(bankGeo, bankMat);
  bankN.position.set(0, -0.78, -3.05);
  bankN.rotation.x = -0.42;
  bankN.receiveShadow = true;
  scene.add(bankN);

  const waterMat = new THREE.MeshStandardMaterial({
    map: envTex.waterMap,
    normalMap: envTex.waterNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    color: "#2d4b46",
    roughness: 0.14,
    metalness: 0.48,
  });
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(58, 7.6), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, -0.68, 0);
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);

  const cobbleMat = createReliefStandardMaterial({
    map: envTex.cobbleMap,
    normalMap: envTex.cobbleNormal,
    normalScale: 1.3,
    roughnessMap: envTex.cobbleRoughness,
    heightMap: envTex.cobbleHeight,
    parallaxScale: 0.032,
    reliefAO: 0.24,
    metalness: 0.08,
  });

  // Flush non-overlapping cobblestone segments with top surface at y = 0.04 (matching bridge ends)
  for (const seg of PATH_SEGMENTS) {
    const m = new THREE.Mesh(
      applyWorldSpaceBoxUVs(
        new THREE.BoxGeometry(seg.w, 0.08, seg.d),
        seg.x,
        0,
        seg.z,
        WORLD_UV_SCALES.cobble,
      ),
      cobbleMat,
    );
    m.position.set(seg.x, 0, seg.z);
    m.receiveShadow = true;
    scene.add(m);
  }

  const bridgeMat = createReliefStandardMaterial({
    map: envTex.cobbleMap,
    normalMap: envTex.cobbleNormal,
    normalScale: 1.35,
    roughnessMap: envTex.cobbleRoughness,
    heightMap: envTex.cobbleHeight,
    parallaxScale: 0.034,
    reliefAO: 0.24,
    metalness: 0.08,
  });

  const masonryMat = createReliefStandardMaterial({
    map: envTex.masonryMap,
    normalMap: envTex.masonryNormal,
    normalScale: 1.2,
    roughnessMap: envTex.masonryRoughness,
    heightMap: envTex.masonryHeight,
    parallaxScale: 0.026,
    reliefAO: 0.22,
    metalness: 0.06,
  });

  buildBridge(scene, bridgeMat, masonryMat);
  buildSanctuaryRotunda(scene, masonryMat, envTex.bannerMap, obstacles);

  for (const [bx, bz] of BRAZIER_SPOTS) {
    const { torch, obstacle } = createBrazier(
      scene,
      masonryMat,
      envTex,
      rng,
      bx,
      bz,
    );
    torches.push(torch);
    obstacles.push(obstacle);
  }

  const woodMat = createReliefStandardMaterial({
    map: envTex.woodMap,
    normalMap: envTex.woodNormal,
    normalScale: 0.9,
    roughnessMap: envTex.woodRoughness,
    heightMap: envTex.woodHeight,
    parallaxScale: 0.016,
    reliefAO: 0.18,
    metalness: 0.04,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: "#c4b89e",
    roughness: 0.42,
    metalness: 0.72,
  });

  for (const [tx, tz] of TABLE_SPOTS) {
    obstacles.push(createTable(scene, woodMat, tx, tz));
  }

  for (const [cx, cz, scale] of CRATE_SPOTS) {
    obstacles.push(createCrate(scene, woodMat, rng, cx, cz, scale));
  }

  const { chest, obstacle: chestObs } = createChest(
    scene,
    woodMat,
    trimMat,
    CHEST_SPOT.x,
    CHEST_SPOT.z,
  );
  obstacles.push(chestObs);

  const treeMat = new THREE.MeshStandardMaterial({
    map: envTex.treeMap,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.92,
  });
  const bushMat = new THREE.MeshStandardMaterial({
    map: envTex.bushMap,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.92,
  });

  for (const [x, z, s, collide = true] of TREE_SPOTS) {
    const obs = createTree(scene, treeMat, x, z, s, collide);
    if (obs) obstacles.push(obs);
  }

  // Foreground blurred framing silhouettes
  for (const fx of FOREGROUND_TREE_XS) {
    createTree(scene, treeMat, fx, 18.2, 1.25, false);
  }

  for (const [bx, bz] of BUSH_SPOTS) {
    createBush(scene, bushMat, bx, bz, 0.85 + rng() * 0.45);
  }

  createDistantHills(scene, HILL_SPOTS);

  return { obstacles, torches, chest };
}

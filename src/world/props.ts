import * as THREE from "three";
import type { EnvironmentTextures } from "../assets/environmentTextures.ts";
import {
  BRIDGE_HALF_X,
  BRIDGE_HALF_Z,
  WORLD_UV_SCALES,
} from "../config/constants.ts";
import type { Rng } from "../core/prng.ts";
import type { CircleObstacle } from "../core/types.ts";
import { applyLocalBoxUVs } from "./geometryUtils.ts";
import { getBridgeHeight, getTerrainHeight } from "./terrain.ts";

export interface TorchProp {
  light: THREE.PointLight;
  flameMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  baseIntensity: number;
  phase: number;
  pos: THREE.Vector3;
}

export interface ChestProp {
  group: THREE.Group;
  lidPivot: THREE.Group;
  glow: THREE.PointLight;
  x: number;
  z: number;
  opened: boolean;
}

export function buildBridge(
  scene: THREE.Scene,
  bridgeMat: THREE.MeshStandardMaterial,
  masonryMat: THREE.MeshStandardMaterial,
): void {
  const deckGeo = new THREE.PlaneGeometry(
    BRIDGE_HALF_X * 2,
    BRIDGE_HALF_Z * 2,
    4,
    22,
  );
  deckGeo.rotateX(-Math.PI / 2);
  const posAttr = deckGeo.attributes.position;
  const uvAttr = deckGeo.attributes.uv;
  if (posAttr) {
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, getBridgeHeight(z) + 0.04);
      if (uvAttr) {
        // Linear world-space UV projection so bridge cobbles match both approaches seamlessly
        uvAttr.setXY(i, x / WORLD_UV_SCALES.cobble, -z / WORLD_UV_SCALES.cobble);
      }
    }
  }
  if (uvAttr) uvAttr.needsUpdate = true;
  deckGeo.computeVertexNormals();

  const bridgeDeck = new THREE.Mesh(deckGeo, bridgeMat);
  bridgeDeck.receiveShadow = true;
  bridgeDeck.castShadow = true;
  scene.add(bridgeDeck);

  // Dark underside arch shadow under the bridge deck
  const underDeckMat = new THREE.MeshStandardMaterial({
    color: "#1b1613",
    roughness: 1,
    side: THREE.BackSide,
  });
  const underDeck = new THREE.Mesh(deckGeo, underDeckMat);
  underDeck.position.y = -0.18;
  scene.add(underDeck);

  for (const side of [-1, 1] as const) {
    const sx = side * (BRIDGE_HALF_X + 0.22);
    for (let i = 0; i < 16; i++) {
      const z0 = -BRIDGE_HALF_Z + (i / 16) * (BRIDGE_HALF_Z * 2);
      const z1 = -BRIDGE_HALF_Z + ((i + 1) / 16) * (BRIDGE_HALF_Z * 2);
      const zm = (z0 + z1) * 0.5;
      const hm = getBridgeHeight(zm);
      const slope = Math.atan2(getBridgeHeight(z1) - getBridgeHeight(z0), z1 - z0);

      const parapet = new THREE.Mesh(
        applyLocalBoxUVs(
          new THREE.BoxGeometry(0.45, 0.72, (BRIDGE_HALF_Z * 2) / 16 + 0.08),
          WORLD_UV_SCALES.masonry,
        ),
        masonryMat,
      );
      parapet.position.set(sx, hm + 0.28, zm);
      parapet.rotation.x = -slope;
      parapet.castShadow = true;
      parapet.receiveShadow = true;
      scene.add(parapet);

      if (Math.abs(zm) > 1.75) {
        const pillarH = hm + 1.05;
        const spandrel = new THREE.Mesh(
          applyLocalBoxUVs(
            new THREE.BoxGeometry(0.5, pillarH, 0.7),
            WORLD_UV_SCALES.masonry,
          ),
          masonryMat,
        );
        spandrel.position.set(sx, hm - pillarH * 0.5, zm);
        spandrel.castShadow = true;
        spandrel.receiveShadow = true;
        scene.add(spandrel);
      }
    }
  }
}

export function buildSanctuaryRotunda(
  scene: THREE.Scene,
  masonryMat: THREE.MeshStandardMaterial,
  bannerMap: THREE.Texture,
  obstacles: CircleObstacle[],
): void {
  const rotundaGroup = new THREE.Group();
  rotundaGroup.position.set(0, 0, -16.8);
  scene.add(rotundaGroup);

  const wallRadius = 6.8;
  const sides = 9;
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI * 0.1 + (i / (sides - 1)) * Math.PI * 1.2;
    const wx = Math.cos(a) * wallRadius;
    const wz = Math.sin(a) * wallRadius * 0.65;
    const rotY = Math.atan2(wx, wz);
    const isCenterGate = i === 4;

    if (!isCenterGate) {
      const wall = new THREE.Mesh(
        applyLocalBoxUVs(
          new THREE.BoxGeometry(2.85, 5.4, 0.9),
          WORLD_UV_SCALES.masonry,
        ),
        masonryMat,
      );
      wall.position.set(wx, 2.7, wz);
      wall.rotation.y = rotY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      rotundaGroup.add(wall);
    } else {
      const topGate = new THREE.Mesh(
        applyLocalBoxUVs(
          new THREE.BoxGeometry(3.2, 2.5, 1.0),
          WORLD_UV_SCALES.masonry,
        ),
        masonryMat,
      );
      topGate.position.set(wx, 4.15, wz);
      topGate.castShadow = true;
      topGate.receiveShadow = true;
      rotundaGroup.add(topGate);

      const doorway = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 3.0, 0.7),
        new THREE.MeshStandardMaterial({
          color: "#14110f",
          roughness: 1,
        }),
      );
      doorway.position.set(wx, 1.5, wz - 0.15);
      rotundaGroup.add(doorway);
    }

    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 5.8, 8),
      masonryMat,
    );
    col.position.set(wx * 1.03, 2.9, wz * 1.03);
    col.castShadow = true;
    col.receiveShadow = true;
    rotundaGroup.add(col);

    if (i === 2 || i === 4 || i === 6) {
      const bannerMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 2.85),
        new THREE.MeshStandardMaterial({
          map: bannerMap,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
          roughness: 0.85,
        }),
      );
      bannerMesh.position.set(
        wx + Math.sin(rotY) * 0.62,
        4.05,
        wz + Math.cos(rotY) * 0.62,
      );
      bannerMesh.rotation.y = rotY;
      bannerMesh.castShadow = true;
      rotundaGroup.add(bannerMesh);
    }

    if (i >= 1 && i <= 7) {
      obstacles.push({ x: wx, z: -16.8 + wz, r: 1.35 });
    }
  }

  const crown = new THREE.Mesh(
    new THREE.TorusGeometry(wallRadius * 0.88, 0.42, 6, 14),
    masonryMat,
  );
  crown.rotation.x = Math.PI / 2;
  crown.scale.set(1, 0.65, 1);
  crown.position.set(0, 5.75, 0.2);
  crown.castShadow = true;
  rotundaGroup.add(crown);
}

export function createBrazier(
  scene: THREE.Scene,
  masonryMat: THREE.MeshStandardMaterial,
  envTex: EnvironmentTextures,
  rng: Rng,
  x: number,
  z: number,
  yOffset = 0,
): { torch: TorchProp; obstacle: CircleObstacle } {
  const g = new THREE.Group();
  const y = getTerrainHeight(x, z) + yOffset;
  g.position.set(x, y, z);

  const ped = new THREE.Mesh(
    applyLocalBoxUVs(
      new THREE.BoxGeometry(0.68, 0.95, 0.68),
      WORLD_UV_SCALES.masonry,
    ),
    masonryMat,
  );
  ped.position.y = 0.475;
  ped.castShadow = true;
  ped.receiveShadow = true;
  g.add(ped);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.22, 0.34, 8),
    new THREE.MeshStandardMaterial({
      color: "#2b2522",
      roughness: 0.55,
      metalness: 0.72,
    }),
  );
  bowl.position.y = 1.1;
  bowl.castShadow = true;
  g.add(bowl);

  const coal = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 6, 6),
    new THREE.MeshBasicMaterial({ color: "#ff942e" }),
  );
  coal.position.y = 1.2;
  g.add(coal);

  const flameMat = new THREE.MeshBasicMaterial({
    map: envTex.flameTextures[0] ?? null,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flameMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 1.15),
    flameMat,
  );
  flameMesh.position.y = 1.62;
  g.add(flameMesh);

  const light = new THREE.PointLight("#ff9a3c", 4.2, 11.5, 1.6);
  light.position.set(0, 1.85, 0);
  g.add(light);

  scene.add(g);

  return {
    torch: {
      light,
      flameMesh,
      baseIntensity: 4.2,
      phase: rng() * Math.PI * 2,
      pos: new THREE.Vector3(x, y + 1.55, z),
    },
    obstacle: { x, z, r: 0.55 },
  };
}

export function createTable(
  scene: THREE.Scene,
  woodMat: THREE.MeshStandardMaterial,
  x: number,
  z: number,
): CircleObstacle {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const top = new THREE.Mesh(
    applyLocalBoxUVs(new THREE.BoxGeometry(2.1, 0.16, 1.1), WORLD_UV_SCALES.wood),
    woodMat,
  );
  top.position.y = 0.72;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  for (const lx of [-0.85, 0.85]) {
    for (const lz of [-0.4, 0.4]) {
      const leg = new THREE.Mesh(
        applyLocalBoxUVs(
          new THREE.BoxGeometry(0.14, 0.7, 0.14),
          WORLD_UV_SCALES.wood,
        ),
        woodMat,
      );
      leg.position.set(lx, 0.35, lz);
      leg.castShadow = true;
      g.add(leg);
    }
  }

  for (const sx of [-0.55, 0.55]) {
    const stool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.2, 0.42, 7),
      woodMat,
    );
    stool.position.set(sx, 0.21, 0.92);
    stool.castShadow = true;
    g.add(stool);
  }

  scene.add(g);
  return { x, z, r: 1.15 };
}

export function createCrate(
  scene: THREE.Scene,
  woodMat: THREE.MeshStandardMaterial,
  rng: Rng,
  x: number,
  z: number,
  scale = 1,
): CircleObstacle {
  const m = new THREE.Mesh(
    applyLocalBoxUVs(
      new THREE.BoxGeometry(0.9 * scale, 0.9 * scale, 0.9 * scale),
      WORLD_UV_SCALES.wood,
    ),
    woodMat,
  );
  m.position.set(x, 0.45 * scale, z);
  m.rotation.y = (rng() - 0.5) * 0.35;
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return { x, z, r: 0.55 * scale };
}

export function createChest(
  scene: THREE.Scene,
  woodMat: THREE.MeshStandardMaterial,
  trimMat: THREE.MeshStandardMaterial,
  x: number,
  z: number,
): { chest: ChestProp; obstacle: CircleObstacle } {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const body = new THREE.Mesh(
    applyLocalBoxUVs(new THREE.BoxGeometry(1.15, 0.65, 0.78), WORLD_UV_SCALES.wood),
    woodMat,
  );
  body.position.y = 0.325;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.65, -0.39);
  const lid = new THREE.Mesh(
    applyLocalBoxUVs(new THREE.BoxGeometry(1.18, 0.28, 0.8), WORLD_UV_SCALES.wood),
    woodMat,
  );
  lid.position.set(0, 0.14, 0.39);
  lid.castShadow = true;

  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.08), trimMat);
  clasp.position.set(0, 0.05, 0.8);
  lidPivot.add(lid, clasp);
  g.add(lidPivot);

  const glow = new THREE.PointLight("#ffd86b", 1.8, 4.5);
  glow.position.set(0, 1.0, 0);
  g.add(glow);

  scene.add(g);

  return {
    chest: {
      group: g,
      lidPivot,
      glow,
      x,
      z,
      opened: false,
    },
    obstacle: { x, z, r: 0.75 },
  };
}

export function createTree(
  scene: THREE.Scene,
  treeMat: THREE.MeshStandardMaterial,
  x: number,
  z: number,
  scale = 1.0,
  collide = true,
): CircleObstacle | null {
  const h = 4.6 * scale;
  const w = 2.9 * scale;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), treeMat);
  mesh.position.set(x, h * 0.48, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return collide ? { x, z, r: 0.75 * scale } : null;
}

export function createBush(
  scene: THREE.Scene,
  bushMat: THREE.MeshStandardMaterial,
  x: number,
  z: number,
  scale = 1.0,
): void {
  const h = 1.15 * scale;
  const w = 1.65 * scale;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bushMat);
  mesh.position.set(x, h * 0.46, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

export function createDistantHills(
  scene: THREE.Scene,
  hills: readonly [number, number, number, number][],
): void {
  const hillMat = new THREE.MeshStandardMaterial({
    color: "#2b3b28",
    roughness: 1.0,
  });
  for (const [x, z, r, h] of hills) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), hillMat);
    hill.position.set(x, h * 0.4 - 1.5, z);
    scene.add(hill);
  }
}

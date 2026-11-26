import * as THREE from "three";
import type { SoundEngine } from "../audio/soundEngine.ts";
import type { EnvironmentTextures } from "../assets/environmentTextures.ts";
import type { PickupType } from "../core/types.ts";
import type { FloatingTextLayer } from "../ui/floatingText.ts";
import { getTerrainHeight } from "../world/terrain.ts";
import {
  pickupBobY,
  pickupGlintFrame,
  pickupTilt,
} from "./pickupAnimation.ts";
import type { PlayerController } from "./player.ts";

export interface PickupEntity {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  x: number;
  z: number;
  baseY: number;
  type: PickupType;
  age: number;
}

interface PickupStyle {
  geo: THREE.PlaneGeometry;
  baseMat: THREE.MeshStandardMaterial;
  glintMat: THREE.MeshStandardMaterial;
}

function createPickupMaterial(
  map: THREE.Texture,
  emissive: string,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.88,
    metalness: 0.05,
    emissive,
    emissiveIntensity: 0.35,
  });
}

/**
 * Manages pixel-art gold and heart drops with shared geometry/materials and a two-frame glint.
 */
export class PickupManager {
  readonly pickups: PickupEntity[] = [];
  private readonly scene: THREE.Scene;
  private readonly styles: Record<PickupType, PickupStyle>;

  constructor(
    scene: THREE.Scene,
    textures: EnvironmentTextures,
  ) {
    this.scene = scene;
    this.styles = {
      gold: {
        geo: new THREE.PlaneGeometry(0.42, 0.42),
        baseMat: createPickupMaterial(textures.coinMap, "#4a3208"),
        glintMat: createPickupMaterial(textures.coinGlintMap, "#4a3208"),
      },
      heart: {
        geo: new THREE.PlaneGeometry(0.46, 0.46),
        baseMat: createPickupMaterial(textures.heartMap, "#3d0a12"),
        glintMat: createPickupMaterial(textures.heartGlintMap, "#3d0a12"),
      },
    };
  }

  spawn(x: number, z: number, type: PickupType = "gold"): void {
    const style = this.styles[type];
    const mesh = new THREE.Mesh(style.geo, style.baseMat);
    const y = getTerrainHeight(x, z) + 0.45;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.pickups.push({ mesh, x, z, baseY: y, type, age: 0 });
  }

  update(
    dt: number,
    player: PlayerController,
    sfx: SoundEngine,
    floatingText: FloatingTextLayer,
    onCollected: () => void,
  ): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (!p) continue;
      p.age += dt;
      const style = this.styles[p.type];
      const mat = pickupGlintFrame(p.age) ? style.glintMat : style.baseMat;
      if (p.mesh.material !== mat) p.mesh.material = mat;
      p.mesh.rotation.z = pickupTilt(p.age);
      p.mesh.position.y = p.baseY + pickupBobY(p.age);

      if (player.alive && Math.hypot(player.x - p.x, player.z - p.z) < 1.05) {
        sfx.playPickup();
        if (p.type === "heart") {
          const heal = Math.min(player.maxHp - player.hp, 12);
          player.hp += heal;
          floatingText.spawn(p.mesh.position, `+${heal} HP`, "#ff8a95");
        } else {
          const amt = 8 + Math.floor(Math.random() * 7);
          player.gold += amt;
          floatingText.spawn(p.mesh.position, `+${amt}G`, "#ffe066");
        }
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
        onCollected();
      }
    }
  }

  clear(): void {
    for (const p of this.pickups) {
      this.scene.remove(p.mesh);
    }
    this.pickups.length = 0;
  }

  dispose(): void {
    this.clear();
    for (const style of Object.values(this.styles)) {
      style.geo.dispose();
      style.baseMat.dispose();
      style.glintMat.dispose();
    }
  }
}

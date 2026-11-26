import * as THREE from "three";
import type { SoundEngine } from "../audio/soundEngine.ts";
import type { PickupType } from "../core/types.ts";
import type { FloatingTextLayer } from "../ui/floatingText.ts";
import { getTerrainHeight } from "../world/terrain.ts";
import type { PlayerController } from "./player.ts";

export interface PickupEntity {
  mesh: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshBasicMaterial>;
  x: number;
  z: number;
  baseY: number;
  type: PickupType;
  age: number;
}

/**
 * Manages gold and heart drops with shared geometry/materials.
 */
export class PickupManager {
  readonly pickups: PickupEntity[] = [];
  private readonly scene: THREE.Scene;
  private readonly geo = new THREE.OctahedronGeometry(0.24, 0);
  private readonly goldMat = new THREE.MeshBasicMaterial({ color: "#ffd852" });
  private readonly heartMat = new THREE.MeshBasicMaterial({ color: "#ff5768" });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(x: number, z: number, type: PickupType = "gold"): void {
    const mat = type === "heart" ? this.heartMat : this.goldMat;
    const mesh = new THREE.Mesh(this.geo, mat);
    const y = getTerrainHeight(x, z) + 0.45;
    mesh.position.set(x, y, z);
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
      p.mesh.rotation.y += dt * 3.0;
      p.mesh.position.y = p.baseY + Math.sin(p.age * 5) * 0.14;

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
    this.geo.dispose();
    this.goldMat.dispose();
    this.heartMat.dispose();
  }
}

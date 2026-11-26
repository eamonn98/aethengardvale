import * as THREE from "three";
import type { SlimeSpriteSet } from "../assets/characterSprites.ts";
import type { SoundEngine } from "../audio/soundEngine.ts";
import { COMBAT_CONFIG } from "../config/constants.ts";
import {
  INITIAL_SLIME_SPAWNS,
  SLIME_TIERS,
  type SlimeTierConfig,
} from "../config/enemies.ts";
import type { CircleObstacle, SlimeTier } from "../core/types.ts";
import type { CameraController } from "../rendering/cameraController.ts";
import { createSpriteMesh, type SpriteMesh } from "../rendering/spriteFactory.ts";
import type { FloatingTextLayer } from "../ui/floatingText.ts";
import { resolveMovement } from "../world/collision.ts";
import { getTerrainHeight } from "../world/terrain.ts";
import type { ParticleSystem } from "./particles.ts";
import type { PlayerController } from "./player.ts";

export interface SlimeEntity {
  tier: SlimeTier;
  cfg: SlimeTierConfig;
  texSet: SlimeSpriteSet;
  mesh: SpriteMesh;
  w: number;
  h: number;
  x: number;
  z: number;
  y: number;
  hopY: number;
  hopVy: number;
  vx: number;
  vz: number;
  kbX: number;
  kbZ: number;
  hp: number;
  maxHp: number;
  hopTimer: number;
  animTimer: number;
  flashTimer: number;
  homeX: number;
  homeZ: number;
  radius: number;
}

export interface EnemyUpdateCallbacks {
  sfx: SoundEngine;
  particles: ParticleSystem;
  floatingText: FloatingTextLayer;
  cameraController: CameraController;
  onPlayerDamaged: () => void;
  onPlayerDied: () => void;
  onKingBossSpawned: () => void;
}

/**
 * Manages slime enemies, squash-and-stretch hop AI, wave respawning, and King Slime boss trigger.
 */
export class EnemyManager {
  readonly slimes: SlimeEntity[] = [];
  kingSpawned = false;
  private waveCheckTimer = 0;
  private readonly scene: THREE.Scene;
  private readonly slimeSprites: Record<SlimeTier, SlimeSpriteSet>;

  constructor(
    scene: THREE.Scene,
    slimeSprites: Record<SlimeTier, SlimeSpriteSet>,
  ) {
    this.scene = scene;
    this.slimeSprites = slimeSprites;
  }

  spawnSlime(tierKey: SlimeTier, x: number, z: number): SlimeEntity {
    const cfg = SLIME_TIERS[tierKey];
    const texSet = this.slimeSprites[tierKey];
    const w = 1.22 * cfg.scale;
    const h = 1.08 * cfg.scale;
    const mesh = createSpriteMesh(texSet.idle1, w, h);
    const baseY = getTerrainHeight(x, z);
    mesh.position.set(x, baseY + h * 0.48, z);
    this.scene.add(mesh);

    const entity: SlimeEntity = {
      tier: tierKey,
      cfg,
      texSet,
      mesh,
      w,
      h,
      x,
      z,
      y: baseY,
      hopY: 0,
      hopVy: 0,
      vx: 0,
      vz: 0,
      kbX: 0,
      kbZ: 0,
      hp: cfg.hp,
      maxHp: cfg.hp,
      hopTimer: 0.4 + Math.random() * cfg.hopInterval,
      animTimer: Math.random() * 5,
      flashTimer: 0,
      homeX: x,
      homeZ: z,
      radius: 0.56 * cfg.scale,
    };
    this.slimes.push(entity);
    return entity;
  }

  removeSlimeAt(idx: number): SlimeEntity | null {
    const s = this.slimes[idx];
    if (!s) return null;
    this.scene.remove(s.mesh);
    s.mesh.geometry.dispose();
    s.mesh.material.dispose();
    this.slimes.splice(idx, 1);
    return s;
  }

  clear(): void {
    for (const s of this.slimes) {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
    }
    this.slimes.length = 0;
    this.kingSpawned = false;
    this.waveCheckTimer = 0;
  }

  spawnInitial(): void {
    this.clear();
    for (const pt of INITIAL_SLIME_SPAWNS) {
      this.spawnSlime(pt.tier, pt.x, pt.z);
    }
  }

  update(
    dt: number,
    player: PlayerController,
    obstacles: readonly CircleObstacle[],
    cb: EnemyUpdateCallbacks,
  ): void {
    for (const s of this.slimes) {
      s.animTimer += dt;
      s.flashTimer = Math.max(0, s.flashTimer - dt);

      const dxP = player.x - s.x;
      const dzP = player.z - s.z;
      const distP = Math.hypot(dxP, dzP);

      if (s.hopY <= 0.001) {
        s.hopTimer -= dt;
        s.vx *= Math.pow(0.08, dt);
        s.vz *= Math.pow(0.08, dt);
        if (s.hopTimer <= 0) {
          s.hopTimer = s.cfg.hopInterval * (0.75 + Math.random() * 0.5);
          s.hopVy = s.tier === "king" ? 5.6 : 4.6;
          if (player.alive && distP < 9.5) {
            const ang = Math.atan2(dzP, dxP) + (Math.random() - 0.5) * 0.35;
            s.vx = Math.cos(ang) * s.cfg.speed * 1.45;
            s.vz = Math.sin(ang) * s.cfg.speed * 1.45;
          } else {
            const ang =
              Math.atan2(s.homeZ - s.z, s.homeX - s.x) +
              (Math.random() - 0.5) * 2.2;
            s.vx = Math.cos(ang) * s.cfg.speed * 0.75;
            s.vz = Math.sin(ang) * s.cfg.speed * 0.75;
          }
        }
      }

      if (s.hopY > 0 || s.hopVy > 0) {
        s.hopY += s.hopVy * dt;
        s.hopVy -= 15.5 * dt;
        if (s.hopY <= 0) {
          s.hopY = 0;
          s.hopVy = 0;
        }
      }

      const moveX = (s.vx + s.kbX) * dt;
      const moveZ = (s.vz + s.kbZ) * dt;
      s.kbX *= Math.pow(0.015, dt);
      s.kbZ *= Math.pow(0.015, dt);

      const next = resolveMovement(
        s,
        s.x + moveX,
        s.z + moveZ,
        obstacles,
        s.radius,
      );
      s.x = next.x;
      s.z = next.z;
      s.y = getTerrainHeight(s.x, s.z);

      let sx = 1;
      let sy = 1;
      if (s.hopY > 0.08) {
        s.mesh.material.map = s.texSet.hop;
        sx = 0.86;
        sy = 1.18;
      } else {
        const squish = Math.sin(s.animTimer * 5.2);
        s.mesh.material.map = squish > 0 ? s.texSet.idle1 : s.texSet.idle2;
        sx = 1 + squish * 0.07;
        sy = 1 - squish * 0.06;
      }
      s.mesh.scale.set(sx, sy, 1);
      s.mesh.position.set(s.x, s.y + s.h * 0.46 * sy + s.hopY, s.z);

      if (s.flashTimer > 0) {
        s.mesh.material.emissive.set("#ffffff");
        s.mesh.material.emissiveIntensity = 0.85;
      } else {
        s.mesh.material.emissive.set("#000000");
        s.mesh.material.emissiveIntensity = 0;
      }

      if (
        player.alive &&
        player.invulnTimer <= 0 &&
        distP < s.radius + 0.45 &&
        s.hopY < 0.9
      ) {
        player.hp -= s.cfg.atk;
        player.invulnTimer = 0.95;
        cb.cameraController.addShake(0.3);
        cb.sfx.playPlayerHurt();
        cb.floatingText.spawn(
          new THREE.Vector3(player.x, player.y + 0.5, player.z),
          `-${s.cfg.atk}`,
          "#ff6961",
          true,
        );
        cb.onPlayerDamaged();

        if (player.hp <= 0) {
          player.alive = false;
          player.mesh.visible = false;
          cb.particles.spawnBurst(
            new THREE.Vector3(player.x, player.y + 0.7, player.z),
            "#8fc7ff",
            22,
            4.5,
          );
          cb.onPlayerDied();
        }
      }
    }

    this.waveCheckTimer += dt;
    if (this.waveCheckTimer > 2.2) {
      this.waveCheckTimer = 0;
      if (
        !this.kingSpawned &&
        player.slimesDefeated >= COMBAT_CONFIG.bossKillThreshold
      ) {
        this.kingSpawned = true;
        this.spawnSlime("king", 0, -9.8);
        cb.sfx.playFanfare();
        cb.onKingBossSpawned();
      } else if (this.slimes.length < 5) {
        const south = Math.random() < 0.5;
        const rx = (Math.random() - 0.5) * 20;
        const rz = south
          ? 5.5 + Math.random() * 7
          : -6.0 - Math.random() * 6;
        const tier: SlimeTier = south
          ? Math.random() < 0.65
            ? "green"
            : "blue"
          : Math.random() < 0.5
            ? "blue"
            : "red";
        this.spawnSlime(tier, rx, rz);
      }
    }
  }
}

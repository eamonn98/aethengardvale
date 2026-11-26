import * as THREE from "three";
import {
  composeHeroSpriteSet,
  disposeHeroSpriteSet,
} from "../assets/characterComposer.ts";
import type { HeroSpriteSet } from "../assets/characterSprites.ts";
import type { SoundEngine } from "../audio/soundEngine.ts";
import {
  type CharacterAppearance,
  DEFAULT_ALDEN_APPEARANCE,
} from "../config/characterAppearance.ts";
import { PLAYER_DEFAULTS } from "../config/constants.ts";
import type { InputManager } from "../core/input.ts";
import type {
  CircleObstacle,
  PlayerStatsSnapshot,
  SpriteDir,
} from "../core/types.ts";
import { createSpriteMesh, type SpriteMesh } from "../rendering/spriteFactory.ts";
import { resolveMovement } from "../world/collision.ts";
import { getTerrainHeight, isOnCobble } from "../world/terrain.ts";
import type { ParticleSystem } from "./particles.ts";

/**
 * Encapsulates player state, 8-way movement, dodge dash, and crescent sword slash.
 */
export class PlayerController {
  x: number = PLAYER_DEFAULTS.startX;
  z: number = PLAYER_DEFAULTS.startZ;
  y = 0;
  dirX = 0;
  dirZ = -1;
  spriteDir: SpriteDir = "up";
  speed: number = PLAYER_DEFAULTS.speed;
  hp: number = PLAYER_DEFAULTS.hp;
  maxHp: number = PLAYER_DEFAULTS.hp;
  lvl: number = PLAYER_DEFAULTS.lvl;
  xp: number = PLAYER_DEFAULTS.xp;
  xpNext: number = PLAYER_DEFAULTS.xpNext;
  atk: number = PLAYER_DEFAULTS.atk;
  gold = 0;
  slimesDefeated = 0;

  walkTimer = 0;
  stepTimer = 0;
  atkTimer = 0;
  atkCooldown = 0;
  readonly atkHasHit = new Set<object>();

  dashTimer = 0;
  dashCooldown = 0;
  dashDirX = 0;
  dashDirZ = -1;
  invulnTimer = 0;
  alive = true;

  readonly mesh: SpriteMesh;
  readonly slashMesh: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  >;
  private heroSprites: HeroSpriteSet;
  private appearance: CharacterAppearance = { ...DEFAULT_ALDEN_APPEARANCE };

  constructor(
    scene: THREE.Scene,
    heroSprites: HeroSpriteSet,
    slashTexture: THREE.Texture,
    appearance: CharacterAppearance = DEFAULT_ALDEN_APPEARANCE,
  ) {
    this.heroSprites = heroSprites;
    this.appearance = { ...appearance };
    this.mesh = createSpriteMesh(heroSprites.up.idle, 1.5, 2.0);
    this.mesh.position.set(this.x, 0.96, this.z);
    scene.add(this.mesh);

    const slashMat = new THREE.MeshBasicMaterial({
      map: slashTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.slashMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      slashMat,
    );
    this.slashMesh.rotation.x = -Math.PI / 2;
    this.slashMesh.visible = false;
    scene.add(this.slashMesh);
  }

  getStatsSnapshot(): PlayerStatsSnapshot {
    return {
      lvl: this.lvl,
      hp: this.hp,
      maxHp: this.maxHp,
      xp: this.xp,
      xpNext: this.xpNext,
      atk: this.atk,
      gold: this.gold,
      slimesDefeated: this.slimesDefeated,
    };
  }

  getAppearance(): CharacterAppearance {
    return { ...this.appearance };
  }

  setAppearance(next: CharacterAppearance): HTMLCanvasElement {
    const prev = this.heroSprites;
    this.appearance = { ...next };
    this.heroSprites = composeHeroSpriteSet(this.appearance);
    this.mesh.material.map = this.heroSprites[this.spriteDir].idle;
    this.mesh.material.needsUpdate = true;
    disposeHeroSpriteSet(prev);
    return this.heroSprites.portraitCanvas;
  }

  reset(): void {
    this.x = PLAYER_DEFAULTS.startX;
    this.z = PLAYER_DEFAULTS.startZ;
    this.y = 0;
    this.dirX = 0;
    this.dirZ = -1;
    this.spriteDir = "up";
    this.hp = PLAYER_DEFAULTS.hp;
    this.maxHp = PLAYER_DEFAULTS.hp;
    this.lvl = PLAYER_DEFAULTS.lvl;
    this.xp = PLAYER_DEFAULTS.xp;
    this.xpNext = PLAYER_DEFAULTS.xpNext;
    this.atk = PLAYER_DEFAULTS.atk;
    this.gold = 0;
    this.slimesDefeated = 0;
    this.walkTimer = 0;
    this.stepTimer = 0;
    this.invulnTimer = 0;
    this.atkTimer = 0;
    this.atkCooldown = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.atkHasHit.clear();
    this.alive = true;
    this.mesh.visible = true;
    this.mesh.material.color.set("#ffffff");
    this.mesh.material.map = this.heroSprites.up.idle;
    this.mesh.position.set(this.x, 0.96, this.z);
    this.slashMesh.visible = false;
  }

  triggerAttack(sfx: SoundEngine): boolean {
    if (!this.alive || this.atkCooldown > 0) return false;
    this.atkTimer = PLAYER_DEFAULTS.atkDuration;
    this.atkCooldown = PLAYER_DEFAULTS.atkCooldown;
    this.atkHasHit.clear();
    sfx.playSlash();

    const angle = Math.atan2(this.dirZ, this.dirX);
    this.slashMesh.visible = true;
    this.slashMesh.material.opacity = 0.95;
    this.slashMesh.rotation.z = -angle;
    return true;
  }

  triggerDash(sfx: SoundEngine, particles: ParticleSystem): boolean {
    if (!this.alive || this.dashCooldown > 0) return false;
    this.dashTimer = PLAYER_DEFAULTS.dashDuration;
    this.dashCooldown = PLAYER_DEFAULTS.dashCooldown;
    this.invulnTimer = Math.max(this.invulnTimer, PLAYER_DEFAULTS.dashInvuln);
    this.dashDirX = this.dirX;
    this.dashDirZ = this.dirZ;
    sfx.playDash();
    particles.spawnBurst(
      new THREE.Vector3(this.x, this.y + 0.5, this.z),
      "#c9e8ff",
      7,
      2.5,
    );
    return true;
  }

  update(
    dt: number,
    elapsed: number,
    input: InputManager,
    obstacles: readonly CircleObstacle[],
    sfx: SoundEngine,
    onActiveSlash: () => void,
  ): void {
    if (!this.alive) return;

    this.atkCooldown = Math.max(0, this.atkCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);

    const raw = input.getMoveVector();
    let ix = raw.x;
    let iz = raw.z;
    const moving = ix !== 0 || iz !== 0;

    if (moving) {
      const len = Math.hypot(ix, iz);
      ix /= len;
      iz /= len;
      if (this.atkTimer <= 0.06) {
        this.dirX = ix;
        this.dirZ = iz;
        if (Math.abs(ix) > Math.abs(iz) * 0.75) {
          this.spriteDir = ix > 0 ? "right" : "left";
        } else {
          this.spriteDir = iz > 0 ? "down" : "up";
        }
      }
    }

    let moveX = 0;
    let moveZ = 0;
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      moveX = this.dashDirX * PLAYER_DEFAULTS.dashSpeed;
      moveZ = this.dashDirZ * PLAYER_DEFAULTS.dashSpeed;
    } else if (moving) {
      const atkSlow = this.atkTimer > 0 ? 0.55 : 1.0;
      moveX = ix * this.speed * atkSlow;
      moveZ = iz * this.speed * atkSlow;
    }

    const next = resolveMovement(
      this,
      this.x + moveX * dt,
      this.z + moveZ * dt,
      obstacles,
      PLAYER_DEFAULTS.collisionRadius,
    );
    this.x = next.x;
    this.z = next.z;
    this.y = getTerrainHeight(this.x, this.z);

    const animSet = this.heroSprites[this.spriteDir];
    if (this.atkTimer > 0) {
      this.atkTimer -= dt;
      this.mesh.material.map = animSet.atk;

      const progress =
        1 - Math.max(0, this.atkTimer) / PLAYER_DEFAULTS.atkDuration;
      const slashDist = 1.15;
      this.slashMesh.position.set(
        this.x + this.dirX * slashDist,
        this.y + 0.75,
        this.z + this.dirZ * slashDist,
      );
      const baseAngle = Math.atan2(this.dirZ, this.dirX);
      this.slashMesh.rotation.z = -(baseAngle + (progress - 0.5) * 0.85);
      const s = 0.85 + Math.sin(progress * Math.PI) * 0.38;
      this.slashMesh.scale.set(s, s, 1);
      this.slashMesh.material.opacity = Math.sin(progress * Math.PI) * 0.95;

      if (progress > 0.12 && progress < 0.78) {
        onActiveSlash();
      }
      if (this.atkTimer <= 0) {
        this.slashMesh.visible = false;
      }
    } else if (moving) {
      this.walkTimer += dt * 9.5;
      const frame = Math.floor(this.walkTimer) % 4;
      this.mesh.material.map = animSet.walk[frame] ?? animSet.idle;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = PLAYER_DEFAULTS.stepInterval;
        sfx.playStep(isOnCobble(this.x, this.z));
      }
    } else {
      this.walkTimer = 0;
      this.mesh.material.map = animSet.idle;
    }

    if (this.invulnTimer > 0) {
      this.mesh.material.color.set(
        Math.floor(elapsed * 22) % 2 === 0 ? "#ff9c94" : "#ffffff",
      );
    } else {
      this.mesh.material.color.set("#ffffff");
    }

    const walkBob =
      moving && this.atkTimer <= 0
        ? Math.abs(Math.sin(this.walkTimer * Math.PI * 0.5)) * 0.08
        : 0;
    this.mesh.position.set(this.x, this.y + 0.96 + walkBob, this.z);
  }
}

import * as THREE from "three";
import { COMBAT_CONFIG } from "../config/constants.ts";
import type { Vec2 } from "../core/types.ts";
import type { SoundEngine } from "../audio/soundEngine.ts";
import type { CameraController } from "../rendering/cameraController.ts";
import type { FloatingTextLayer } from "../ui/floatingText.ts";
import type { EnemyManager, SlimeEntity } from "./enemies.ts";
import type { ParticleSystem } from "./particles.ts";
import type { PlayerController } from "./player.ts";

export interface ExperienceStats {
  lvl: number;
  xp: number;
  xpNext: number;
  maxHp: number;
  hp: number;
  atk: number;
}

export interface DamageRollResult {
  damage: number;
  crit: boolean;
}

export function isTargetInSwordArc(
  playerPos: Vec2,
  playerDir: Vec2,
  targetPos: Vec2,
  targetRadius: number,
  reach = COMBAT_CONFIG.swordReach,
): boolean {
  const dx = targetPos.x - playerPos.x;
  const dz = targetPos.z - playerPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > reach + targetRadius) return false;

  const dot = (dx * playerDir.x + dz * playerDir.z) / Math.max(0.001, dist);
  if (dot < 0.22 && dist > 0.95) return false;
  return true;
}

export function computeSwordDamage(
  atk: number,
  rng: () => number = Math.random,
): DamageRollResult {
  const crit = rng() < COMBAT_CONFIG.critChance;
  const variance = Math.floor(rng() * 4);
  const damage = Math.round(
    (atk + variance) * (crit ? COMBAT_CONFIG.critMultiplier : 1.0),
  );
  return { damage, crit };
}

/**
 * Applies gained XP and processes any resulting level-ups.
 * Returns the number of levels gained.
 */
export function applyExperienceGain(
  stats: ExperienceStats,
  gainedXp: number,
): number {
  stats.xp += gainedXp;
  let levelsGained = 0;
  while (stats.xp >= stats.xpNext) {
    stats.xp -= stats.xpNext;
    stats.lvl += 1;
    stats.xpNext = Math.round(stats.xpNext * COMBAT_CONFIG.xpLevelScale);
    stats.maxHp += COMBAT_CONFIG.levelUpHpGain;
    stats.hp = stats.maxHp;
    stats.atk += COMBAT_CONFIG.levelUpAtkGain;
    levelsGained += 1;
  }
  return levelsGained;
}

export interface SwordHitContext {
  player: PlayerController;
  enemies: EnemyManager;
  particles: ParticleSystem;
  floatingText: FloatingTextLayer;
  cameraController: CameraController;
  sfx: SoundEngine;
  onHitstop: (duration: number) => void;
  onDefeatSlime: (index: number, slime: SlimeEntity) => void;
}

export function resolveSwordHits(ctx: SwordHitContext): void {
  const { player, enemies } = ctx;
  const slimes = enemies.slimes;
  for (let i = slimes.length - 1; i >= 0; i--) {
    const s = slimes[i];
    if (!s || player.atkHasHit.has(s)) continue;

    if (
      !isTargetInSwordArc(
        { x: player.x, z: player.z },
        { x: player.dirX, z: player.dirZ },
        { x: s.x, z: s.z },
        s.radius,
      )
    ) {
      continue;
    }

    player.atkHasHit.add(s);
    const { damage, crit } = computeSwordDamage(player.atk);
    const dx = s.x - player.x;
    const dz = s.z - player.z;
    const dist = Math.hypot(dx, dz);

    s.hp -= damage;
    s.flashTimer = 0.14;
    const kbForce = s.tier === "king" ? 4.2 : 8.5;
    s.kbX = (dx / Math.max(0.01, dist)) * kbForce;
    s.kbZ = (dz / Math.max(0.01, dist)) * kbForce;
    s.hopVy = Math.max(s.hopVy, 2.4);

    ctx.onHitstop(
      crit ? COMBAT_CONFIG.critHitstop : COMBAT_CONFIG.normalHitstop,
    );
    ctx.cameraController.addShake(
      crit ? COMBAT_CONFIG.critShake : COMBAT_CONFIG.normalShake,
    );
    ctx.sfx.playHit(crit);
    ctx.particles.spawnBurst(
      new THREE.Vector3(s.x, s.y + 0.55, s.z),
      s.cfg.color,
      crit ? 12 : 7,
      4.4,
    );
    ctx.floatingText.spawn(
      new THREE.Vector3(s.x, s.y + 0.4, s.z),
      crit ? `${damage}!` : `${damage}`,
      crit ? "#ffe169" : "#ffffff",
      crit,
    );

    if (s.hp <= 0) {
      ctx.onDefeatSlime(i, s);
    }
  }
}

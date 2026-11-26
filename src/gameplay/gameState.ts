import * as THREE from "three";
import { buildCharacterSprites, type CharacterSprites } from "../assets/characterSprites.ts";
import {
  buildEnvironmentTextures,
  type EnvironmentTextures,
} from "../assets/environmentTextures.ts";
import { SoundEngine } from "../audio/soundEngine.ts";
import { DEFAULT_ALDEN_APPEARANCE } from "../config/characterAppearance.ts";
import { CHEST_SPOT } from "../config/worldLayout.ts";
import { EventBus } from "../core/events.ts";
import { InputManager } from "../core/input.ts";
import type { GameEvents } from "../core/types.ts";
import { CameraController } from "../rendering/cameraController.ts";
import { RenderPipeline } from "../rendering/renderPipeline.ts";
import { FloatingTextLayer } from "../ui/floatingText.ts";
import { HudController } from "../ui/hud.ts";
import { MinimapRenderer } from "../ui/minimap.ts";
import { buildValeWorld, type WorldInstance } from "../world/valeBuilder.ts";
import { applyExperienceGain, resolveSwordHits } from "./combat.ts";
import { EnemyManager, type SlimeEntity } from "./enemies.ts";
import { ParticleSystem } from "./particles.ts";
import { PickupManager } from "./pickups.ts";
import { PlayerController } from "./player.ts";

/**
 * Top-level game orchestrator wiring rendering, procedural assets, audio, world, gameplay, and HUD.
 */
export class GameApp {
  private readonly pipeline: RenderPipeline;
  private readonly cameraController = new CameraController();
  private readonly sfx = new SoundEngine();
  private readonly events = new EventBus<GameEvents>();
  private readonly envTex: EnvironmentTextures;
  private readonly charTex: CharacterSprites;
  private readonly world: WorldInstance;
  private readonly particles: ParticleSystem;
  private readonly player: PlayerController;
  private readonly enemies: EnemyManager;
  private readonly pickups: PickupManager;
  private readonly floatingText: FloatingTextLayer;
  private readonly minimap: MinimapRenderer;
  private readonly hud: HudController;
  private readonly input: InputManager;

  private readonly clock = new THREE.Clock();
  private gameStarted = false;
  private hitstopTimer = 0;
  private elapsed = 0;
  private rafId = 0;

  private readonly handleResize = (): void => {
    this.pipeline.resize(window.innerWidth, window.innerHeight);
  };

  constructor() {
    const container = document.getElementById("game-container");
    const dmgLayer = document.getElementById("damage-layer");
    const mmCanvas = document.getElementById("minimap-canvas");
    if (!container || !dmgLayer || !(mmCanvas instanceof HTMLCanvasElement)) {
      throw new Error("Required root game DOM containers are missing");
    }

    this.pipeline = new RenderPipeline(container);
    this.envTex = buildEnvironmentTextures();
    this.charTex = buildCharacterSprites();
    this.world = buildValeWorld(this.pipeline.scene, this.envTex);
    this.particles = new ParticleSystem(this.pipeline.scene);
    this.player = new PlayerController(
      this.pipeline.scene,
      this.charTex.hero,
      this.envTex.slashMap,
    );
    this.enemies = new EnemyManager(this.pipeline.scene, this.charTex.slimes);
    this.pickups = new PickupManager(this.pipeline.scene);
    this.floatingText = new FloatingTextLayer(dmgLayer);
    this.minimap = new MinimapRenderer(mmCanvas);

    this.hud = new HudController(this.charTex.hero.portraitCanvas, {
      onToggleDof: () => this.toggleDof(),
      onToggleAudio: () => this.toggleAudio(),
      onReset: () => {
        this.sfx.init();
        this.resetGame();
      },
      onStart: () => {
        this.sfx.init();
        this.resetGame();
      },
    });

    this.input = new InputManager(
      {
        onAttack: () => {
          if (this.gameStarted) this.player.triggerAttack(this.sfx);
        },
        onMouseAttack: () => {
          if (this.gameStarted) {
            this.sfx.init();
            this.player.triggerAttack(this.sfx);
          }
        },
        onDash: () => {
          if (this.gameStarted) this.player.triggerDash(this.sfx, this.particles);
        },
        onInteract: () => this.tryInteract(),
        onToggleDof: () => this.toggleDof(),
        onToggleAudio: () => this.toggleAudio(),
        onReset: () => {
          if (this.gameStarted) this.resetGame();
        },
      },
      this.pipeline.renderer.domElement,
    );

    this.events.on("stats:changed", (stats) => this.hud.updateStats(stats));
    this.events.on("banner:show", ({ message, duration }) =>
      this.hud.showBanner(message, duration),
    );
    this.events.on("player:died", ({ slimesDefeated, lvl }) =>
      this.hud.showGameOver(slimesDefeated, lvl),
    );

    this.enemies.spawnInitial();
    this.emitStats();
    window.addEventListener("resize", this.handleResize);
  }

  start(): void {
    const tick = (): void => {
      this.rafId = requestAnimationFrame(tick);
      const rawDt = Math.min(this.clock.getDelta(), 0.05);
      this.elapsed += rawDt;

      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= rawDt;
        this.pipeline.render();
        return;
      }

      if (this.gameStarted) {
        this.player.update(
          rawDt,
          this.elapsed,
          this.input,
          this.world.obstacles,
          this.sfx,
          () => this.handleActiveSlash(),
        );

        const chest = this.world.chest;
        if (
          this.player.alive &&
          !chest.opened &&
          Math.hypot(this.player.x - chest.x, this.player.z - chest.z) < 2.1 &&
          !this.hud.isToastActive()
        ) {
          this.events.emit("banner:show", {
            message: "Press [E] to Open Sanctuary Chest",
            duration: 0.5,
          });
        }

        this.enemies.update(rawDt, this.player, this.world.obstacles, {
          sfx: this.sfx,
          particles: this.particles,
          floatingText: this.floatingText,
          cameraController: this.cameraController,
          onPlayerDamaged: () => this.emitStats(),
          onPlayerDied: () =>
            this.events.emit("player:died", {
              slimesDefeated: this.player.slimesDefeated,
              lvl: this.player.lvl,
            }),
          onKingBossSpawned: () => {
            this.events.emit("boss:spawned", { tier: "king" });
            this.events.emit("banner:show", {
              message: "Warning: King Slime Appears in the Sanctuary!",
              duration: 3.6,
            });
          },
        });

        this.pickups.update(
          rawDt,
          this.player,
          this.sfx,
          this.floatingText,
          () => this.emitStats(),
        );

        this.minimap.draw(
          { x: this.player.x, z: this.player.z },
          { x: this.player.dirX, z: this.player.dirZ },
          this.enemies.slimes,
          this.world.chest,
        );
      }

      this.updateAtmosphereAndFX(rawDt);
      this.cameraController.update(
        rawDt,
        this.pipeline.camera,
        { x: this.player.x, y: this.player.y, z: this.player.z },
        { x: this.player.dirX, z: this.player.dirZ },
        this.elapsed,
        this.pipeline.hd2dPass,
      );
      this.pipeline.render();
    };
    tick();
  }

  private emitStats(): void {
    this.events.emit("stats:changed", this.player.getStatsSnapshot());
  }

  private toggleDof(): void {
    const next = !this.pipeline.isDofEnabled();
    this.pipeline.setDofEnabled(next);
    this.hud.setDofState(next);
  }

  private toggleAudio(): void {
    const on = this.sfx.toggle();
    this.hud.setAudioState(on);
  }

  private tryInteract(): void {
    const chest = this.world.chest;
    if (!this.gameStarted || !this.player.alive || chest.opened) return;
    if (Math.hypot(this.player.x - chest.x, this.player.z - chest.z) < 2.2) {
      chest.opened = true;
      chest.lidPivot.rotation.x = -1.25;
      chest.glow.intensity = 0.2;
      this.player.gold += CHEST_SPOT.goldBonus;
      this.player.hp = this.player.maxHp;
      this.player.atk += CHEST_SPOT.atkBonus;
      const upgradedPortrait = this.player.setAppearance({
        ...this.player.getAppearance(),
        weaponStyle: "relic_gold",
      });
      this.hud.setPortrait(upgradedPortrait);
      this.sfx.playFanfare();
      this.particles.spawnBurst(
        new THREE.Vector3(chest.x, 0.9, chest.z),
        "#ffe066",
        18,
        5.2,
      );
      this.floatingText.spawn(
        new THREE.Vector3(chest.x, 0.9, chest.z),
        `+${CHEST_SPOT.atkBonus} ATK & FULL HP!`,
        "#ffe780",
        true,
      );
      this.events.emit("chest:opened", {
        goldBonus: CHEST_SPOT.goldBonus,
        atkBonus: CHEST_SPOT.atkBonus,
      });
      this.events.emit("banner:show", {
        message: `Found Knight's Relic Blade! (+${CHEST_SPOT.atkBonus} ATK)`,
        duration: 3.2,
      });
      this.emitStats();
    }
  }

  private handleActiveSlash(): void {
    resolveSwordHits({
      player: this.player,
      enemies: this.enemies,
      particles: this.particles,
      floatingText: this.floatingText,
      cameraController: this.cameraController,
      sfx: this.sfx,
      onHitstop: (duration) => {
        this.hitstopTimer = duration;
      },
      onDefeatSlime: (idx, s) => this.defeatSlime(idx, s),
    });
  }

  private defeatSlime(idx: number, s: SlimeEntity): void {
    this.sfx.playSlimePop();
    this.particles.spawnBurst(
      new THREE.Vector3(s.x, s.y + 0.5, s.z),
      s.cfg.color,
      s.tier === "king" ? 28 : 16,
      5.4,
    );
    this.enemies.removeSlimeAt(idx);

    this.player.slimesDefeated += 1;
    this.pickups.spawn(s.x, s.z, Math.random() < 0.28 ? "heart" : "gold");

    if (s.tier === "king") {
      for (let k = 0; k < 4; k++) {
        this.pickups.spawn(
          s.x + (Math.random() - 0.5) * 1.5,
          s.z + (Math.random() - 0.5) * 1.5,
          "gold",
        );
      }
      this.events.emit("boss:defeated", { tier: "king" });
      this.events.emit("banner:show", {
        message: "King Slime Vanquished! Victory!",
        duration: 3.6,
      });
      this.sfx.playFanfare();
    }

    const levelsGained = applyExperienceGain(this.player, s.cfg.xp);
    if (levelsGained > 0) {
      this.sfx.playFanfare();
      this.particles.spawnBurst(
        new THREE.Vector3(this.player.x, this.player.y + 0.8, this.player.z),
        "#ffe875",
        22,
        5.0,
      );
      this.floatingText.spawn(
        new THREE.Vector3(this.player.x, this.player.y + 0.9, this.player.z),
        "LEVEL UP!",
        "#ffe875",
        true,
      );
      this.events.emit("banner:show", {
        message: `Level ${this.player.lvl} Reached! (+3 ATK, +10 HP)`,
        duration: 2.8,
      });
    }

    this.emitStats();
  }

  private updateAtmosphereAndFX(dt: number): void {
    this.envTex.waterMap.offset.x += dt * 0.045;
    this.envTex.waterMap.offset.y = Math.sin(this.elapsed * 0.6) * 0.03;
    this.envTex.waterNormal.offset.x = this.envTex.waterMap.offset.x * 1.15;
    this.envTex.waterNormal.offset.y =
      this.envTex.waterMap.offset.y + Math.cos(this.elapsed * 0.45) * 0.02;

    const flameCount = this.envTex.flameTextures.length;
    const flameIdx = Math.floor(this.elapsed * 9) % flameCount;
    for (const t of this.world.torches) {
      const tex =
        this.envTex.flameTextures[
          (flameIdx + Math.floor(t.phase)) % flameCount
        ];
      if (tex) t.flameMesh.material.map = tex;
      t.light.intensity =
        t.baseIntensity +
        Math.sin(this.elapsed * 13 + t.phase) * 0.65 +
        Math.cos(this.elapsed * 23 + t.phase) * 0.35;
      if (Math.random() < dt * 3.2) {
        this.particles.spawnBurst(t.pos, "#ffb74d", 1, 0.9);
      }
    }

    this.particles.update(dt, this.elapsed);
    this.floatingText.update(dt, this.pipeline.camera);
    this.hud.updateToast(dt);
  }

  resetGame(): void {
    const defaultPortrait = this.player.setAppearance(DEFAULT_ALDEN_APPEARANCE);
    this.hud.setPortrait(defaultPortrait);
    this.player.reset();
    this.world.chest.opened = false;
    this.world.chest.lidPivot.rotation.x = 0;
    this.world.chest.glow.intensity = 1.8;

    this.pickups.clear();
    this.particles.clear();
    this.floatingText.clear();
    this.enemies.spawnInitial();
    this.hitstopTimer = 0;
    this.cameraController.resetShake();

    this.emitStats();
    this.hud.hideOverlay();
    this.gameStarted = true;
    this.events.emit("banner:show", {
      message: "Aethelgard Vale — Cross the Bridge",
      duration: 2.8,
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.handleResize);
    this.input.dispose();
    this.sfx.dispose();
    this.particles.dispose();
    this.pickups.dispose();
    this.enemies.clear();
    this.floatingText.clear();
    this.events.clear();
    this.pipeline.dispose();
  }
}

import type { GameEvents, PlayerStatsSnapshot } from "../core/types.ts";

export interface HudActions {
  onToggleDof: () => void;
  onToggleAudio: () => void;
  onReset: () => void;
  onStart: () => void;
  onOpenCreator: () => void;
}

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required DOM element #${id}`);
  }
  return el as T;
}

/**
 * Controls the SNES/Octopath gilded HUD, portrait blit, banner toast, and overlays.
 */
export class HudController {
  private readonly portraitCanvas = requireElement<HTMLCanvasElement>("portrait-canvas");
  private readonly heroName = requireElement<HTMLElement>("hero-name");
  private readonly lvlText = requireElement<HTMLElement>("lvl-text");
  private readonly hpText = requireElement<HTMLElement>("hp-text");
  private readonly hpFill = requireElement<HTMLElement>("hp-fill");
  private readonly xpText = requireElement<HTMLElement>("xp-text");
  private readonly xpFill = requireElement<HTMLElement>("xp-fill");
  private readonly slimeCount = requireElement<HTMLElement>("slime-count");
  private readonly goldCount = requireElement<HTMLElement>("gold-count");
  private readonly bannerToast = requireElement<HTMLElement>("banner-toast");
  private readonly bossHud = requireElement<HTMLElement>("boss-hud");
  private readonly bossName = requireElement<HTMLElement>("boss-name");
  private readonly bossBarFill = requireElement<HTMLElement>("boss-bar-fill");
  private readonly bossHpText = requireElement<HTMLElement>("boss-hp-text");
  private readonly btnCustomize = requireElement<HTMLButtonElement>("btn-customize");
  private readonly btnDof = requireElement<HTMLButtonElement>("btn-dof");
  private readonly btnAudio = requireElement<HTMLButtonElement>("btn-audio");
  private readonly btnReset = requireElement<HTMLButtonElement>("btn-reset");
  private readonly overlayScreen = requireElement<HTMLElement>("overlay-screen");
  private readonly overlayTitle = requireElement<HTMLElement>("overlay-title");
  private readonly overlayDesc = requireElement<HTMLElement>("overlay-desc");
  private readonly startBtn = requireElement<HTMLButtonElement>("start-btn");
  private readonly customizeBtn = requireElement<HTMLButtonElement>("customize-btn");

  private toastTimer = 0;

  constructor(portraitSource: HTMLCanvasElement, actions: HudActions) {
    this.setPortrait(portraitSource);

    this.btnCustomize.addEventListener("click", actions.onOpenCreator);
    this.customizeBtn.addEventListener("click", actions.onOpenCreator);
    this.btnDof.addEventListener("click", actions.onToggleDof);
    this.btnAudio.addEventListener("click", actions.onToggleAudio);
    this.btnReset.addEventListener("click", actions.onReset);
    this.startBtn.addEventListener("click", actions.onStart);
  }

  setHeroName(name: string): void {
    this.heroName.textContent = name;
  }

  setPortrait(portraitSource: HTMLCanvasElement): void {
    const pCtx = this.portraitCanvas.getContext("2d");
    if (pCtx) {
      pCtx.imageSmoothingEnabled = false;
      pCtx.clearRect(0, 0, this.portraitCanvas.width, this.portraitCanvas.height);
      pCtx.drawImage(
        portraitSource,
        0,
        0,
        this.portraitCanvas.width,
        this.portraitCanvas.height,
      );
    }
  }

  updateStats(stats: PlayerStatsSnapshot): void {
    this.lvlText.textContent = `LV ${stats.lvl}`;
    this.hpText.textContent = `${Math.max(0, Math.ceil(stats.hp))}/${stats.maxHp}`;
    this.hpFill.style.width = `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%`;
    this.xpText.textContent = `${stats.xp}/${stats.xpNext}`;
    this.xpFill.style.width = `${Math.min(100, (stats.xp / stats.xpNext) * 100)}%`;
    this.slimeCount.textContent = `SLIMES: ${stats.slimesDefeated}`;
    this.goldCount.textContent = `GOLD: ${stats.gold}`;
  }

  setDofState(enabled: boolean): void {
    this.btnDof.textContent = `HD-2D DOF: ${enabled ? "ON" : "OFF"}`;
    this.btnDof.classList.toggle("off", !enabled);
  }

  setAudioState(enabled: boolean): void {
    this.btnAudio.textContent = `AUDIO: ${enabled ? "ON" : "OFF"}`;
    this.btnAudio.classList.toggle("off", !enabled);
  }

  showBanner(message: string, duration = 2.4): void {
    this.bannerToast.textContent = message;
    this.bannerToast.classList.add("show");
    this.toastTimer = duration;
  }

  updateBossHp(state: GameEvents["boss:hp"]): void {
    const active = state.active && state.hp > 0 && state.maxHp > 0;
    this.bossHud.classList.toggle("active", active);
    this.bossHud.setAttribute("aria-hidden", active ? "false" : "true");
    if (!active) return;

    const ratio = Math.min(Math.max(state.hp / state.maxHp, 0), 1);
    this.bossName.textContent = state.name;
    this.bossBarFill.style.width = `${ratio * 100}%`;
    this.bossHpText.textContent = `${Math.ceil(state.hp)}/${state.maxHp}`;
  }

  isToastActive(): boolean {
    return this.toastTimer > 0;
  }

  updateToast(dt: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.bannerToast.classList.remove("show");
      }
    }
  }

  hideOverlay(): void {
    this.overlayScreen.classList.add("hidden");
  }

  showGameOver(slimesDefeated: number, lvl: number): void {
    this.overlayTitle.textContent = "FALLEN IN BATTLE";
    this.overlayDesc.innerHTML = `You defeated <strong>${slimesDefeated}</strong> slimes and reached <strong>Level ${lvl}</strong>.<br/>The Sanctuary awaits your return.`;
    this.startBtn.textContent = "Rise Again";
    this.overlayScreen.classList.remove("hidden");
  }
}

import {
  composeHeroSpriteSet,
  disposeHeroSpriteSet,
} from "../assets/characterComposer.ts";
import type { HeroSpriteSet } from "../assets/characterSprites.ts";
import {
  type AppearanceOption,
  type CharacterAppearance,
  CLOAK_STYLE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  type HeroProfile,
  PRESET_OPTIONS,
  SKIN_TONE_OPTIONS,
  TUNIC_COLOR_OPTIONS,
  WEAPON_STYLE_OPTIONS,
} from "../config/characterAppearance.ts";
import { sanitizeHeroName } from "../core/storage.ts";
import type { SpriteDir } from "../core/types.ts";

export interface CharacterCreatorCallbacks {
  onConfirm: (profile: HeroProfile) => void;
  onClose: () => void;
}

type PreviewAnimMode = "idle" | "walk" | "atk";

const DIR_ORDER: readonly SpriteDir[] = ["down", "right", "up", "left"];
const DIR_LABELS: Readonly<Record<SpriteDir, string>> = {
  down: "FRONT",
  right: "RIGHT",
  up: "BACK",
  left: "LEFT",
};

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required character creator element #${id}`);
  }
  return el as T;
}

function pickRandom<T>(items: readonly T[]): T {
  const idx = Math.floor(Math.random() * items.length);
  return items[idx] ?? items[0]!;
}

/**
 * Interactive SNES/Octopath-styled Character Creator modal with live 24x32 animated preview.
 */
export class CharacterCreatorModal {
  private readonly modal = requireEl<HTMLElement>("creator-modal");
  private readonly closeBtn = requireEl<HTMLButtonElement>("creator-close-btn");
  private readonly cancelBtn = requireEl<HTMLButtonElement>("creator-cancel-btn");
  private readonly confirmBtn = requireEl<HTMLButtonElement>("creator-confirm-btn");
  private readonly nameInput = requireEl<HTMLInputElement>("creator-name-input");
  private readonly previewCanvas = requireEl<HTMLCanvasElement>("creator-preview-canvas");
  private readonly rotLeftBtn = requireEl<HTMLButtonElement>("creator-rot-left");
  private readonly rotRightBtn = requireEl<HTMLButtonElement>("creator-rot-right");
  private readonly dirLabel = requireEl<HTMLElement>("creator-dir-label");
  private readonly randomizeBtn = requireEl<HTMLButtonElement>("creator-randomize-btn");

  private readonly presetsContainer = requireEl<HTMLElement>("creator-presets");
  private readonly skinContainer = requireEl<HTMLElement>("creator-skin-tones");
  private readonly hairStyleContainer = requireEl<HTMLElement>("creator-hair-styles");
  private readonly hairColorContainer = requireEl<HTMLElement>("creator-hair-colors");
  private readonly tunicColorContainer = requireEl<HTMLElement>("creator-tunic-colors");
  private readonly cloakStyleContainer = requireEl<HTMLElement>("creator-cloak-styles");
  private readonly weaponStyleContainer = requireEl<HTMLElement>("creator-weapon-styles");

  private readonly animButtons: HTMLButtonElement[];
  private readonly callbacks: CharacterCreatorCallbacks;

  private draftProfile: HeroProfile | null = null;
  private previewSprites: HeroSpriteSet | null = null;
  private previewDirIdx = 0;
  private previewAnim: PreviewAnimMode = "idle";
  private isOpen = false;
  private rafId = 0;
  private animStartMs = 0;

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    if (this.isOpen && e.key === "Escape") {
      e.preventDefault();
      this.cancel();
    }
  };

  constructor(callbacks: CharacterCreatorCallbacks) {
    this.callbacks = callbacks;
    this.animButtons = Array.from(
      this.modal.querySelectorAll<HTMLButtonElement>(".anim-btn"),
    );

    this.buildPresetButtons();
    this.buildOptionControls();

    this.closeBtn.addEventListener("click", () => this.cancel());
    this.cancelBtn.addEventListener("click", () => this.cancel());
    this.confirmBtn.addEventListener("click", () => this.confirm());

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.cancel();
      }
    });

    this.rotLeftBtn.addEventListener("click", () => this.rotatePreview(-1));
    this.rotRightBtn.addEventListener("click", () => this.rotatePreview(1));
    this.randomizeBtn.addEventListener("click", () => this.randomize());

    for (const btn of this.animButtons) {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.anim as PreviewAnimMode | undefined;
        if (mode === "idle" || mode === "walk" || mode === "atk") {
          this.setPreviewAnim(mode);
        }
      });
    }

    window.addEventListener("keydown", this.handleKeyDown);
  }

  open(current: HeroProfile): void {
    this.draftProfile = {
      name: current.name,
      appearance: { ...current.appearance },
    };
    this.nameInput.value = current.name;
    this.previewDirIdx = 0;
    this.setPreviewAnim("idle");
    this.updateDirectionLabel();
    this.syncActiveButtons();
    this.rebuildPreviewSprites();

    this.isOpen = true;
    this.modal.classList.remove("hidden");
    this.animStartMs = performance.now();
    this.startPreviewLoop();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.modal.classList.add("hidden");
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    if (this.previewSprites) {
      disposeHeroSpriteSet(this.previewSprites);
      this.previewSprites = null;
    }
  }

  dispose(): void {
    this.close();
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private cancel(): void {
    this.close();
    this.callbacks.onClose();
  }

  private confirm(): void {
    if (!this.draftProfile) return;
    const confirmed: HeroProfile = {
      name: sanitizeHeroName(this.nameInput.value),
      appearance: { ...this.draftProfile.appearance },
    };
    this.close();
    this.callbacks.onConfirm(confirmed);
  }

  private buildPresetButtons(): void {
    this.presetsContainer.innerHTML = "";
    for (const preset of PRESET_OPTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = preset.label;
      btn.addEventListener("click", () => {
        if (!this.draftProfile) return;
        this.draftProfile.appearance = { ...preset.appearance };
        this.syncActiveButtons();
        this.rebuildPreviewSprites();
      });
      this.presetsContainer.appendChild(btn);
    }
  }

  private buildOptionControls(): void {
    this.renderSwatchGroup(
      this.skinContainer,
      "skinTone",
      SKIN_TONE_OPTIONS,
    );
    this.renderPillGroup(
      this.hairStyleContainer,
      "hairStyle",
      HAIR_STYLE_OPTIONS,
    );
    this.renderSwatchGroup(
      this.hairColorContainer,
      "hairColor",
      HAIR_COLOR_OPTIONS,
    );
    this.renderSwatchGroup(
      this.tunicColorContainer,
      "tunicColor",
      TUNIC_COLOR_OPTIONS,
    );
    this.renderPillGroup(
      this.cloakStyleContainer,
      "cloakStyle",
      CLOAK_STYLE_OPTIONS,
    );
    this.renderPillGroup(
      this.weaponStyleContainer,
      "weaponStyle",
      WEAPON_STYLE_OPTIONS,
    );
  }

  private renderSwatchGroup<K extends keyof CharacterAppearance>(
    container: HTMLElement,
    field: K,
    options: readonly AppearanceOption<CharacterAppearance[K]>[],
  ): void {
    container.innerHTML = "";
    for (const opt of options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch-btn";
      btn.dataset.field = field;
      btn.dataset.value = opt.id;

      const dot = document.createElement("span");
      dot.className = "swatch-dot";
      if (opt.swatch) dot.style.backgroundColor = opt.swatch;

      const label = document.createElement("span");
      label.textContent = opt.label;

      btn.append(dot, label);
      btn.addEventListener("click", () => this.selectField(field, opt.id));
      container.appendChild(btn);
    }
  }

  private renderPillGroup<K extends keyof CharacterAppearance>(
    container: HTMLElement,
    field: K,
    options: readonly AppearanceOption<CharacterAppearance[K]>[],
  ): void {
    container.innerHTML = "";
    for (const opt of options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.dataset.field = field;
      btn.dataset.value = opt.id;
      btn.textContent = opt.label;
      btn.addEventListener("click", () => this.selectField(field, opt.id));
      container.appendChild(btn);
    }
  }

  private selectField<K extends keyof CharacterAppearance>(
    field: K,
    value: CharacterAppearance[K],
  ): void {
    if (!this.draftProfile) return;
    this.draftProfile.appearance[field] = value;
    this.syncActiveButtons();
    this.rebuildPreviewSprites();
  }

  private randomize(): void {
    if (!this.draftProfile) return;
    this.draftProfile.appearance = {
      skinTone: pickRandom(SKIN_TONE_OPTIONS).id,
      hairStyle: pickRandom(HAIR_STYLE_OPTIONS).id,
      hairColor: pickRandom(HAIR_COLOR_OPTIONS).id,
      tunicColor: pickRandom(TUNIC_COLOR_OPTIONS).id,
      cloakStyle: pickRandom(CLOAK_STYLE_OPTIONS).id,
      weaponStyle: pickRandom(WEAPON_STYLE_OPTIONS).id,
    };
    this.syncActiveButtons();
    this.rebuildPreviewSprites();
  }

  private syncActiveButtons(): void {
    if (!this.draftProfile) return;
    const appearance = this.draftProfile.appearance;
    const buttons = this.modal.querySelectorAll<HTMLButtonElement>(
      "button[data-field][data-value]",
    );
    for (const btn of buttons) {
      const field = btn.dataset.field as keyof CharacterAppearance | undefined;
      const value = btn.dataset.value;
      if (!field || !value) continue;
      btn.classList.toggle("active", appearance[field] === value);
    }
  }

  private rotatePreview(delta: number): void {
    this.previewDirIdx =
      (this.previewDirIdx + delta + DIR_ORDER.length) % DIR_ORDER.length;
    this.updateDirectionLabel();
    this.drawPreview((performance.now() - this.animStartMs) / 1000);
  }

  private updateDirectionLabel(): void {
    const dir = DIR_ORDER[this.previewDirIdx] ?? "down";
    this.dirLabel.textContent = DIR_LABELS[dir];
  }

  private setPreviewAnim(mode: PreviewAnimMode): void {
    this.previewAnim = mode;
    for (const btn of this.animButtons) {
      btn.classList.toggle("active", btn.dataset.anim === mode);
    }
    this.drawPreview((performance.now() - this.animStartMs) / 1000);
  }

  private rebuildPreviewSprites(): void {
    if (!this.draftProfile) return;
    const prev = this.previewSprites;
    this.previewSprites = composeHeroSpriteSet(this.draftProfile.appearance);
    if (prev) {
      disposeHeroSpriteSet(prev);
    }
    this.drawPreview((performance.now() - this.animStartMs) / 1000);
  }

  private startPreviewLoop(): void {
    cancelAnimationFrame(this.rafId);
    const loop = (now: number): void => {
      if (!this.isOpen) return;
      this.drawPreview((now - this.animStartMs) / 1000);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private drawPreview(elapsedSec: number): void {
    if (!this.previewSprites) return;
    const dir = DIR_ORDER[this.previewDirIdx] ?? "down";
    const animSet = this.previewSprites[dir];

    let tex = animSet.idle;
    if (this.previewAnim === "walk") {
      const frameIdx = Math.floor(elapsedSec * 6.5) % 4;
      tex = animSet.walk[frameIdx] ?? animSet.idle;
    } else if (this.previewAnim === "atk") {
      tex = animSet.atk;
    }

    const src = tex.image as HTMLCanvasElement | undefined;
    const ctx = this.previewCanvas.getContext("2d");
    if (!ctx || !src) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    ctx.drawImage(
      src,
      0,
      0,
      this.previewCanvas.width,
      this.previewCanvas.height,
    );
  }
}

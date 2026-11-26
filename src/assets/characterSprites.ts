import type * as THREE from "three";
import {
  type CharacterAppearance,
  DEFAULT_ALDEN_APPEARANCE,
} from "../config/characterAppearance.ts";
import type { SlimeTier, SpriteDir } from "../core/types.ts";
import { canvasToPixelTexture, drawGridSprite } from "./canvasUtils.ts";
import { composeHeroSpriteSet } from "./characterComposer.ts";
import { SLIME_GRIDS, SLIME_PALETTES } from "./spriteData.ts";

export interface DirectionalAnimSet {
  idle: THREE.CanvasTexture;
  walk: [
    THREE.CanvasTexture,
    THREE.CanvasTexture,
    THREE.CanvasTexture,
    THREE.CanvasTexture,
  ];
  atk: THREE.CanvasTexture;
}

export type HeroSpriteSet = Record<SpriteDir, DirectionalAnimSet> & {
  portraitCanvas: HTMLCanvasElement;
};

export interface SlimeSpriteSet {
  idle1: THREE.CanvasTexture;
  idle2: THREE.CanvasTexture;
  hop: THREE.CanvasTexture;
}

export interface CharacterSprites {
  hero: HeroSpriteSet;
  slimes: Record<SlimeTier, SlimeSpriteSet>;
}

function makeSlimeSet(
  pal: { H: string; M: string; D: string },
  crowned: boolean,
): SlimeSpriteSet {
  const addCrown = (grid: readonly string[]): string[] => {
    if (!crowned) return grid.slice();
    const g = grid.slice();
    g[0] = SLIME_GRIDS.crownRows[0];
    g[1] = SLIME_GRIDS.crownRows[1];
    g[2] = SLIME_GRIDS.crownRows[2];
    return g;
  };

  const fullPal = {
    ...pal,
    K: "#181316",
    W: "#ffffff",
    Y: "#f5cb42",
  };

  return {
    idle1: canvasToPixelTexture(
      drawGridSprite(addCrown(SLIME_GRIDS.idle1), fullPal),
    ),
    idle2: canvasToPixelTexture(
      drawGridSprite(addCrown(SLIME_GRIDS.idle2), fullPal),
    ),
    hop: canvasToPixelTexture(
      drawGridSprite(addCrown(SLIME_GRIDS.hop), fullPal),
    ),
  };
}

export function buildCharacterSprites(
  appearance: CharacterAppearance = DEFAULT_ALDEN_APPEARANCE,
): CharacterSprites {
  const hero = composeHeroSpriteSet(appearance);

  const slimes: Record<SlimeTier, SlimeSpriteSet> = {
    green: makeSlimeSet(SLIME_PALETTES.green, SLIME_PALETTES.green.crowned),
    blue: makeSlimeSet(SLIME_PALETTES.blue, SLIME_PALETTES.blue.crowned),
    red: makeSlimeSet(SLIME_PALETTES.red, SLIME_PALETTES.red.crowned),
    king: makeSlimeSet(SLIME_PALETTES.king, SLIME_PALETTES.king.crowned),
  };

  return { hero, slimes };
}

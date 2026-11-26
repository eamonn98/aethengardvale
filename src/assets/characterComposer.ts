import type * as THREE from "three";
import {
  type CharacterAppearance,
  resolveAppearancePalette,
} from "../config/characterAppearance.ts";
import { canvasToPixelTexture, makeCanvas } from "./canvasUtils.ts";
import {
  BODY_LAYERS,
  CLOAK_LAYERS,
  HAIR_LAYERS,
  HERO_SPRITE_HEIGHT,
  HERO_SPRITE_WIDTH,
  type LayerDirection,
  type LayerFrame,
  TUNIC_LAYERS,
  WEAPON_LAYERS,
} from "./characterLayers.ts";
import type { HeroSpriteSet } from "./characterSprites.ts";

function paintGridOntoCanvas(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  palette: Readonly<Record<string, string>>,
  flipX: boolean,
): void {
  for (let y = 0; y < HERO_SPRITE_HEIGHT; y++) {
    const row = rows[y];
    if (!row) continue;
    for (let x = 0; x < HERO_SPRITE_WIDTH; x++) {
      const ch = row[x];
      if (!ch || ch === "." || ch === " ") continue;
      const col = palette[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flipX ? HERO_SPRITE_WIDTH - 1 - x : x, y, 1, 1);
    }
  }
}

function composeFrameCanvas(
  appearance: CharacterAppearance,
  palette: Readonly<Record<string, string>>,
  dir: LayerDirection,
  frame: LayerFrame,
  flipX: boolean,
): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(HERO_SPRITE_WIDTH, HERO_SPRITE_HEIGHT);

  const cloakGrid = CLOAK_LAYERS[appearance.cloakStyle][dir][frame];
  const bodyGrid = BODY_LAYERS[dir][frame];
  const tunicGrid = TUNIC_LAYERS[dir][frame];
  const hairGrid = HAIR_LAYERS[appearance.hairStyle][dir][frame];
  const weaponGrid = WEAPON_LAYERS[dir][frame];

  // Z-order: capes/weapons sit behind the torso from the front when sheathed, and over the back from behind
  const layers: readonly (readonly string[])[] =
    dir === "up"
      ? [bodyGrid, tunicGrid, cloakGrid, hairGrid, weaponGrid]
      : dir === "right"
        ? [cloakGrid, bodyGrid, tunicGrid, hairGrid, weaponGrid]
        : frame === "atk"
          ? [bodyGrid, tunicGrid, cloakGrid, hairGrid, weaponGrid]
          : [weaponGrid, bodyGrid, tunicGrid, cloakGrid, hairGrid];

  for (const grid of layers) {
    paintGridOntoCanvas(ctx, grid, palette, flipX);
  }

  return canvas;
}

/**
 * Compiles a full 4-direction animated HeroSpriteSet + 24x24 portrait from a CharacterAppearance.
 */
export function composeHeroSpriteSet(
  appearance: CharacterAppearance,
): HeroSpriteSet {
  const palette = resolveAppearancePalette(appearance);

  const bake = (
    dir: LayerDirection,
    frame: LayerFrame,
    flipX = false,
  ): THREE.CanvasTexture =>
    canvasToPixelTexture(
      composeFrameCanvas(appearance, palette, dir, frame, flipX),
    );

  const downIdleCanvas = composeFrameCanvas(
    appearance,
    palette,
    "down",
    "idle",
    false,
  );
  const downIdleTex = canvasToPixelTexture(downIdleCanvas);
  const upIdleTex = bake("up", "idle");
  const rightIdleTex = bake("right", "idle");
  const leftIdleTex = bake("right", "idle", true);

  const portrait = makeCanvas(24, 24);
  portrait.ctx.drawImage(downIdleCanvas, 0, 0, 24, 24, 0, 0, 24, 24);

  return {
    down: {
      idle: downIdleTex,
      walk: [
        bake("down", "walk1"),
        downIdleTex,
        bake("down", "walk2"),
        downIdleTex,
      ],
      atk: bake("down", "atk"),
    },
    up: {
      idle: upIdleTex,
      walk: [bake("up", "walk1"), upIdleTex, bake("up", "walk2"), upIdleTex],
      atk: bake("up", "atk"),
    },
    right: {
      idle: rightIdleTex,
      walk: [
        bake("right", "walk1"),
        rightIdleTex,
        bake("right", "walk2"),
        rightIdleTex,
      ],
      atk: bake("right", "atk"),
    },
    left: {
      idle: leftIdleTex,
      walk: [
        bake("right", "walk1", true),
        leftIdleTex,
        bake("right", "walk2", true),
        leftIdleTex,
      ],
      atk: bake("right", "atk", true),
    },
    portraitCanvas: portrait.canvas,
  };
}

export function disposeHeroSpriteSet(set: HeroSpriteSet): void {
  const unique = new Set<THREE.Texture>();
  for (const dir of ["down", "up", "right", "left"] as const) {
    unique.add(set[dir].idle);
    unique.add(set[dir].atk);
    for (const w of set[dir].walk) unique.add(w);
  }
  for (const tex of unique) {
    tex.dispose();
  }
}

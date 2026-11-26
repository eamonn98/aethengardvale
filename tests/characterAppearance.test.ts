import { describe, expect, test } from "bun:test";
import {
  BODY_LAYERS,
  CLOAK_LAYERS,
  HAIR_LAYERS,
  HERO_SPRITE_HEIGHT,
  HERO_SPRITE_WIDTH,
  TUNIC_LAYERS,
  WEAPON_LAYERS,
  type DirectedGridSet,
} from "../src/assets/characterLayers.ts";
import {
  APPEARANCE_PRESETS,
  DEFAULT_ALDEN_APPEARANCE,
  resolveAppearancePalette,
} from "../src/config/characterAppearance.ts";

function assertGridDimensions(name: string, set: DirectedGridSet): void {
  for (const dir of ["down", "up", "right"] as const) {
    for (const frame of ["idle", "walk1", "walk2", "atk"] as const) {
      const grid = set[dir][frame];
      expect(grid.length).toBe(HERO_SPRITE_HEIGHT);
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r];
        if (row?.length !== HERO_SPRITE_WIDTH) {
          throw new Error(
            `${name}.${dir}.${frame}[${r}] width ${row?.length} !== ${HERO_SPRITE_WIDTH}`,
          );
        }
      }
    }
  }
}

describe("24x32 layered character appearance & grids", () => {
  test("every layer grid strictly matches 24x32 dimensions", () => {
    assertGridDimensions("BODY", BODY_LAYERS);
    assertGridDimensions("TUNIC", TUNIC_LAYERS);
    assertGridDimensions("WEAPON", WEAPON_LAYERS);

    for (const [style, set] of Object.entries(CLOAK_LAYERS)) {
      assertGridDimensions(`CLOAK.${style}`, set);
    }
    for (const [style, set] of Object.entries(HAIR_LAYERS)) {
      assertGridDimensions(`HAIR.${style}`, set);
    }
  });

  test("resolveAppearancePalette produces distinct ramps for presets", () => {
    const alden = resolveAppearancePalette(DEFAULT_ALDEN_APPEARANCE);
    const paladin = resolveAppearancePalette(APPEARANCE_PRESETS.paladin!);
    const shadow = resolveAppearancePalette(APPEARANCE_PRESETS.shadowblade!);

    expect(alden.K).toBe("#181210");
    expect(alden.B).not.toBe(paladin.B);
    expect(alden.I).not.toBe(paladin.I);
    expect(shadow.H).not.toBe(alden.H);
    expect(shadow.P).not.toBe(alden.P);
  });
});

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
  CLOAK_STYLE_OPTIONS,
  DEFAULT_ALDEN_APPEARANCE,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  PRESET_OPTIONS,
  SKIN_TONE_OPTIONS,
  TUNIC_COLOR_OPTIONS,
  WEAPON_STYLE_OPTIONS,
  resolveAppearancePalette,
} from "../src/config/characterAppearance.ts";

const VALID_PALETTE_KEYS = new Set(
  Object.keys(resolveAppearancePalette(DEFAULT_ALDEN_APPEARANCE)),
);

function assertGridDimensionsAndTokens(
  name: string,
  set: DirectedGridSet,
): void {
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
        for (let c = 0; c < row.length; c++) {
          const ch = row[c]!;
          if (ch !== "." && ch !== " " && !VALID_PALETTE_KEYS.has(ch)) {
            throw new Error(
              `${name}.${dir}.${frame}[${r}][${c}] unknown palette token '${ch}'`,
            );
          }
        }
      }
    }
  }
}

describe("24x32 layered character appearance & grids", () => {
  test("every layer grid strictly matches 24x32 dimensions and valid palette tokens", () => {
    assertGridDimensionsAndTokens("BODY", BODY_LAYERS);
    assertGridDimensionsAndTokens("TUNIC", TUNIC_LAYERS);
    assertGridDimensionsAndTokens("WEAPON", WEAPON_LAYERS);

    for (const [style, set] of Object.entries(CLOAK_LAYERS)) {
      assertGridDimensionsAndTokens(`CLOAK.${style}`, set);
    }
    for (const [style, set] of Object.entries(HAIR_LAYERS)) {
      assertGridDimensionsAndTokens(`HAIR.${style}`, set);
    }
  });

  test("all configured hair and cloak option IDs have layer definitions", () => {
    for (const opt of HAIR_STYLE_OPTIONS) {
      expect(HAIR_LAYERS[opt.id]).toBeDefined();
    }
    for (const opt of CLOAK_STYLE_OPTIONS) {
      expect(CLOAK_LAYERS[opt.id]).toBeDefined();
    }
    expect(SKIN_TONE_OPTIONS.length).toBeGreaterThanOrEqual(4);
    expect(HAIR_COLOR_OPTIONS.length).toBeGreaterThanOrEqual(6);
    expect(TUNIC_COLOR_OPTIONS.length).toBeGreaterThanOrEqual(6);
    expect(WEAPON_STYLE_OPTIONS.length).toBeGreaterThanOrEqual(3);
  });

  test("resolveAppearancePalette produces distinct ramps for presets", () => {
    const alden = resolveAppearancePalette(DEFAULT_ALDEN_APPEARANCE);
    const paladin = resolveAppearancePalette(APPEARANCE_PRESETS.paladin!);
    const shadow = resolveAppearancePalette(APPEARANCE_PRESETS.shadowblade!);
    const vanguard = resolveAppearancePalette(APPEARANCE_PRESETS.vanguard!);
    const archmage = resolveAppearancePalette(APPEARANCE_PRESETS.archmage!);

    expect(alden.K).toBe("#181210");
    expect(alden.B).not.toBe(paladin.B);
    expect(alden.I).not.toBe(paladin.I);
    expect(shadow.H).not.toBe(alden.H);
    expect(shadow.P).not.toBe(alden.P);
    expect(vanguard.C).not.toBe(alden.C);
    expect(archmage.B).not.toBe(alden.B);
    expect(PRESET_OPTIONS.length).toBe(Object.keys(APPEARANCE_PRESETS).length);
  });
});

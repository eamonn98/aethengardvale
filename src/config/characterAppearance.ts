export type SkinToneId = "fair" | "warm" | "tan" | "deep";
export type HairStyleId =
  | "windswept"
  | "noble"
  | "hooded"
  | "braided"
  | "knight_helm"
  | "mage_hat";
export type HairColorId =
  | "silver"
  | "auburn"
  | "obsidian"
  | "golden"
  | "crimson"
  | "emerald";
export type TunicColorId =
  | "cobalt"
  | "emerald"
  | "crimson"
  | "slate"
  | "amethyst"
  | "ivory";
export type CloakStyleId =
  | "crimson_scarf"
  | "forest_mantle"
  | "royal_cape"
  | "fur_pauldrons"
  | "none";
export type WeaponStyleId = "knight_blade" | "relic_gold" | "runic_edge";

export interface CharacterAppearance {
  skinTone: SkinToneId;
  hairStyle: HairStyleId;
  hairColor: HairColorId;
  tunicColor: TunicColorId;
  cloakStyle: CloakStyleId;
  weaponStyle: WeaponStyleId;
}

export interface HeroProfile {
  name: string;
  appearance: CharacterAppearance;
}

export interface AppearanceOption<T extends string> {
  id: T;
  label: string;
  swatch?: string;
}

export interface AppearancePresetOption {
  id: string;
  label: string;
  appearance: CharacterAppearance;
}

export const DEFAULT_HERO_NAME = "Alden";

export const DEFAULT_ALDEN_APPEARANCE: CharacterAppearance = {
  skinTone: "fair",
  hairStyle: "windswept",
  hairColor: "silver",
  tunicColor: "cobalt",
  cloakStyle: "crimson_scarf",
  weaponStyle: "knight_blade",
};

export const APPEARANCE_PRESETS: Readonly<Record<string, CharacterAppearance>> = {
  alden: DEFAULT_ALDEN_APPEARANCE,
  ranger: {
    skinTone: "warm",
    hairStyle: "hooded",
    hairColor: "auburn",
    tunicColor: "emerald",
    cloakStyle: "forest_mantle",
    weaponStyle: "knight_blade",
  },
  paladin: {
    skinTone: "tan",
    hairStyle: "noble",
    hairColor: "golden",
    tunicColor: "crimson",
    cloakStyle: "royal_cape",
    weaponStyle: "relic_gold",
  },
  shadowblade: {
    skinTone: "deep",
    hairStyle: "hooded",
    hairColor: "obsidian",
    tunicColor: "slate",
    cloakStyle: "royal_cape",
    weaponStyle: "runic_edge",
  },
  vanguard: {
    skinTone: "tan",
    hairStyle: "knight_helm",
    hairColor: "crimson",
    tunicColor: "ivory",
    cloakStyle: "fur_pauldrons",
    weaponStyle: "knight_blade",
  },
  archmage: {
    skinTone: "fair",
    hairStyle: "mage_hat",
    hairColor: "silver",
    tunicColor: "amethyst",
    cloakStyle: "royal_cape",
    weaponStyle: "runic_edge",
  },
};

export const PRESET_OPTIONS: readonly AppearancePresetOption[] = [
  { id: "alden", label: "Alden", appearance: APPEARANCE_PRESETS.alden! },
  { id: "ranger", label: "Ranger", appearance: APPEARANCE_PRESETS.ranger! },
  { id: "paladin", label: "Paladin", appearance: APPEARANCE_PRESETS.paladin! },
  { id: "shadowblade", label: "Shadowblade", appearance: APPEARANCE_PRESETS.shadowblade! },
  { id: "vanguard", label: "Vanguard", appearance: APPEARANCE_PRESETS.vanguard! },
  { id: "archmage", label: "Archmage", appearance: APPEARANCE_PRESETS.archmage! },
];

const SKIN_RAMPS: Record<SkinToneId, { S: string; s: string; d: string }> = {
  fair: { S: "#f7cfb0", s: "#deab84", d: "#b37c59" },
  warm: { S: "#ebba8e", s: "#ce9264", d: "#9d6840" },
  tan: { S: "#d49b6a", s: "#b37648", d: "#85502b" },
  deep: { S: "#986342", s: "#75462b", d: "#522d1a" },
};

const HAIR_RAMPS: Record<
  HairColorId,
  { H: string; h: string; n: string; m: string }
> = {
  silver: { H: "#eef4fa", h: "#c4d1e0", n: "#8495ab", m: "#58667a" },
  auburn: { H: "#d97848", h: "#ab4c29", n: "#752c16", m: "#4d1b0d" },
  obsidian: { H: "#5c667d", h: "#373e4f", n: "#202533", m: "#141720" },
  golden: { H: "#ffe074", h: "#deb03c", n: "#a87b1f", m: "#785310" },
  crimson: { H: "#f05a54", h: "#bd2f2f", n: "#801b1e", m: "#4f0f13" },
  emerald: { H: "#6be09a", h: "#36a669", n: "#1e6e44", m: "#114229" },
};

const TUNIC_RAMPS: Record<
  TunicColorId,
  { B: string; b: string; u: string }
> = {
  cobalt: { B: "#3c74c9", b: "#265094", u: "#183363" },
  emerald: { B: "#348a54", b: "#22613a", u: "#143d24" },
  crimson: { B: "#b53c42", b: "#822328", u: "#571418" },
  slate: { B: "#5a6375", b: "#3c4352", u: "#252a36" },
  amethyst: { B: "#7d54ba", b: "#543387", u: "#341e59" },
  ivory: { B: "#e8e0cc", b: "#bfb399", u: "#8a7e67" },
};

const CLOAK_RAMPS: Record<
  CloakStyleId,
  { C: string; c: string; r: string }
> = {
  crimson_scarf: { C: "#d44642", c: "#9e2929", r: "#66171a" },
  forest_mantle: { C: "#468a4d", c: "#2b6132", r: "#1a3d1f" },
  royal_cape: { C: "#7252ba", c: "#4e338c", r: "#301d5c" },
  fur_pauldrons: { C: "#d9ccb8", c: "#a6957c", r: "#6e604d" },
  none: { C: "#9c8566", c: "#6e5a42", r: "#4a3b2a" },
};

const WEAPON_RAMPS: Record<
  WeaponStyleId,
  { I: string; i: string; j: string; P: string; p: string }
> = {
  knight_blade: {
    I: "#eef6ff",
    i: "#b4c8de",
    j: "#6f86a1",
    P: "#e5b84b",
    p: "#a87e24",
  },
  relic_gold: {
    I: "#fff6cc",
    i: "#ffd866",
    j: "#c48d24",
    P: "#fff2a6",
    p: "#d4982a",
  },
  runic_edge: {
    I: "#d4f7ff",
    i: "#6ccce8",
    j: "#2e7e9e",
    P: "#9bf0ff",
    p: "#3a94b5",
  },
};

export const SKIN_TONE_OPTIONS: readonly AppearanceOption<SkinToneId>[] = [
  { id: "fair", label: "Fair", swatch: SKIN_RAMPS.fair.S },
  { id: "warm", label: "Warm", swatch: SKIN_RAMPS.warm.S },
  { id: "tan", label: "Tan", swatch: SKIN_RAMPS.tan.S },
  { id: "deep", label: "Deep", swatch: SKIN_RAMPS.deep.S },
];

export const HAIR_STYLE_OPTIONS: readonly AppearanceOption<HairStyleId>[] = [
  { id: "windswept", label: "Windswept" },
  { id: "noble", label: "Noble" },
  { id: "braided", label: "Braided" },
  { id: "hooded", label: "Hooded" },
  { id: "knight_helm", label: "Knight Helm" },
  { id: "mage_hat", label: "Mage Hat" },
];

export const HAIR_COLOR_OPTIONS: readonly AppearanceOption<HairColorId>[] = [
  { id: "silver", label: "Silver", swatch: HAIR_RAMPS.silver.H },
  { id: "auburn", label: "Auburn", swatch: HAIR_RAMPS.auburn.H },
  { id: "obsidian", label: "Obsidian", swatch: HAIR_RAMPS.obsidian.H },
  { id: "golden", label: "Golden", swatch: HAIR_RAMPS.golden.H },
  { id: "crimson", label: "Crimson", swatch: HAIR_RAMPS.crimson.H },
  { id: "emerald", label: "Emerald", swatch: HAIR_RAMPS.emerald.H },
];

export const TUNIC_COLOR_OPTIONS: readonly AppearanceOption<TunicColorId>[] = [
  { id: "cobalt", label: "Cobalt", swatch: TUNIC_RAMPS.cobalt.B },
  { id: "emerald", label: "Emerald", swatch: TUNIC_RAMPS.emerald.B },
  { id: "crimson", label: "Crimson", swatch: TUNIC_RAMPS.crimson.B },
  { id: "slate", label: "Slate", swatch: TUNIC_RAMPS.slate.B },
  { id: "amethyst", label: "Amethyst", swatch: TUNIC_RAMPS.amethyst.B },
  { id: "ivory", label: "Ivory", swatch: TUNIC_RAMPS.ivory.B },
];

export const CLOAK_STYLE_OPTIONS: readonly AppearanceOption<CloakStyleId>[] = [
  { id: "crimson_scarf", label: "Crimson Scarf" },
  { id: "forest_mantle", label: "Forest Mantle" },
  { id: "royal_cape", label: "Royal Cape" },
  { id: "fur_pauldrons", label: "Fur Pauldrons" },
  { id: "none", label: "None" },
];

export const WEAPON_STYLE_OPTIONS: readonly AppearanceOption<WeaponStyleId>[] = [
  { id: "knight_blade", label: "Knight Blade" },
  { id: "relic_gold", label: "Relic Gold" },
  { id: "runic_edge", label: "Runic Edge" },
];

/**
 * Resolves a CharacterAppearance into a full palette dictionary for 24x32 layer grids.
 */
export function resolveAppearancePalette(
  appearance: CharacterAppearance,
): Record<string, string> {
  const skin = SKIN_RAMPS[appearance.skinTone];
  const hair = HAIR_RAMPS[appearance.hairColor];
  const tunic = TUNIC_RAMPS[appearance.tunicColor];
  const cloak = CLOAK_RAMPS[appearance.cloakStyle];
  const weapon = WEAPON_RAMPS[appearance.weaponStyle];

  return {
    K: "#181210", // Deep ink outline
    E: "#1e2436", // Eye dark iris
    e: "#f7fafc", // Eye glint
    W: "#edf3fa", // Steel highlight
    w: "#9fb0c7", // Steel midtone
    G: "#f0c654", // Gold trim highlight
    g: "#a67a21", // Gold trim shadow
    L: "#6e4628", // Leather highlight
    l: "#4a2c17", // Leather midtone
    f: "#2e1a0d", // Leather shadow
    ...skin,
    ...hair,
    ...tunic,
    ...cloak,
    ...weapon,
  };
}

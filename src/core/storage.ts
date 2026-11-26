import {
  type CharacterAppearance,
  CLOAK_STYLE_OPTIONS,
  DEFAULT_ALDEN_APPEARANCE,
  DEFAULT_HERO_NAME,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  type HeroProfile,
  SKIN_TONE_OPTIONS,
  TUNIC_COLOR_OPTIONS,
  WEAPON_STYLE_OPTIONS,
} from "../config/characterAppearance.ts";

export const HERO_PROFILE_STORAGE_KEY = "aethelgard_vale_hero_profile_v1";
export const HERO_NAME_MAX_LENGTH = 16;

export const DEFAULT_HERO_PROFILE: HeroProfile = {
  name: DEFAULT_HERO_NAME,
  appearance: { ...DEFAULT_ALDEN_APPEARANCE },
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const VALID_SKIN_TONES = new Set<string>(SKIN_TONE_OPTIONS.map((o) => o.id));
const VALID_HAIR_STYLES = new Set<string>(HAIR_STYLE_OPTIONS.map((o) => o.id));
const VALID_HAIR_COLORS = new Set<string>(HAIR_COLOR_OPTIONS.map((o) => o.id));
const VALID_TUNIC_COLORS = new Set<string>(TUNIC_COLOR_OPTIONS.map((o) => o.id));
const VALID_CLOAK_STYLES = new Set<string>(CLOAK_STYLE_OPTIONS.map((o) => o.id));
const VALID_WEAPON_STYLES = new Set<string>(
  WEAPON_STYLE_OPTIONS.map((o) => o.id),
);

function pickValidId<T extends string>(
  raw: unknown,
  validIds: ReadonlySet<string>,
  fallback: T,
): T {
  return typeof raw === "string" && validIds.has(raw) ? (raw as T) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalizes a custom hero name, falling back to DEFAULT_HERO_NAME if blank or invalid.
 */
export function sanitizeHeroName(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_HERO_NAME;
  const normalized = raw.trim().replace(/\s+/g, " ");
  if (!normalized) return DEFAULT_HERO_NAME;
  return normalized.slice(0, HERO_NAME_MAX_LENGTH);
}

/**
 * Validates an appearance object field-by-field against known option IDs.
 */
export function validateAppearance(raw: unknown): CharacterAppearance {
  if (!isRecord(raw)) {
    return { ...DEFAULT_ALDEN_APPEARANCE };
  }
  return {
    skinTone: pickValidId(
      raw.skinTone,
      VALID_SKIN_TONES,
      DEFAULT_ALDEN_APPEARANCE.skinTone,
    ),
    hairStyle: pickValidId(
      raw.hairStyle,
      VALID_HAIR_STYLES,
      DEFAULT_ALDEN_APPEARANCE.hairStyle,
    ),
    hairColor: pickValidId(
      raw.hairColor,
      VALID_HAIR_COLORS,
      DEFAULT_ALDEN_APPEARANCE.hairColor,
    ),
    tunicColor: pickValidId(
      raw.tunicColor,
      VALID_TUNIC_COLORS,
      DEFAULT_ALDEN_APPEARANCE.tunicColor,
    ),
    cloakStyle: pickValidId(
      raw.cloakStyle,
      VALID_CLOAK_STYLES,
      DEFAULT_ALDEN_APPEARANCE.cloakStyle,
    ),
    weaponStyle: pickValidId(
      raw.weaponStyle,
      VALID_WEAPON_STYLES,
      DEFAULT_ALDEN_APPEARANCE.weaponStyle,
    ),
  };
}

/**
 * Validates a full hero profile payload, preserving valid fields and falling back gracefully.
 */
export function validateHeroProfile(raw: unknown): HeroProfile {
  if (!isRecord(raw)) {
    return {
      name: DEFAULT_HERO_NAME,
      appearance: { ...DEFAULT_ALDEN_APPEARANCE },
    };
  }
  return {
    name: sanitizeHeroName(raw.name),
    appearance: validateAppearance(raw.appearance),
  };
}

export function serializeHeroProfile(profile: HeroProfile): string {
  const sanitized = validateHeroProfile(profile);
  return JSON.stringify(sanitized);
}

export function parseHeroProfile(
  serialized: string | null | undefined,
): HeroProfile {
  if (typeof serialized !== "string" || !serialized.trim()) {
    return {
      name: DEFAULT_HERO_NAME,
      appearance: { ...DEFAULT_ALDEN_APPEARANCE },
    };
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    return validateHeroProfile(parsed);
  } catch {
    return {
      name: DEFAULT_HERO_NAME,
      appearance: { ...DEFAULT_ALDEN_APPEARANCE },
    };
  }
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
      return globalThis.localStorage;
    }
  } catch {
    // Accessing localStorage can throw in restricted browser contexts.
  }
  return null;
}

export function loadHeroProfile(
  storage: StorageLike | null = getDefaultStorage(),
): HeroProfile {
  if (!storage) {
    return {
      name: DEFAULT_HERO_NAME,
      appearance: { ...DEFAULT_ALDEN_APPEARANCE },
    };
  }
  try {
    return parseHeroProfile(storage.getItem(HERO_PROFILE_STORAGE_KEY));
  } catch {
    return {
      name: DEFAULT_HERO_NAME,
      appearance: { ...DEFAULT_ALDEN_APPEARANCE },
    };
  }
}

export function saveHeroProfile(
  profile: HeroProfile,
  storage: StorageLike | null = getDefaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(HERO_PROFILE_STORAGE_KEY, serializeHeroProfile(profile));
    return true;
  } catch {
    return false;
  }
}

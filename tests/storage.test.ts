import { describe, expect, test } from "bun:test";
import {
  DEFAULT_ALDEN_APPEARANCE,
  DEFAULT_HERO_NAME,
  type HeroProfile,
} from "../src/config/characterAppearance.ts";
import {
  DEFAULT_HERO_PROFILE,
  HERO_NAME_MAX_LENGTH,
  HERO_PROFILE_STORAGE_KEY,
  type StorageLike,
  loadHeroProfile,
  parseHeroProfile,
  sanitizeHeroName,
  saveHeroProfile,
  serializeHeroProfile,
  validateAppearance,
} from "../src/core/storage.ts";

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("hero profile localStorage persistence & validation", () => {
  test("round-trips a custom hero profile including expanded EAM-18 options", () => {
    const profile: HeroProfile = {
      name: "Vaelen",
      appearance: {
        skinTone: "tan",
        hairStyle: "knight_helm",
        hairColor: "crimson",
        tunicColor: "amethyst",
        cloakStyle: "fur_pauldrons",
        weaponStyle: "runic_edge",
      },
    };

    const storage = createMemoryStorage();
    expect(saveHeroProfile(profile, storage)).toBe(true);

    const raw = storage.getItem(HERO_PROFILE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(loadHeroProfile(storage)).toEqual(profile);
  });

  test("falls back gracefully on corrupted JSON or non-object payloads", () => {
    expect(parseHeroProfile(null)).toEqual(DEFAULT_HERO_PROFILE);
    expect(parseHeroProfile("")).toEqual(DEFAULT_HERO_PROFILE);
    expect(parseHeroProfile("{not valid json")).toEqual(DEFAULT_HERO_PROFILE);
    expect(parseHeroProfile(JSON.stringify("string-payload"))).toEqual(
      DEFAULT_HERO_PROFILE,
    );
    expect(parseHeroProfile(JSON.stringify([1, 2, 3]))).toEqual(
      DEFAULT_HERO_PROFILE,
    );
  });

  test("preserves valid fields while falling back outdated or invalid option IDs", () => {
    const partiallyCorrupt = JSON.stringify({
      name: "  Ser   Kael  ",
      appearance: {
        skinTone: "deep",
        hairStyle: "outdated_mohawk",
        hairColor: "emerald",
        tunicColor: "neon_pink",
        cloakStyle: "fur_pauldrons",
        weaponStyle: 42,
      },
    });

    const parsed = parseHeroProfile(partiallyCorrupt);
    expect(parsed.name).toBe("Ser Kael");
    expect(parsed.appearance).toEqual({
      skinTone: "deep",
      hairStyle: DEFAULT_ALDEN_APPEARANCE.hairStyle,
      hairColor: "emerald",
      tunicColor: DEFAULT_ALDEN_APPEARANCE.tunicColor,
      cloakStyle: "fur_pauldrons",
      weaponStyle: DEFAULT_ALDEN_APPEARANCE.weaponStyle,
    });

    expect(validateAppearance(null)).toEqual(DEFAULT_ALDEN_APPEARANCE);
  });

  test("sanitizes, trims, and clamps hero names", () => {
    expect(sanitizeHeroName("   ")).toBe(DEFAULT_HERO_NAME);
    expect(sanitizeHeroName(1234)).toBe(DEFAULT_HERO_NAME);
    expect(sanitizeHeroName("  Lyra   of   Vale  ")).toBe("Lyra of Vale");
    const longName = "MaximilianusTheGrandKnight";
    expect(sanitizeHeroName(longName).length).toBe(HERO_NAME_MAX_LENGTH);
    expect(sanitizeHeroName(longName)).toBe(
      longName.slice(0, HERO_NAME_MAX_LENGTH),
    );
  });

  test("handles missing or throwing storage without crashing", () => {
    expect(loadHeroProfile(null)).toEqual(DEFAULT_HERO_PROFILE);
    expect(saveHeroProfile(DEFAULT_HERO_PROFILE, null)).toBe(false);

    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };

    expect(loadHeroProfile(throwingStorage)).toEqual(DEFAULT_HERO_PROFILE);
    expect(saveHeroProfile(DEFAULT_HERO_PROFILE, throwingStorage)).toBe(false);
  });

  test("serializeHeroProfile sanitizes dirty input before serializing", () => {
    const json = serializeHeroProfile({
      name: "   ",
      appearance: {
        ...DEFAULT_ALDEN_APPEARANCE,
        hairStyle: "mage_hat",
      },
    });
    expect(parseHeroProfile(json)).toEqual({
      name: DEFAULT_HERO_NAME,
      appearance: {
        ...DEFAULT_ALDEN_APPEARANCE,
        hairStyle: "mage_hat",
      },
    });
  });
});

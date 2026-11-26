import type { SlimeTier } from "../core/types.ts";

export const SLIME_GRIDS = {
  idle1: [
    "................",
    "................",
    "......KKKK......",
    "....KKHHHHKK....",
    "...KHHMMMMMMK...",
    "..KHWWMMMMMMMK..",
    "..KHWMMMMMMMMK..",
    ".KMMMKMMMMKMMMK.",
    ".KMMMKMMMMKMMMK.",
    ".KMMMMMMMMMMMMK.",
    ".KDDDDMMMMMMMMK.",
    "..KDDDDDDDDDDK..",
    "...KKKKKKKKKK...",
    "................",
  ],
  idle2: [
    "................",
    "................",
    "................",
    ".....KKKKKK.....",
    "...KKHHHHHHKK...",
    "..KHHWMMMMMMMK..",
    ".KHHWMMMMMMMMMK.",
    ".KMMMKMMMMKMMMK.",
    "KMMMMKMMMMKMMMMK",
    "KMMMMMMMMMMMMMMK",
    "KDDDDDMMMMMMMMMK",
    ".KDDDDDDDDDDDDK.",
    "..KKKKKKKKKKKK..",
    "................",
  ],
  hop: [
    ".....KKKKKK.....",
    "....KHHHHHHK....",
    "...KHHWMMMMMK...",
    "..KHHWMMMMMMMK..",
    "..KMMMMMMMMMMK..",
    "..KMMKMMMMKMMK..",
    "..KMMKMMMMKMMK..",
    "..KMMMMMMMMMMK..",
    "..KDDDMMMMMMMK..",
    "...KDDDDDDDDK...",
    "....KKKKKKKK....",
    "................",
    "................",
    "................",
  ],
  crownRows: [
    "....K.K..K.K....",
    "....KYKYYKYK....",
    "....KYYYYYYK....",
  ],
} as const;

export const SLIME_PALETTES: Record<
  SlimeTier,
  { H: string; M: string; D: string; crowned: boolean }
> = {
  green: { H: "#9bf06e", M: "#45b84d", D: "#247332", crowned: false },
  blue: { H: "#8ee6ff", M: "#3395db", D: "#1d568f", crowned: false },
  red: { H: "#ff9c75", M: "#de4537", D: "#8c1d1f", crowned: false },
  king: { H: "#ffe588", M: "#d99826", D: "#875114", crowned: true },
};

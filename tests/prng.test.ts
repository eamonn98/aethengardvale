import { describe, expect, test } from "bun:test";
import { mulberry32 } from "../src/core/prng.ts";

describe("mulberry32 PRNG", () => {
  test("produces deterministic sequences for identical seeds", () => {
    const a = mulberry32(4219);
    const b = mulberry32(4219);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  test("diverges for different seeds", () => {
    const a = mulberry32(4219);
    const b = mulberry32(9001);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  test("always emits numbers in [0, 1)", () => {
    const rng = mulberry32(1337);
    for (let i = 0; i < 10_000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

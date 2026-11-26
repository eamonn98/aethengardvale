import { describe, expect, test } from "bun:test";
import {
  PICKUP_BOB_AMPLITUDE,
  PICKUP_GLINT_DUTY,
  PICKUP_GLINT_PERIOD,
  pickupBobY,
  pickupGlintFrame,
  pickupTilt,
} from "../src/gameplay/pickupAnimation.ts";

describe("pickupBobY", () => {
  test("stays within the configured amplitude", () => {
    for (let age = 0; age < 8; age += 0.05) {
      expect(Math.abs(pickupBobY(age))).toBeLessThanOrEqual(
        PICKUP_BOB_AMPLITUDE + 1e-9,
      );
    }
  });

  test("repeats every full sine period", () => {
    const period = (Math.PI * 2) / 5;
    expect(pickupBobY(0.3)).toBeCloseTo(pickupBobY(0.3 + period), 10);
  });

  test("starts at rest and peaks a quarter period in", () => {
    expect(pickupBobY(0)).toBe(0);
    expect(pickupBobY(Math.PI / 10)).toBeCloseTo(PICKUP_BOB_AMPLITUDE, 10);
  });
});

describe("pickupTilt", () => {
  test("stays a subtle roll", () => {
    for (let age = 0; age < 6; age += 0.05) {
      expect(Math.abs(pickupTilt(age))).toBeLessThanOrEqual(0.08);
    }
  });
});

describe("pickupGlintFrame", () => {
  test("shows the base frame outside the duty window", () => {
    expect(pickupGlintFrame(PICKUP_GLINT_DUTY + 0.01)).toBe(0);
    expect(pickupGlintFrame(PICKUP_GLINT_PERIOD / 2)).toBe(0);
    expect(pickupGlintFrame(PICKUP_GLINT_PERIOD)).toBe(1);
  });

  test("shows the glint frame from spawn and inside the duty window", () => {
    expect(pickupGlintFrame(0)).toBe(1);
    expect(pickupGlintFrame(0.01)).toBe(1);
    expect(pickupGlintFrame(PICKUP_GLINT_DUTY - 0.01)).toBe(1);
  });

  test("flashes once per period", () => {
    const flashes: number[] = [];
    for (let age = 0; age < PICKUP_GLINT_PERIOD * 2; age += 0.01) {
      if (pickupGlintFrame(age) === 1) flashes.push(age);
    }
    const periods = [
      ...new Set(flashes.map((age) => Math.floor(age / PICKUP_GLINT_PERIOD))),
    ];
    expect(periods).toEqual([0, 1]);
  });
});

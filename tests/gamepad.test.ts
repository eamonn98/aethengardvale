import { describe, expect, test } from "bun:test";
import {
  gamepadButtonPressed,
  normalizeStick,
} from "../src/core/gamepad.ts";

const DIAG = Math.SQRT1_2;

describe("gamepad stick deadzone normalization", () => {
  test("neutral axes produce no movement", () => {
    expect(normalizeStick(0, 0)).toEqual({ x: 0, z: 0 });
  });

  test("applies an inclusive radial deadzone", () => {
    expect(normalizeStick(0.1, -0.1)).toEqual({ x: 0, z: 0 });
    expect(normalizeStick(0.25, 0)).toEqual({ x: 0, z: 0 });
    expect(normalizeStick(0.26, 0)).toEqual({ x: 1, z: 0 });
  });

  test("snaps off-axis pushes to the dominant cardinal direction", () => {
    expect(normalizeStick(0.9, 0.05)).toEqual({ x: 1, z: 0 });
    expect(normalizeStick(-0.05, -0.9)).toEqual({ x: 0, z: -1 });
    // ~15 degrees off horizontal: still inside the cardinal sector.
    expect(normalizeStick(0.9, -0.24)).toEqual({ x: 1, z: 0 });
  });

  test("snaps diagonal pushes to unit diagonals", () => {
    const upRight = normalizeStick(0.7, -0.7);
    expect(upRight.x).toBeCloseTo(DIAG, 10);
    expect(upRight.z).toBeCloseTo(-DIAG, 10);

    const downLeft = normalizeStick(-0.8, 0.8);
    expect(downLeft.x).toBeCloseTo(-DIAG, 10);
    expect(downLeft.z).toBeCloseTo(DIAG, 10);
  });

  test("honors a custom deadzone", () => {
    expect(normalizeStick(0.4, 0, 0.5)).toEqual({ x: 0, z: 0 });
    expect(normalizeStick(0.6, 0, 0.5)).toEqual({ x: 1, z: 0 });
  });

  test("clamps out-of-range axis values", () => {
    expect(normalizeStick(3, 0)).toEqual({ x: 1, z: 0 });
    expect(normalizeStick(-2, 2)).toEqual({ x: -DIAG, z: DIAG });
  });
});

describe("gamepad button detection", () => {
  test("treats digital presses and analog trigger values as one state", () => {
    expect(gamepadButtonPressed({ pressed: true, value: 0 })).toBe(true);
    expect(gamepadButtonPressed({ pressed: false, value: 0.7 })).toBe(true);
    expect(gamepadButtonPressed({ pressed: false, value: 0.4 })).toBe(false);
    expect(gamepadButtonPressed({ pressed: false, value: 0.2 }, 0.2)).toBe(true);
  });
});

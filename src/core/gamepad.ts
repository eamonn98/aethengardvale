import type { SpriteDir, Vec2 } from "./types.ts";

/** Radial deadzone applied to the left stick, in gamepad axis units (`0..1`). */
export const GAMEPAD_DEADZONE = 0.25;

/** Analog triggers report partial values; anything at or above this counts as pressed. */
export const GAMEPAD_BUTTON_THRESHOLD = 0.5;

export type GamepadAction = "attack" | "dash" | "interact" | "spell";

export const GAMEPAD_ACTIONS: readonly GamepadAction[] = [
  "attack",
  "dash",
  "interact",
  "spell",
];

/**
 * Standard-mapping button indices: face button plus a shoulder/trigger secondary.
 * `0` A, `1` B, `2` X, `3` Y, `4` LB, `5` RB, `6` LT, `7` RT.
 */
export const GAMEPAD_BUTTON_MAP: Readonly<
  Record<GamepadAction, readonly number[]>
> = {
  attack: [0, 5],
  dash: [1, 4],
  interact: [2, 7],
  spell: [3, 6],
};

/** Standard-mapping D-pad button indices: `12` up, `13` down, `14` left, `15` right. */
export const GAMEPAD_DPAD_MAP: Readonly<Record<SpriteDir, number>> = {
  up: 12,
  down: 13,
  left: 14,
  right: 15,
};

/** `tan(22.5°)`: half-width of a snapped 8-way sector. */
const SNAP_RATIO = Math.tan(Math.PI / 8);

const clampAxis = (value: number): number => Math.max(-1, Math.min(1, value));

/**
 * Converts raw left-stick axes (`x` = axis 0, `y` = axis 1, negative `y` = north)
 * into a unit 8-way movement vector, applying an inclusive radial deadzone first.
 * Returns a direction only: the player controller normalizes its input anyway.
 */
export function normalizeStick(
  x: number,
  y: number,
  deadzone: number = GAMEPAD_DEADZONE,
): Vec2 {
  const ax = clampAxis(x);
  const az = clampAxis(y);
  if (ax === 0 && az === 0) return { x: 0, z: 0 };
  if (Math.hypot(ax, az) <= deadzone) return { x: 0, z: 0 };

  const magX = Math.abs(ax);
  const magZ = Math.abs(az);
  const signX = ax < 0 ? -1 : 1;
  const signZ = az < 0 ? -1 : 1;

  if (magX < magZ * SNAP_RATIO) return { x: 0, z: signZ };
  if (magZ < magX * SNAP_RATIO) return { x: signX, z: 0 };
  return { x: signX * Math.SQRT1_2, z: signZ * Math.SQRT1_2 };
}

/** Reads a digital `pressed` state or an analog trigger `value` as one boolean. */
export function gamepadButtonPressed(
  button: { pressed: boolean; value: number },
  threshold: number = GAMEPAD_BUTTON_THRESHOLD,
): boolean {
  return button.pressed || button.value >= threshold;
}

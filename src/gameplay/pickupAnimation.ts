export const PICKUP_BOB_AMPLITUDE = 0.14;
export const PICKUP_BOB_SPEED = 5;
export const PICKUP_GLINT_PERIOD = 2.6;
export const PICKUP_GLINT_DUTY = 0.16;

/** Vertical hover offset for a pickup sprite, in world units. */
export function pickupBobY(age: number): number {
  return Math.sin(age * PICKUP_BOB_SPEED) * PICKUP_BOB_AMPLITUDE;
}

/** Subtle roll so the quad catches light without turning edge-on to the camera. */
export function pickupTilt(age: number): number {
  return Math.sin(age * 2.2) * 0.07;
}

/** 1 while the glint frame is displayed, 0 for the base frame. */
export function pickupGlintFrame(age: number): 0 | 1 {
  return age % PICKUP_GLINT_PERIOD < PICKUP_GLINT_DUTY ? 1 : 0;
}

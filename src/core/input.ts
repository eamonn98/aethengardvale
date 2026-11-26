import type { Vec2 } from "./types.ts";

export interface InputActions {
  onAttack?: () => void;
  onDash?: () => void;
  onInteract?: () => void;
  onToggleDof?: () => void;
  onToggleAudio?: () => void;
  onReset?: () => void;
  onMouseAttack?: () => void;
}

const PREVENT_DEFAULT_KEYS = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/**
 * Tracks keyboard state and discrete combat/UI action bindings.
 */
export class InputManager {
  private keys = new Map<string, boolean>();
  private actions: InputActions;
  private clickTarget: HTMLElement | null;

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    this.keys.set(code, true);
    if (PREVENT_DEFAULT_KEYS.has(code)) {
      e.preventDefault();
    }
    if (code === "Space" || code === "KeyJ" || code === "KeyZ") {
      this.actions.onAttack?.();
    }
    if (
      code === "ShiftLeft" ||
      code === "ShiftRight" ||
      code === "KeyK" ||
      code === "KeyX"
    ) {
      this.actions.onDash?.();
    }
    if (code === "KeyE") this.actions.onInteract?.();
    if (code === "KeyT") this.actions.onToggleDof?.();
    if (code === "KeyM") this.actions.onToggleAudio?.();
    if (code === "KeyR") this.actions.onReset?.();
  };

  private readonly handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.set(e.code, false);
  };

  private readonly handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.actions.onMouseAttack?.();
    }
  };

  constructor(actions: InputActions, clickTarget: HTMLElement | null = null) {
    this.actions = actions;
    this.clickTarget = clickTarget;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.clickTarget?.addEventListener("mousedown", this.handleMouseDown);
  }

  isDown(code: string): boolean {
    return this.keys.get(code) === true;
  }

  getMoveVector(): Vec2 {
    let x = 0;
    let z = 0;
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) z -= 1;
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) z += 1;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    return { x, z };
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.clickTarget?.removeEventListener("mousedown", this.handleMouseDown);
  }
}

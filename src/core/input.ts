import {
  GAMEPAD_ACTIONS,
  GAMEPAD_BUTTON_MAP,
  GAMEPAD_DPAD_MAP,
  type GamepadAction,
  gamepadButtonPressed,
  normalizeStick,
} from "./gamepad.ts";
import type { SpriteDir, Vec2 } from "./types.ts";

export interface InputActions {
  onAttack?: () => void;
  onDash?: () => void;
  onInteract?: () => void;
  onSpell?: () => void;
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

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));

const isTouchDirection = (value: string | undefined): value is SpriteDir =>
  value === "up" ||
  value === "down" ||
  value === "left" ||
  value === "right";

const isTouchAction = (value: string | undefined): value is GamepadAction =>
  value === "attack" ||
  value === "dash" ||
  value === "interact" ||
  value === "spell";

/**
 * Tracks keyboard state, polls a standard-mapping gamepad, and translates
 * coarse-pointer virtual controls into the same discrete combat/UI bindings.
 */
export class InputManager {
  private keys = new Map<string, boolean>();
  private actions: InputActions;
  private clickTarget: HTMLElement | null;
  private paused = false;
  private touchRoot: HTMLElement | null;
  private readonly touchDirs = new Set<SpriteDir>();
  private gamepadVector: Vec2 = { x: 0, z: 0 };
  private prevGamepadButtons: readonly boolean[] = [];

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    if (this.paused) return;
    if (
      e.target instanceof HTMLElement &&
      (e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable)
    ) {
      return;
    }

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
    if (this.paused) return;
    if (e.button === 0) {
      this.actions.onMouseAttack?.();
    }
  };

  private readonly handlePointerDown = (e: PointerEvent): void => {
    if (this.paused) return;
    const button = this.getTouchButton(e.target);
    if (!button) return;
    e.preventDefault();
    try {
      button.setPointerCapture(e.pointerId);
    } catch {
      // Safari rejects capture for pointers released mid-gesture; pointercancel still clears state.
    }
    button.classList.add("pressed");

    const direction = button.dataset.move;
    if (isTouchDirection(direction)) this.touchDirs.add(direction);

    const action = button.dataset.action;
    if (isTouchAction(action)) this.fireAction(action);
  };

  private readonly handlePointerUp = (e: PointerEvent): void => {
    const button = this.getTouchButton(e.target);
    if (!button) return;
    button.classList.remove("pressed");

    const direction = button.dataset.move;
    if (isTouchDirection(direction)) this.touchDirs.delete(direction);
  };

  constructor(
    actions: InputActions,
    clickTarget: HTMLElement | null = null,
    touchRoot: HTMLElement | null = null,
  ) {
    this.actions = actions;
    this.clickTarget = clickTarget;
    this.touchRoot = touchRoot;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.clickTarget?.addEventListener("mousedown", this.handleMouseDown);
    this.touchRoot?.addEventListener("pointerdown", this.handlePointerDown);
    this.touchRoot?.addEventListener("pointerup", this.handlePointerUp);
    this.touchRoot?.addEventListener("pointercancel", this.handlePointerUp);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.keys.clear();
      this.touchDirs.clear();
      this.gamepadVector = { x: 0, z: 0 };
      this.prevGamepadButtons = [];
    }
  }

  isDown(code: string): boolean {
    return this.keys.get(code) === true;
  }

  /** Samples gamepad buttons and stick axes once per gameplay frame. */
  update(): void {
    this.pollGamepad();
  }

  getMoveVector(): Vec2 {
    let x = 0;
    let z = 0;
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) z -= 1;
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) z += 1;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    if (this.touchDirs.has("up")) z -= 1;
    if (this.touchDirs.has("down")) z += 1;
    if (this.touchDirs.has("left")) x -= 1;
    if (this.touchDirs.has("right")) x += 1;

    x = clampUnit(x);
    z = clampUnit(z);
    if (x !== 0 || z !== 0) return { x, z };
    return { x: this.gamepadVector.x, z: this.gamepadVector.z };
  }

  private pollGamepad(): void {
    if (this.paused) return;
    if (
      typeof navigator === "undefined" ||
      typeof navigator.getGamepads !== "function"
    ) {
      return;
    }

    const pad = Array.from(navigator.getGamepads()).find(
      (candidate): candidate is Gamepad =>
        candidate !== null && candidate.connected,
    );
    if (!pad) {
      this.gamepadVector = { x: 0, z: 0 };
      this.prevGamepadButtons = [];
      return;
    }

    const pressed = pad.buttons.map((button) =>
      gamepadButtonPressed(button),
    );
    this.gamepadVector = this.readGamepadMove(pad, pressed);

    for (const action of GAMEPAD_ACTIONS) {
      const indices = GAMEPAD_BUTTON_MAP[action];
      const isPressed = indices.some((index) => pressed[index] === true);
      const wasPressed = indices.some(
        (index) => this.prevGamepadButtons[index] === true,
      );
      if (isPressed && !wasPressed) this.fireAction(action);
    }
    this.prevGamepadButtons = pressed;
  }

  private readGamepadMove(pad: Gamepad, pressed: readonly boolean[]): Vec2 {
    let x = 0;
    let z = 0;
    if (pressed[GAMEPAD_DPAD_MAP.up] === true) z -= 1;
    if (pressed[GAMEPAD_DPAD_MAP.down] === true) z += 1;
    if (pressed[GAMEPAD_DPAD_MAP.left] === true) x -= 1;
    if (pressed[GAMEPAD_DPAD_MAP.right] === true) x += 1;
    if (x !== 0 || z !== 0) return { x, z };
    return normalizeStick(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
  }

  private fireAction(action: GamepadAction): void {
    switch (action) {
      case "attack":
        this.actions.onAttack?.();
        break;
      case "dash":
        this.actions.onDash?.();
        break;
      case "interact":
        this.actions.onInteract?.();
        break;
      case "spell":
        this.actions.onSpell?.();
        break;
    }
  }

  private getTouchButton(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null;
    const button = target.closest<HTMLElement>("[data-move], [data-action]");
    if (!button || !this.touchRoot?.contains(button)) return null;
    return button;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.clickTarget?.removeEventListener("mousedown", this.handleMouseDown);
    this.touchRoot?.removeEventListener("pointerdown", this.handlePointerDown);
    this.touchRoot?.removeEventListener("pointerup", this.handlePointerUp);
    this.touchRoot?.removeEventListener(
      "pointercancel",
      this.handlePointerUp,
    );
  }
}

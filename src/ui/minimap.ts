import {
  BRIDGE_HALF_X,
  BRIDGE_HALF_Z,
  RIVER_HALF_Z,
} from "../config/constants.ts";
import type { SlimeTier, Vec2 } from "../core/types.ts";

export interface MinimapSlimeMarker {
  x: number;
  z: number;
  tier: SlimeTier;
}

/**
 * Renders the circular Octopath-inspired minimap centered on the player.
 */
export class MinimapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to acquire minimap 2D context");
    }
    this.ctx = ctx;
  }

  draw(
    playerPos: Vec2,
    playerDir: Vec2,
    slimes: readonly MinimapSlimeMarker[],
    chest: { x: number; z: number; opened: boolean } | null,
  ): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const mmCtx = this.ctx;
    mmCtx.clearRect(0, 0, W, H);

    const scale = 2.65;
    const toMapX = (wx: number) => cx + (wx - playerPos.x) * scale;
    const toMapY = (wz: number) => cy + (wz - playerPos.z) * scale;

    mmCtx.save();
    mmCtx.beginPath();
    mmCtx.arc(cx, cy, W / 2 - 2, 0, Math.PI * 2);
    mmCtx.clip();

    mmCtx.fillStyle = "rgba(42, 85, 88, 0.72)";
    mmCtx.fillRect(0, toMapY(-RIVER_HALF_Z), W, RIVER_HALF_Z * 2 * scale);

    mmCtx.fillStyle = "#a89678";
    mmCtx.fillRect(
      toMapX(-BRIDGE_HALF_X),
      toMapY(-BRIDGE_HALF_Z),
      BRIDGE_HALF_X * 2 * scale,
      BRIDGE_HALF_Z * 2 * scale,
    );

    mmCtx.strokeStyle = "#c8b490";
    mmCtx.lineWidth = 2;
    mmCtx.beginPath();
    mmCtx.arc(toMapX(0), toMapY(-15.5), 14, 0, Math.PI * 2);
    mmCtx.stroke();

    if (chest && !chest.opened) {
      mmCtx.fillStyle = "#ffe066";
      mmCtx.fillRect(toMapX(chest.x) - 2.5, toMapY(chest.z) - 2.5, 5, 5);
    }

    for (const s of slimes) {
      mmCtx.fillStyle = s.tier === "king" ? "#ffd859" : "#ff5f56";
      mmCtx.beginPath();
      mmCtx.arc(
        toMapX(s.x),
        toMapY(s.z),
        s.tier === "king" ? 4.2 : 2.6,
        0,
        Math.PI * 2,
      );
      mmCtx.fill();
    }

    const ang = Math.atan2(playerDir.z, playerDir.x);
    mmCtx.translate(cx, cy);
    mmCtx.rotate(ang + Math.PI / 2);
    mmCtx.fillStyle = "#ffffff";
    mmCtx.beginPath();
    mmCtx.moveTo(0, -5);
    mmCtx.lineTo(3.6, 4);
    mmCtx.lineTo(0, 2);
    mmCtx.lineTo(-3.6, 4);
    mmCtx.closePath();
    mmCtx.fill();
    mmCtx.restore();
  }
}

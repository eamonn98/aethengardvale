import * as THREE from "three";

export interface CanvasContextPair {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface PixelTextureOptions {
  repeatX?: number;
  repeatY?: number;
  isColor?: boolean;
  wrap?: THREE.Wrapping;
}

export function makeCanvas(w: number, h: number): CanvasContextPair {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to acquire 2D canvas context");
  }
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Converts a canvas into a crisp nearest-neighbor pixel texture without mipmaps.
 */
export function canvasToPixelTexture(
  canvas: HTMLCanvasElement,
  { repeatX = 1, repeatY = 1, isColor = true, wrap }: PixelTextureOptions = {},
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS =
    wrap ?? (repeatX > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping);
  tex.wrapT =
    wrap ?? (repeatY > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping);
  if (repeatX > 1 || repeatY > 1) {
    tex.repeat.set(repeatX, repeatY);
  }
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Derives a grayscale bump map from a procedural color canvas via luminance contrast.
 */
export function generateBumpFromCanvas(
  srcCanvas: HTMLCanvasElement,
  contrast = 1.4,
): HTMLCanvasElement {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const { canvas, ctx } = makeCanvas(w, h);
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) {
    throw new Error("Failed to acquire source 2D canvas context");
  }
  const src = srcCtx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i] ?? 0;
    const g = src.data[i + 1] ?? 0;
    const b = src.data[i + 2] ?? 0;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const v = Math.max(0, Math.min(255, Math.round((lum - 128) * contrast + 128)));
    dst.data[i] = v;
    dst.data[i + 1] = v;
    dst.data[i + 2] = v;
    dst.data[i + 3] = 255;
  }
  ctx.putImageData(dst, 0, 0);
  return canvas;
}

/**
 * Renders an ASCII pixel grid onto an offscreen canvas using a character-to-color palette.
 */
export function drawGridSprite(
  rows: readonly string[],
  palette: Readonly<Record<string, string>>,
  flipX = false,
): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const { canvas, ctx } = makeCanvas(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    if (!row) continue;
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (!ch || ch === "." || ch === " ") continue;
      const col = palette[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flipX ? w - 1 - x : x, y, 1, 1);
    }
  }
  return canvas;
}

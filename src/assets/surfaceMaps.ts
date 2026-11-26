import * as THREE from "three";
import { makeCanvas } from "./canvasUtils.ts";

export interface SurfaceTextureOptions {
  filter?: THREE.MagnificationTextureFilter;
  repeatX?: number;
  repeatY?: number;
}

function sampleWrapped(
  field: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const wx = ((x % width) + width) % width;
  const wy = ((y % height) + height) % height;
  return field[wy * width + wx] ?? 0;
}

/**
 * Generates an OpenGL tangent-space RGBA normal map from a tileable [0, 1] heightfield
 * using a 3x3 Sobel kernel with toroidal edge wrapping.
 *
 * Convention matches Three.js `flipY = true` CanvasTextures:
 * - Raised stone left bevel (height rises left->right, dx > 0) tilts -X => R < 128
 * - Raised stone top bevel (height rises top->bottom in canvas Y, dy > 0) tilts +V/+Y => G > 128
 */
export function computeSobelNormals(
  heightField: Float32Array,
  width: number,
  height: number,
  strength = 2.5,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = sampleWrapped(heightField, width, height, x - 1, y - 1);
      const tc = sampleWrapped(heightField, width, height, x, y - 1);
      const tr = sampleWrapped(heightField, width, height, x + 1, y - 1);
      const ml = sampleWrapped(heightField, width, height, x - 1, y);
      const mr = sampleWrapped(heightField, width, height, x + 1, y);
      const bl = sampleWrapped(heightField, width, height, x - 1, y + 1);
      const bc = sampleWrapped(heightField, width, height, x, y + 1);
      const br = sampleWrapped(heightField, width, height, x + 1, y + 1);

      const dx = tr + 2 * mr + br - (tl + 2 * ml + bl);
      const dy = bl + 2 * bc + br - (tl + 2 * tc + tr);

      const nx = -dx * strength;
      const ny = dy * strength;
      const nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);

      const idx = (y * width + x) * 4;
      rgba[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      rgba[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      rgba[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      rgba[idx + 3] = 255;
    }
  }

  return rgba;
}

export function scalarFieldToCanvas(
  field: Float32Array,
  width: number,
  height: number,
): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height);
  const img = ctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const v = Math.max(0, Math.min(255, Math.round((field[i] ?? 0) * 255)));
    const p = i * 4;
    img.data[p] = v;
    img.data[p + 1] = v;
    img.data[p + 2] = v;
    img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function normalBytesToCanvas(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height);
  const img = ctx.createImageData(width, height);
  img.data.set(rgba);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Wraps a procedural normal, height, or roughness canvas into a linear-space CanvasTexture.
 */
export function canvasToSurfaceTexture(
  canvas: HTMLCanvasElement,
  {
    filter = THREE.NearestFilter,
    repeatX = 1,
    repeatY = 1,
  }: SurfaceTextureOptions = {},
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = filter;
  tex.minFilter = filter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.repeat.set(repeatX, repeatY);
  }
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

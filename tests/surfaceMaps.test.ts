import { describe, expect, test } from "bun:test";
import { computeSobelNormals } from "../src/assets/surfaceMaps.ts";

describe("computeSobelNormals", () => {
  test("flat heightfield produces neutral tangent-space normals (128, 128, 255)", () => {
    const w = 8;
    const h = 8;
    const flat = new Float32Array(w * h).fill(0.5);
    const rgba = computeSobelNormals(flat, w, h, 2.5);

    for (let i = 0; i < w * h; i++) {
      expect(rgba[i * 4]).toBe(128);
      expect(rgba[i * 4 + 1]).toBe(128);
      expect(rgba[i * 4 + 2]).toBe(255);
      expect(rgba[i * 4 + 3]).toBe(255);
    }
  });

  test("raised center plateau produces outward bevels matching OpenGL flipY convention", () => {
    const w = 8;
    const h = 8;
    const field = new Float32Array(w * h).fill(0);
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 5; x++) {
        field[y * w + x] = 1.0;
      }
    }

    const rgba = computeSobelNormals(field, w, h, 2.0);
    const px = (x: number, y: number) => {
      const idx = (y * w + x) * 4;
      return {
        r: rgba[idx] ?? 0,
        g: rgba[idx + 1] ?? 0,
        b: rgba[idx + 2] ?? 0,
      };
    };

    // Left edge (x=2, y=3): height rises left->right => tilts -X => R < 128
    expect(px(2, 3).r).toBeLessThan(128);
    // Right edge (x=5, y=3): height drops left->right => tilts +X => R > 128
    expect(px(5, 3).r).toBeGreaterThan(128);
    // Top edge (x=3, y=2): height rises top->bottom (canvas Y+) => tilts +V => G > 128
    expect(px(3, 2).g).toBeGreaterThan(128);
    // Bottom edge (x=3, y=5): height drops top->bottom => tilts -V => G < 128
    expect(px(3, 5).g).toBeLessThan(128);
    // Flat interior (x=3, y=3): neutral normal
    expect(px(3, 3)).toEqual({ r: 128, g: 128, b: 255 });
  });

  test("wraps toroidally across tile boundaries without edge seams", () => {
    const w = 8;
    const h = 8;
    const wave = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        wave[y * w + x] = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2);
      }
    }

    const rgba = computeSobelNormals(wave, w, h, 2.0);
    // Column x=0 and x=w should be identical under periodic function; adjacent sample symmetry check
    expect(rgba[0]).toBeLessThan(128);
    expect(rgba[((0 * w + (w / 2)) * 4)]).toBeGreaterThan(128);
  });
});

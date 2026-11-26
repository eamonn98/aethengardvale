import * as THREE from "three";
import { SEEDS } from "../config/constants.ts";
import { mulberry32 } from "../core/prng.ts";
import { canvasToPixelTexture, drawGridSprite, makeCanvas } from "./canvasUtils.ts";
import {
  canvasToSurfaceTexture,
  computeSobelNormals,
  normalBytesToCanvas,
  scalarFieldToCanvas,
} from "./surfaceMaps.ts";

export interface EnvironmentTextures {
  grassMap: THREE.CanvasTexture;
  grassNormal: THREE.CanvasTexture;
  grassHeight: THREE.CanvasTexture;
  grassRoughness: THREE.CanvasTexture;

  cobbleMap: THREE.CanvasTexture;
  cobbleNormal: THREE.CanvasTexture;
  cobbleHeight: THREE.CanvasTexture;
  cobbleRoughness: THREE.CanvasTexture;

  masonryMap: THREE.CanvasTexture;
  masonryNormal: THREE.CanvasTexture;
  masonryHeight: THREE.CanvasTexture;
  masonryRoughness: THREE.CanvasTexture;

  woodMap: THREE.CanvasTexture;
  woodNormal: THREE.CanvasTexture;
  woodHeight: THREE.CanvasTexture;
  woodRoughness: THREE.CanvasTexture;

  bannerMap: THREE.CanvasTexture;
  waterMap: THREE.CanvasTexture;
  waterNormal: THREE.CanvasTexture;
  treeMap: THREE.CanvasTexture;
  bushMap: THREE.CanvasTexture;
  flameTextures: THREE.CanvasTexture[];
  slashMap: THREE.CanvasTexture;
  coinMap: THREE.CanvasTexture;
  coinGlintMap: THREE.CanvasTexture;
  heartMap: THREE.CanvasTexture;
  heartGlintMap: THREE.CanvasTexture;
}

const COIN_PALETTE = {
  o: "#6b4a12",
  r: "#e0a92c",
  f: "#ffd852",
  h: "#ffe57a",
  d: "#b8791a",
  w: "#fffbe0",
} as const;

const HEART_PALETTE = {
  o: "#5c1220",
  b: "#ff5768",
  h: "#ff9aa6",
  w: "#fffbe0",
} as const;

const COIN_ROWS = [
  ".....oooooo.....",
  "...oorrrrrroo...",
  "..orrrrrrrrrro..",
  ".orhhhffffffrro.",
  ".orhhffffffffro.",
  "orhhffffffffffro",
  "orhfffffffffffro",
  "orfffffddfffffro",
  "orfffffddfffffro",
  "orhfffffffffffro",
  "orhhffffffffffro",
  ".orhhffffffffro.",
  ".orhhhffffffrro.",
  "..orrrrrrrrrro..",
  "...oorrrrrroo...",
  ".....oooooo.....",
] as const;

const HEART_ROWS = [
  "................",
  "...oo......oo...",
  "..obbo....obbo..",
  ".obbbbboobbbbbo.",
  ".obbbbbbbbbbbbo.",
  "ohbbbbbbbbbbbbbo",
  "ohbbbbbbbbbbbbbo",
  "obbbbbbbbbbbbbbo",
  ".obbbbbbbbbbbbo.",
  "..obbbbbbbbbbo..",
  "...obbbbbbbbo...",
  "....obbbbbbo....",
  ".....obbbbo.....",
  "......obbo......",
  ".......oo.......",
  "................",
] as const;

function buildSurfaceBundle(
  heightField: Float32Array,
  roughnessField: Float32Array,
  w: number,
  h: number,
  normalStrength: number,
  normalFilter: THREE.MagnificationTextureFilter = THREE.NearestFilter,
): {
  normal: THREE.CanvasTexture;
  height: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const normalBytes = computeSobelNormals(heightField, w, h, normalStrength);
  return {
    normal: canvasToSurfaceTexture(normalBytesToCanvas(normalBytes, w, h), {
      filter: normalFilter,
    }),
    height: canvasToSurfaceTexture(scalarFieldToCanvas(heightField, w, h), {
      filter: THREE.LinearFilter,
    }),
    roughness: canvasToSurfaceTexture(
      scalarFieldToCanvas(roughnessField, w, h),
      { filter: THREE.NearestFilter },
    ),
  };
}

function fillWrappedRect(
  field: Float32Array,
  w: number,
  h: number,
  x0: number,
  y0: number,
  rw: number,
  rh: number,
  fn: (lx: number, ly: number) => number,
): void {
  for (let ly = 0; ly < rh; ly++) {
    const wy = (((y0 + ly) % h) + h) % h;
    for (let lx = 0; lx < rw; lx++) {
      const wx = (((x0 + lx) % w) + w) % w;
      field[wy * w + wx] = fn(lx, ly);
    }
  }
}

export function buildEnvironmentTextures(): EnvironmentTextures {
  const rng = mulberry32(SEEDS.ENV_TEXTURES);

  // 1. Lush SNES Grass Tile (64x64, world-space repeated)
  const grassC = makeCanvas(64, 64);
  const grassH = new Float32Array(64 * 64);
  const grassR = new Float32Array(64 * 64);
  {
    const { ctx } = grassC;
    const basePalette = [
      "#4b6926",
      "#56762c",
      "#628332",
      "#3f5a20",
      "#6f9038",
    ] as const;
    const TWO_PI = Math.PI * 2;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const wave =
          Math.sin((x / 64) * TWO_PI * 2) * Math.cos((y / 64) * TWO_PI * 2);
        const jitter = (rng() - 0.5) * 1.4;
        const n = wave + jitter;
        const idx = Math.max(0, Math.min(4, Math.floor((n + 1.5) * 1.65)));
        ctx.fillStyle = basePalette[idx] ?? "#56762c";
        ctx.fillRect(x, y, 1, 1);

        const p = y * 64 + x;
        grassH[p] = 0.42 + idx * 0.08 + (rng() - 0.5) * 0.08;
        grassR[p] = 0.86 + (rng() - 0.5) * 0.08;
      }
    }
    for (let i = 0; i < 150; i++) {
      const gx = Math.floor(rng() * 64);
      const gy = Math.floor(rng() * 64);
      const isHighlight = rng() > 0.35;
      ctx.fillStyle = isHighlight ? "#7ea03f" : "#354b1a";
      ctx.fillRect(gx, gy, 1, 1);
      ctx.fillRect(gx, (gy + 1) % 64, 1, 1);
      grassH[gy * 64 + gx] = isHighlight ? 0.88 : 0.32;
      grassH[((gy + 1) % 64) * 64 + gx] = isHighlight ? 0.78 : 0.36;
      grassR[gy * 64 + gx] = isHighlight ? 0.74 : 0.94;
      if (rng() > 0.72) {
        ctx.fillStyle = "#97b84e";
        ctx.fillRect(gx, gy, 1, 1);
        grassH[gy * 64 + gx] = 0.94;
      }
    }
    const flowerCols = ["#f3de7e", "#e88b76", "#e7eedd"] as const;
    for (let i = 0; i < 9; i++) {
      const fx = Math.floor(rng() * 64);
      const fy = Math.floor(rng() * 64);
      ctx.fillStyle = flowerCols[Math.floor(rng() * flowerCols.length)] ?? "#f3de7e";
      ctx.fillRect(fx, fy, 1, 1);
      grassH[fy * 64 + fx] = 0.98;
      grassR[fy * 64 + fx] = 0.65;
    }
  }
  const grassBundle = buildSurfaceBundle(grassH, grassR, 64, 64, 1.8);

  // 2. Warm Cobblestone Tile (64x64, seamlessly wrapping, beveled height + glossy worn centers)
  const cobbleC = makeCanvas(64, 64);
  const cobbleH = new Float32Array(64 * 64).fill(0.1);
  const cobbleR = new Float32Array(64 * 64).fill(0.95);
  {
    const { ctx } = cobbleC;
    ctx.fillStyle = "#3a3029";
    ctx.fillRect(0, 0, 64, 64);
    const stoneCols = [
      "#9c8d7a",
      "#8c7d6c",
      "#a99985",
      "#7e7060",
      "#b4a590",
    ] as const;

    for (let r = 0; r < 8; r++) {
      const y0 = r * 8;
      const offset = (r % 2) * 5;
      // Partition row cleanly into widths summing to 64 so tile wraps seamlessly
      const widths: number[] = [];
      let rem = 64;
      while (rem > 0) {
        const nextW = rem <= 12 ? rem : 7 + Math.floor(rng() * 5);
        widths.push(nextW);
        rem -= nextW;
      }

      let x = -offset;
      for (const w of widths) {
        const h = 6;
        const baseCol = stoneCols[Math.floor(rng() * stoneCols.length)] ?? "#9c8d7a";
        const stoneRough = 0.44 + rng() * 0.14;
        const crownBoost = 0.86 + rng() * 0.14;

        for (let dy = 1; dy <= h; dy++) {
          for (let dx = 1; dx < w; dx++) {
            const px = (((x + dx) % 64) + 64) % 64;
            const py = (((y0 + dy) % 64) + 64) % 64;
            ctx.fillStyle = baseCol;
            ctx.fillRect(px, py, 1, 1);

            if (dy === 1 && dx < w - 1) {
              ctx.fillStyle = "rgba(255,244,220,0.32)";
              ctx.fillRect(px, py, 1, 1);
            } else if (dy === h) {
              ctx.fillStyle = "rgba(28,20,14,0.36)";
              ctx.fillRect(px, py, 1, 1);
            }

            // Compute beveled pillow profile for crisp normal & parallax relief
            const edgeX = Math.min(dx - 1, w - 1 - dx);
            const edgeY = Math.min(dy - 1, h - dy);
            const isBevel = edgeX === 0 || edgeY === 0;
            const p = py * 64 + px;
            cobbleH[p] = isBevel ? 0.62 * crownBoost : 0.96 * crownBoost;
            cobbleR[p] = isBevel ? Math.min(0.84, stoneRough + 0.24) : stoneRough;
          }
        }

        if (rng() > 0.45 && w > 4) {
          const sx = (((x + 2 + Math.floor(rng() * (w - 3))) % 64) + 64) % 64;
          const sy = (y0 + 3) % 64;
          ctx.fillStyle = "rgba(55,44,35,0.32)";
          ctx.fillRect(sx, sy, 1, 1);
          const p = sy * 64 + sx;
          cobbleH[p] = Math.max(0.15, (cobbleH[p] ?? 0.8) - 0.18);
          cobbleR[p] = 0.85;
        }
        x += w;
      }
    }
  }
  const cobbleBundle = buildSurfaceBundle(cobbleH, cobbleR, 64, 64, 3.0);

  // 3. Sanctuary Stone Masonry (64x64, chiseled ashlar blocks)
  const masonryC = makeCanvas(64, 64);
  const masonryH = new Float32Array(64 * 64).fill(0.12);
  const masonryR = new Float32Array(64 * 64).fill(0.94);
  {
    const { ctx } = masonryC;
    ctx.fillStyle = "#4b3c32";
    ctx.fillRect(0, 0, 64, 64);
    const cols = ["#d5c4a8", "#c8b496", "#baa383", "#dfd0b8", "#b0997a"] as const;
    for (let r = 0; r < 8; r++) {
      const y = r * 8;
      const shift = (r % 2) * 8;
      for (let c = 0; c < 4; c++) {
        const x = c * 16 + shift;
        const col = cols[Math.floor(rng() * cols.length)] ?? "#d5c4a8";
        const faceRough = 0.50 + rng() * 0.14;
        const faceHeight = 0.88 + rng() * 0.12;
        for (let dy = 1; dy <= 6; dy++) {
          for (let dx = 1; dx <= 14; dx++) {
            const px = (x + dx) % 64;
            const py = (y + dy) % 64;
            ctx.fillStyle = col;
            ctx.fillRect(px, py, 1, 1);
            if (dy === 1) {
              ctx.fillStyle = "rgba(255,250,238,0.38)";
              ctx.fillRect(px, py, 1, 1);
            } else if (dy === 6) {
              ctx.fillStyle = "rgba(65,48,35,0.34)";
              ctx.fillRect(px, py, 1, 1);
            }
            const isBevel = dx === 1 || dx === 14 || dy === 1 || dy === 6;
            const p = py * 64 + px;
            masonryH[p] = isBevel ? 0.65 * faceHeight : 0.96 * faceHeight;
            masonryR[p] = isBevel ? 0.78 : faceRough;
          }
        }
      }
    }
  }
  const masonryBundle = buildSurfaceBundle(masonryH, masonryR, 64, 64, 2.7);

  // 4. Wood Plank Tile (32x32, plank seams + warm satin grain)
  const woodC = makeCanvas(32, 32);
  const woodH = new Float32Array(32 * 32).fill(0.14);
  const woodR = new Float32Array(32 * 32).fill(0.92);
  {
    const { ctx } = woodC;
    ctx.fillStyle = "#3b2414";
    ctx.fillRect(0, 0, 32, 32);
    const tones = ["#7c502b", "#6d4423", "#8a5b32", "#613c1f"] as const;
    for (let p = 0; p < 4; p++) {
      const y = p * 8;
      const tone = tones[p % tones.length] ?? "#7c502b";
      fillWrappedRect(woodH, 32, 32, 0, y + 1, 32, 6, (_lx, ly) =>
        ly === 0 || ly === 5 ? 0.68 : 0.9,
      );
      fillWrappedRect(woodR, 32, 32, 0, y + 1, 32, 6, (_lx, ly) =>
        ly === 0 || ly === 5 ? 0.76 : 0.58,
      );
      ctx.fillStyle = tone;
      ctx.fillRect(0, y + 1, 32, 6);
      ctx.fillStyle = "rgba(255,220,165,0.18)";
      ctx.fillRect(0, y + 1, 32, 1);
      for (let k = 0; k < 8; k++) {
        const kx = Math.floor(rng() * 30);
        const ky = y + 2 + Math.floor(rng() * 4);
        ctx.fillStyle = "rgba(40,20,8,0.24)";
        ctx.fillRect(kx, ky, 3, 1);
        for (let g = 0; g < 3; g++) {
          const idx = ky * 32 + ((kx + g) % 32);
          woodH[idx] = 0.55;
          woodR[idx] = 0.74;
        }
      }
    }
  }
  const woodBundle = buildSurfaceBundle(woodH, woodR, 32, 32, 2.2);

  // 5. Emerald Sanctuary Banner (16x40)
  const bannerC = makeCanvas(16, 40);
  {
    const { ctx } = bannerC;
    ctx.clearRect(0, 0, 16, 40);
    for (let y = 0; y < 40; y++) {
      let xMin = 1;
      let xMax = 15;
      if (y > 32) {
        const d = y - 32;
        xMin = 1 + d;
        xMax = 15 - d;
      }
      if (xMin >= xMax) continue;
      for (let x = xMin; x < xMax; x++) {
        const isEdge = x === xMin || x === xMax - 1 || y === 0 || y === 39;
        const isTrim = x === xMin + 1 || x === xMax - 2;
        const chevron =
          (y + Math.abs(x - 7.5)) % 9 < 2 &&
          y > 4 &&
          y < 31 &&
          x > 3 &&
          x < 12;
        if (isEdge) ctx.fillStyle = "#183d1d";
        else if (isTrim) ctx.fillStyle = "#9fe28c";
        else if (chevron) ctx.fillStyle = "#c4f4ab";
        else ctx.fillStyle = x < 8 ? "#32a84a" : "#288d3d";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // 6. Shimmering Dark River Water (64x64, seamlessly periodic ripple heightfield)
  const waterC = makeCanvas(64, 64);
  const waterH = new Float32Array(64 * 64);
  {
    const { ctx } = waterC;
    ctx.fillStyle = "#1b2c2a";
    ctx.fillRect(0, 0, 64, 64);
    const TWO_PI = Math.PI * 2;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const u = (x / 64) * TWO_PI;
        const v = (y / 64) * TWO_PI;
        const w =
          Math.sin(u * 3 + v * 1) +
          Math.cos(v * 4 - u * 1) * 0.8 +
          Math.sin(u * 5 + v * 2) * 0.35;
        waterH[y * 64 + x] = Math.max(0, Math.min(1, 0.5 + w * 0.22));
        if (w > 1.25) {
          ctx.fillStyle = "#416158";
          ctx.fillRect(x, y, 2, 1);
        } else if (w < -0.9) {
          ctx.fillStyle = "#13201e";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  const waterNormalBytes = computeSobelNormals(waterH, 64, 64, 2.2);
  const waterNormal = canvasToSurfaceTexture(
    normalBytesToCanvas(waterNormalBytes, 64, 64),
    { filter: THREE.LinearFilter, repeatX: 12, repeatY: 3 },
  );

  // 7. Cypress / Pine Tree Pixel Sprite (28x44)
  const treeC = makeCanvas(28, 44);
  {
    const { ctx } = treeC;
    ctx.fillStyle = "#2d1c12";
    ctx.fillRect(11, 34, 6, 10);
    ctx.fillStyle = "#533522";
    ctx.fillRect(12, 34, 3, 9);
    const layers = [
      { y: 2, w: 3 },
      { y: 5, w: 5 },
      { y: 8, w: 7 },
      { y: 12, w: 9 },
      { y: 16, w: 11 },
      { y: 20, w: 12 },
      { y: 24, w: 12 },
      { y: 28, w: 11 },
      { y: 32, w: 9 },
    ];
    for (const l of layers) {
      for (let dy = 0; dy < 5; dy++) {
        const y = l.y + dy;
        const half = Math.max(1, l.w - Math.abs(dy - 2));
        for (let x = 14 - half; x <= 14 + half; x++) {
          const edge = x === 14 - half || x === 14 + half || y <= 3;
          const sunlit = x < 13 && rng() > 0.32;
          const mid = x < 16 && rng() > 0.45;
          if (edge) ctx.fillStyle = "#121d0f";
          else if (sunlit && dy < 3) {
            ctx.fillStyle = rng() > 0.55 ? "#5b7a2c" : "#446022";
          } else if (mid) {
            ctx.fillStyle = "#2d4519";
          } else {
            ctx.fillStyle = "#1b2c12";
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  // 8. Bush Pixel Sprite (20x14)
  const bushC = makeCanvas(20, 14);
  {
    const { ctx } = bushC;
    for (let y = 1; y < 14; y++) {
      for (let x = 1; x < 19; x++) {
        const dx = (x - 9.5) / 8.5;
        const dy = (y - 8.5) / 6.2;
        const d = dx * dx + dy * dy + (rng() - 0.5) * 0.22;
        if (d > 1.0) continue;
        if (d > 0.78) ctx.fillStyle = "#152310";
        else if (y < 6 && x < 11) ctx.fillStyle = "#6b8c32";
        else if (y < 9) ctx.fillStyle = "#3f5f22";
        else ctx.fillStyle = "#233814";
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = "#e7cf72";
    ctx.fillRect(6, 5, 1, 1);
    ctx.fillRect(12, 7, 1, 1);
    ctx.fillRect(9, 4, 1, 1);
  }

  // 9. Animated Torch Flame Frames (3 frames, 12x16)
  const flameTextures = [0, 1, 2].map((f) => {
    const fc = makeCanvas(12, 16);
    const { ctx } = fc;
    const sway = f === 0 ? 0 : f === 1 ? -1 : 1;
    for (let y = 2; y < 15; y++) {
      const t = (y - 2) / 13;
      const half = Math.sin(t * Math.PI) * 4.2;
      const cx = 6 + sway * (1 - t) * 1.4;
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        if (x < 0 || x >= 12) continue;
        const dist = Math.abs(x - cx) / Math.max(0.5, half);
        if (t > 0.45 && dist < 0.45) ctx.fillStyle = "#fff9c4";
        else if (t > 0.25 && dist < 0.75) ctx.fillStyle = "#ffb838";
        else ctx.fillStyle = "#e6521f";
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvasToPixelTexture(fc.canvas);
  });

  // 10. Sword Slash Crescent Sprite (32x32)
  const slashC = makeCanvas(32, 32);
  {
    const { ctx } = slashC;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - 12;
        const dy = y - 16;
        const r = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        if (r >= 9 && r <= 15.5 && Math.abs(ang) < 1.25) {
          const edge = (r - 9) / 6.5;
          const tip = 1 - Math.abs(ang) / 1.25;
          if (edge > 0.62 && tip > 0.15) ctx.fillStyle = "#ffffff";
          else if (edge > 0.3) ctx.fillStyle = "#9fe7ff";
          else ctx.fillStyle = "rgba(115, 195, 255, 0.55)";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  // 11. World Pickup Sprites — Gold Coin & Healing Heart (16x16, base + glint frames).
  // Drawn from fixed grids without RNG so the shared ENV_TEXTURES stream and every
  // existing terrain/banner texture stay byte-identical.
  const coinBase = drawGridSprite(COIN_ROWS, COIN_PALETTE);
  const coinGlintC = makeCanvas(16, 16);
  coinGlintC.ctx.drawImage(coinBase, 0, 0);
  coinGlintC.ctx.fillStyle = COIN_PALETTE.w;
  coinGlintC.ctx.fillRect(12, 2, 1, 1);
  coinGlintC.ctx.fillRect(11, 3, 1, 1);
  coinGlintC.ctx.fillRect(13, 3, 1, 1);

  const heartBase = drawGridSprite(HEART_ROWS, HEART_PALETTE);
  const heartGlintC = makeCanvas(16, 16);
  heartGlintC.ctx.drawImage(heartBase, 0, 0);
  heartGlintC.ctx.fillStyle = HEART_PALETTE.w;
  heartGlintC.ctx.fillRect(2, 4, 1, 1);
  heartGlintC.ctx.fillRect(3, 6, 1, 1);

  // Note: world surfaces use repeat (1, 1) with RepeatWrapping because geometry UVs are projected linearly in world units.
  return {
    grassMap: canvasToPixelTexture(grassC.canvas, {
      wrap: THREE.RepeatWrapping,
    }),
    grassNormal: grassBundle.normal,
    grassHeight: grassBundle.height,
    grassRoughness: grassBundle.roughness,

    cobbleMap: canvasToPixelTexture(cobbleC.canvas, {
      wrap: THREE.RepeatWrapping,
    }),
    cobbleNormal: cobbleBundle.normal,
    cobbleHeight: cobbleBundle.height,
    cobbleRoughness: cobbleBundle.roughness,

    masonryMap: canvasToPixelTexture(masonryC.canvas, {
      wrap: THREE.RepeatWrapping,
    }),
    masonryNormal: masonryBundle.normal,
    masonryHeight: masonryBundle.height,
    masonryRoughness: masonryBundle.roughness,

    woodMap: canvasToPixelTexture(woodC.canvas, {
      wrap: THREE.RepeatWrapping,
    }),
    woodNormal: woodBundle.normal,
    woodHeight: woodBundle.height,
    woodRoughness: woodBundle.roughness,

    bannerMap: canvasToPixelTexture(bannerC.canvas),
    waterMap: canvasToPixelTexture(waterC.canvas, { repeatX: 12, repeatY: 3 }),
    waterNormal,
    treeMap: canvasToPixelTexture(treeC.canvas),
    bushMap: canvasToPixelTexture(bushC.canvas),
    flameTextures,
    slashMap: canvasToPixelTexture(slashC.canvas),
    coinMap: canvasToPixelTexture(coinBase),
    coinGlintMap: canvasToPixelTexture(coinGlintC.canvas),
    heartMap: canvasToPixelTexture(heartBase),
    heartGlintMap: canvasToPixelTexture(heartGlintC.canvas),
  };
}

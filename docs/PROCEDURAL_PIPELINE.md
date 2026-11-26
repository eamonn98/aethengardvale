# Procedural Asset & Audio Pipeline ("Saltline Blueprint")

Aethelgard Vale generates 100% of its visual and audio content at startup in TypeScript—no `.png`, `.glb`, or `.mp3` files exist in the repository.

---

## 1. Seed Registry (`src/core/prng.ts`, `src/config/constants.ts`)

All deterministic procedural generation uses `mulberry32(seed)`:

| Seed Constant | Value | Used By | Purpose |
| --- | --- | --- | --- |
| `SEEDS.ENV_TEXTURES` | `4219` | `src/assets/environmentTextures.ts` | Grass blades/flowers, cobblestone variation, masonry, wood grain, tree/bush foliage noise |
| `SEEDS.WORLD_VALE` | `9001` | `src/world/valeBuilder.ts` | Brazier flame phase offsets, crate rotation jitter, bush scale variation |

When adding new procedural zones or texture sets, register a new constant under `SEEDS` in `src/config/constants.ts` rather than calling `Math.random()`.

---

## 2. Procedural Surface Maps & Steep Parallax Relief (`src/assets/surfaceMaps.ts`, `src/rendering/reliefMaterial.ts`)

1. **`makeCanvas(w, h)`**: Allocates an offscreen `<canvas>` with `imageSmoothingEnabled = false`.
2. **`canvasToPixelTexture(canvas, opts)`**:
   - Forces `THREE.NearestFilter` for both `magFilter` and `minFilter` with `generateMipmaps = false` and `SRGBColorSpace` for crisp 16-bit pixel edges.
3. **`computeSobelNormals(heightField, width, height, strength)`**:
   - Evaluates a 3×3 Sobel kernel with **toroidal edge wrapping** over a `[0, 1]` heightfield (`Float32Array`), emitting OpenGL tangent-space RGBA normals (`flipY = true`) so directional sunlight and flickering brazier point lights reflect cleanly off individual cobblestone bevels, ashlar masonry edges, wood planks, and river ripples.
4. **Calibrated Roughness & Smooth Height Maps**:
   - `canvasToSurfaceTexture()` writes linear (`NoColorSpace`) textures: `NearestFilter` for normal/roughness maps and `LinearFilter` for parallax `heightMap`s (preventing raymarch staircase artifacts).
5. **Steep Parallax Occlusion Mapping (`createReliefStandardMaterial`)**:
   - Injects an 8-step steep parallax search + 4-step binary refinement (`computeReliefUv`) and subtle crevice AO (`uReliefAO`) into `MeshStandardMaterial` via `onBeforeCompile`, offsetting `map`, `normalMap`, and `roughnessMap` UVs consistently in tangent space.
6. **Linear World-Space Ground UVs (`src/world/geometryUtils.ts`)**:
   - `PATH_SEGMENTS` are partitioned into 7 non-overlapping flush rectangles (`y = 0..0.04`) and projected via `applyWorldSpaceBoxUVs()` using `WORLD_UV_SCALES` (`grass: 3.2`, `cobble: 2.4`, `masonry: 2.4`, `wood: 1.4`) so adjacent paths and the arched bridge share uniform texel density with zero Z-fighting.

### Procedural Environment Textures (`src/assets/environmentTextures.ts`)

| Key Prefix | Dimensions | Maps Generated | Notes |
| --- | --- | --- | --- |
| `grass*` | `64x64` | Albedo, Normal, Height, Roughness | Tufted grass blades & wildflowers, matte roughness (`0.74..0.94`) |
| `cobble*` | `64x64` | Albedo, Normal, Height, Roughness | Seamlessly tiled stones with beveled heights & worn specular centers (`0.44..0.58`) |
| `masonry*` | `64x64` | Albedo, Normal, Height, Roughness | Chiseled ashlar blocks for bridge parapets & Sanctuary Rotunda |
| `wood*` | `32x32` | Albedo, Normal, Height, Roughness | Horizontal planks with recessed seams & satin grain |
| `water*` | `64x64` (`repeat 12x3`) | Albedo, Normal (`LinearFilter`) | Periodic ripple heightfield for shimmering river reflections |
| `bannerMap` | `16x40` | Albedo | Emerald swallowtail banner with gold-green chevron & `alphaTest` cutout |
| `treeMap` / `bushMap` | `28x44` / `20x14` | Albedo | Multi-tier sunlit pine/cypress & flowering bush cutouts |
| `flameTextures` | 3 frames of `12x16` | Albedo | Swaying brazier flame animation cycled at 9 FPS |
| `slashMap` | `32x32` | Albedo | Additive cyan-white sword crescent |

---

## 3. Modular `24×32` Hero Layers & Slime Grids (`src/assets/characterLayers.ts`, `src/assets/characterComposer.ts`)

- **Hero (`24×32`, world quad `1.50 × 2.00`)**: Composed dynamically from semantic ASCII layers (`BODY_LAYERS`, `TUNIC_LAYERS`, `CLOAK_LAYERS`, `HAIR_LAYERS`, `WEAPON_LAYERS`) driven by `CharacterAppearance` (`skinTone`, `hairStyle`, `hairColor`, `tunicColor`, `cloakStyle`, `weaponStyle`) in `src/config/characterAppearance.ts`.
  - Supports `down`, `up`, and `right` (`left` automatically mirrored via `flipX = true`), each with `idle`, `walk1`, `walk2`, and `atk` frames.
  - The HUD portrait (`24×24`) slices the upper torso and head directly from the active `down.idle` composite and updates live via `player.setAppearance()` + `hud.setPortrait()`.
- **Slimes (`16×14`)**: `idle1`, `idle2`, `hop` frames in `src/assets/spriteData.ts` paired with `SLIME_PALETTES` (`green`, `blue`, `red`, `king`). Setting `crowned: true` overlays the 3-row golden crown onto rows `0..2`.

---

## 4. Web Audio Synthesis (`src/audio/soundEngine.ts`)

`SoundEngine` initializes lazily on the first user gesture (`Start` button or canvas click) to comply with browser autoplay policies:

- **`playSlash()`**: Bandpass-filtered decaying white noise (`1900 Hz -> 420 Hz`) layered with a fast triangle sweep (`760 Hz -> 280 Hz`).
- **`playHit(crit)`**: Square (normal) or sawtooth (crit) percussive pitch drop.
- **`playSlimePop()`**: Sine pitch bounce (`240 -> 620 -> 160 Hz`).
- **`playPlayerHurt()`**: Sawtooth downward rasp (`175 -> 82 Hz`).
- **`playDash()`**: Triangle upward whoosh (`310 -> 590 Hz`).
- **`playPickup()` & `playFanfare()`**: Stepped triangle arpeggio chimes.
- **`playStep(onStone)`**: Short sine thump tuned higher (`165 Hz`) on cobblestone/bridge vs. grass (`105 Hz`).
- **`startAmbience()`**: 24-step D-major/B-minor 16-bit harp arpeggio (`360ms` interval) through a `1100 Hz` low-pass filter.

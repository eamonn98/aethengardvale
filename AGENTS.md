# AGENTS.md — AI Agent Operating Manual for Aethelgard Vale

This repository houses **Aethelgard Vale**, a 100% procedural Three.js HD-2D Action RPG built with **TypeScript** and **Bun**.

Read this file before planning or implementing any change. For deep dives, see:
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Module boundaries, render pipeline, game loop, and lifecycle rules
- [`docs/PROCEDURAL_PIPELINE.md`](docs/PROCEDURAL_PIPELINE.md) — Saltline zero-asset generation, PRNG seeds, pixel grids, bump maps, and Web Audio synthesis
- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — Current vertical slice specification and expansion pillars
- [`docs/ROADMAP_IDEAS.md`](docs/ROADMAP_IDEAS.md) — Linear-ready backlog seed (Epics & candidate Issues)

---

## 1. Mandatory Tooling Rules (Bun Only)

- **Always use `bun` and `bunx`. Never use `node`, `npm`, `npx`, `yarn`, or `pnpm`.**
- Development server (Bun HTML bundler with HMR): `bun run dev` (`bun ./index.html`)
- Typecheck: `bun run typecheck` (`bunx tsc --noEmit`)
- Unit tests: `bun test` (or `bun run test`, scoped to `tests/` via `bunfig.toml`)
- Production bundle: `bun run build` (`bun build ./index.html --outdir=dist --production`)
- Preview production build: `bun run preview` (`bun run scripts/preview.ts`)
- Full verification gate: `bun run check` (`bun run typecheck && bun test && bun run build`)

---

## 2. Core Aesthetic & Architectural Invariants

Never break these five "Saltline + HD-2D" design pillars unless an issue explicitly directs otherwise:

1. **Zero External Assets**: Do not commit or fetch `.png`, `.jpg`, `.glb`, `.gltf`, `.mp3`, `.wav`, or external CDN scripts/fonts. All textures, bump maps, sprites, 3D geometry, shaders, and audio are generated procedurally in TypeScript.
2. **Deterministic Procedural Generation**: Every procedural texture generator and world layout pass uses `mulberry32(seed)` from `src/core/prng.ts` with registered seeds in `src/config/constants.ts`. Never use unseeded `Math.random()` for persistent textures or level geometry.
3. **Crisp Nearest-Neighbor Pixel Art + PBR Relief**: Sprite and environment albedo `CanvasTexture`s created via `canvasToPixelTexture()` in `src/assets/canvasUtils.ts` MUST keep `NearestFilter`, `generateMipmaps = false`, and `alphaTest = 0.5` binary cutouts on `createSpriteMesh()` so sprites cast crisp real-time 3D shadows. World terrain, cobbles, masonry, and wood use `createReliefStandardMaterial()` (`src/rendering/reliefMaterial.ts`) with Sobel normal maps, calibrated roughness maps, and smooth `LinearFilter` height maps (`src/assets/surfaceMaps.ts`) plus world-space linear UVs (`src/world/geometryUtils.ts`) across non-overlapping `PATH_SEGMENTS`.
4. **HD-2D Diorama Camera & Post-Processing**: Maintain the narrow telephoto FOV (`34°`), warm-vs-cool 3-point lighting, `UnrealBloomPass`, and the `HD2DPostShader` (Vogel-disk tilt-shift DOF centered on `uFocusY`, split-tone grade, vignette), toggleable via `T` / HUD button.
5. **Pure Simulation & Modular Character Separation**: Keep `src/core/`, `src/config/`, `src/world/terrain.ts`, `src/world/collision.ts`, Sobel normal math in `src/assets/surfaceMaps.ts`, and pure combat math in `src/gameplay/combat.ts` independent of DOM/Three.js side effects where possible so they remain unit-testable under `bun test`. Hero sprites are composed from `24×32` semantic layers (`src/assets/characterLayers.ts`, `src/assets/characterComposer.ts`) driven by `CharacterAppearance` (`src/config/characterAppearance.ts`).

---

## 3. Module Boundaries & Dependency Rules

```
src/main.ts
  └── src/gameplay/gameState.ts (orchestrator)
        ├── src/rendering/*    (RenderPipeline, CameraController, hd2dShader, spriteFactory)
        ├── src/world/*        (valeBuilder, props, terrain, collision)
        ├── src/gameplay/*     (player, enemies, combat, pickups, particles)
        ├── src/assets/*       (canvasUtils, environmentTextures, spriteData, characterSprites)
        ├── src/audio/*        (soundEngine)
        ├── src/ui/*           (hud, minimap, floatingText)
        ├── src/config/*       (constants, enemies, worldLayout)
        └── src/core/*         (prng, types, events, input)
```

Strict rules:
- `src/core/` and `src/config/` must **never** import from `src/rendering/`, `src/world/`, `src/gameplay/`, or `src/ui/`.
- `src/world/terrain.ts` and `src/world/collision.ts` must **never** import `three` or touch `document`/`window`.
- `src/ui/` must **never** mutate gameplay state directly; wire UI actions via callbacks and subscribe to `EventBus<GameEvents>`.
- **Resource Disposal**: Any dynamically spawned/despawned Three.js meshes (`EnemyManager`, `PickupManager`, `ParticleSystem`) must either reuse shared geometries/materials or explicitly call `.dispose()` on removal. Never allocate an undisposed material inside a per-frame or per-burst helper.

---

## 4. Common Extension Recipes

- **Add a Hero Customisation Option (Hair, Tunic, Cloak, Weapon, Skin)**:
  1. Add the option ID and color ramp to `src/config/characterAppearance.ts`.
  2. If adding a geometric layer variant (e.g., new hair or cloak silhouette), add its `24×32` directed grids to `src/assets/characterLayers.ts` and ensure `bun test` passes `tests/characterAppearance.test.ts`.
  3. Apply via `player.setAppearance(...)` and update the HUD portrait via `hud.setPortrait(...)`.
- **Add a new Slime or Enemy Tier**:
  1. Add the tier key to `SlimeTier` in `src/core/types.ts`.
  2. Add stats to `SLIME_TIERS` in `src/config/enemies.ts` and spawn coordinates to `INITIAL_SLIME_SPAWNS`.
  3. Add the color palette in `src/assets/spriteData.ts` (`SLIME_PALETTES`) and compile it in `src/assets/characterSprites.ts`.
- **Add a new Procedural World Prop**:
  1. Add placement data to `src/config/worldLayout.ts`.
  2. Implement a `create<Prop>(...)` builder in `src/world/props.ts` returning `{ ..., obstacle }` if collidable.
  3. Register it inside `buildValeWorld()` in `src/world/valeBuilder.ts`.
- **Add a new Web Audio SFX**:
  1. Add a `play<Name>()` method to `SoundEngine` in `src/audio/soundEngine.ts` guarded by `if (!this.enabled || !this.ctx) return;`.
- **Add a new Pure Gameplay Mechanic**:
  1. Put pure math/state transitions in `src/gameplay/combat.ts` or `src/world/` and add matching unit tests in `tests/`.

---

## 5. Verification & Linear Workflow

Before marking any task complete, run:
```sh
bun run check
```
All three checks (`tsc --noEmit`, `bun test`, `bun build`) must exit `0`.

When planning or executing work tracked in **Linear**:
- Reference `docs/ROADMAP_IDEAS.md` for candidate Epics and Issues.
- Keep each Linear issue scoped to a single vertical slice (1–3 modules + unit tests) with explicit acceptance criteria and `bun run check` as a required verification step.

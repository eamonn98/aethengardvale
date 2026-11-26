# Aethelgard Vale

A **100% procedural Three.js HD-2D Action RPG** inspired by *Octopath Traveler* and *Saltline*-style zero-asset synthesis. Every pixel sprite, tile texture, luminance bump map, 3D diorama prop, tilt-shift shader, and 16-bit sound effect is generated in code at startup—zero external `.png`, `.glb`, or `.mp3` assets required.

## Quickstart (Bun)

```sh
# Install dependencies
bun install

# Start local dev server with HMR
bun run dev

# Run strict TypeScript check, unit tests, and production bundle
bun run check

# Preview the production dist/ bundle
bun run preview
```

## Controls

| Action | Keys / Input |
| --- | --- |
| 8-Way Move | `WASD` / `Arrow Keys` |
| Sword Slash | `Space` / `J` / `Z` / `Left Click` |
| Dodge Dash | `Shift` / `K` / `X` |
| Open Sanctuary Chest | `E` |
| Toggle HD-2D Tilt-Shift DOF & Bloom | `T` (or top-right button) |
| Toggle Procedural Audio | `M` (or top-right button) |
| Reset Run | `R` (or top-right button) |

## Documentation

- [`AGENTS.md`](AGENTS.md) — AI agent operating manual & strict project invariants
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Technical architecture, render pipeline, and module graph
- [`docs/PROCEDURAL_PIPELINE.md`](docs/PROCEDURAL_PIPELINE.md) — Zero-asset procedural texture, sprite, and Web Audio guide
- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — Gameplay mechanics, stats, and world design
- [`docs/ROADMAP_IDEAS.md`](docs/ROADMAP_IDEAS.md) — Linear-ready backlog Epics & candidate Issues

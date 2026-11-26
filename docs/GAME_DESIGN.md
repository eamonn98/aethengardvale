# Game Design Document — Aethelgard Vale

## 1. Vertical Slice Overview

**Aethelgard Vale** is a top-down 3D-diorama Action RPG where the hero **Alden** crosses an ancient arched stone bridge over a dark shimmering river into the Sanctuary Rotunda Courtyard to defeat the slime invasion and vanquish the crowned **King Slime**.

---

## 2. World Zones & Landmarks

1. **Southern Meadow (`z: 3.1 .. 15.5`)**
   - Lush procedural grass framed by out-of-focus foreground pine silhouettes (`z = 18.2`), wooden tables with stools, crates, bushes, and Meadow Slimes.
   - Cobblestone crossroads leading north toward the bridge.
2. **River & Arched Cobblestone Bridge (`x: -2.85 .. 2.85`, `z: -4.4 .. 4.4`)**
   - Cosine-arched deck peaking at `y = 1.45` with stone parapets, spandrel pillars, and four flanking stone braziers casting warm flickering point lights.
3. **Sanctuary Rotunda Courtyard (`z: -14.5 .. -3.1`)**
   - 9-segment curved stone rotunda (`z = -16.8`) with central shadowed gatehouse, emerald swallowtail banners, flickering sanctuary braziers, River & Ember Slimes, and an interactive **Sanctuary Treasure Chest** (`x = -6.2, z = -9.6`) holding the *Knight's Relic Blade* (`+4 ATK`, `+50 Gold`, Full Heal).

---

## 3. Player Stats, Controls & Combat Feel

- **Starting Stats**: `LV 1`, `40/40 HP`, `0/30 XP`, `10 ATK`, `Speed 6.2`.
- **8-Way Movement**: Normalized input vector; 4-way sprite orientation (`up/down/left/right`); movement slows to `55%` during sword swing.
- **8-Way Crescent Sword Slash** (`Space` / `J` / `Z` / `Left Click`):
  - Duration `0.24s`, cooldown `0.30s`, reach `2.25 + targetRadius`, forward cone dot threshold `>= 0.22` (plus point-blank overlap within `0.95`).
  - **Damage**: `round((atk + randInt(0..3)) * (crit ? 1.65 : 1.0))` with `22%` crit chance.
  - **Juice**: `36ms` / `55ms` hitstop freeze, directional knockback (`8.5` normal / `4.2` king), white emissive hit flash, upward hop impulse, micro camera shake, particle burst, and floating damage text.
- **Dodge Dash** (`Shift` / `K` / `X`): `0.16s` burst at `15.5` speed, `0.72s` cooldown, `0.22s` invulnerability frames.
- **Leveling**: `xpNext` scales by `1.48x` per level; each level grants `+10 Max HP`, full HP heal, and `+3 ATK`.

---

## 4. Enemy Roster & Boss Progression

| Tier | HP | ATK | XP | Gold | Speed | Hop Interval | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Meadow Slime** (`green`) | 20 | 5 | 10 | 6 | 2.3 | 1.55s | Patrols southern meadow |
| **River Slime** (`blue`) | 32 | 7 | 16 | 10 | 3.1 | 1.15s | Guards bridge & approaches |
| **Ember Slime** (`red`) | 48 | 10 | 26 | 18 | 3.4 | 1.05s | Guards northern sanctuary |
| **King Slime** (`king`) | 145 | 14 | 90 | 75 | 2.7 | 1.30s | Crowned boss; spawns at `(0, -9.8)` after 10 slimes defeated |

Slimes drop **Gold** (`8..14G`, `72%` chance) or **Heart** (`+12 HP`, `28%` chance). Wave respawning maintains at least `5` active slimes until the player falls or clears the boss.

---

## 5. Expansion Pillars

1. **Multi-Zone Diorama World**: Connect the Sanctuary Gatehouse (`z = -16.8`) to interior catacombs, a village square, and cliffside ruins via scene/zone transitions.
2. **NPCs, Dialogue & Quests**: Octopath-style portrait dialogue boxes, merchant shop (spend Gold!), and quests.
3. **Tactical Combat Depth**: Charged spin slash, shield guard/parry, elemental spells/MP bar, and telegraphed boss attack patterns (King Slime shockwave/minions).
4. **Atmospheric & Audio Polish**: Dynamic day/dusk lighting presets, weather particles (rain/fireflies), adaptive combat music layers, and spatialized SFX.
5. **Progression & Persistence**: Inventory/equipment slots, `localStorage` save/load, gamepad support, and mobile touch controls.

# Glasston — A Glassmorphic WebXR Clone of Blaston

> A browser-based VR dueling shooter inspired by Resolution Games' **Blaston**, rendered
> with a **glassmorphic** (frosted-glass / translucent / neon-gradient) aesthetic and built
> on the **Immersive Web SDK (IWSDK)**.

---

## 1. What we're building

**Blaston**, in one sentence: a slow-motion VR duel where two players stand on opposing
platforms, pull weapons out of thin air, and fire stylized projectiles that travel slowly
enough to be **physically dodged** by ducking, leaning, and side-stepping. The skill is
80% dodging, 20% aiming.

**Glasston** keeps that core loop but re-skins the entire world in a glassmorphic visual
language: frosted translucent panels, soft blurred depth, light inner borders, vivid
saturated gradients glowing through glass, and projectiles that look like blown-glass
orbs leaving refractive trails.

### Scope decisions (v1)
- **Single-player vs. an AI opponent** first. Networked PvP is a stretch goal (Section 9),
  because it dominates complexity and isn't needed to prove the concept.
- **Seated/standing roomscale**, no locomotion — like real Blaston you stay on your pad and
  dodge with your body. This dramatically simplifies movement code.
- **Quest browser** (and desktop WebXR emulator) as the target. Hand-tracking is a stretch
  goal; controllers first.

---

## 2. Core gameplay pillars to replicate

| Pillar | Blaston behavior | Our implementation note |
|---|---|---|
| **Slow projectiles** | Shots travel slowly; you dodge with your body | Tunable projectile speed (~3–6 m/s); the heart of the feel |
| **Body dodging** | Duck/lean/step to avoid shots | Use the headset pose as the player hitbox; no health regen from standing still |
| **Weapon variety** | Pistols, shotguns, homing, mines, shields, etc. | Ship 3–4 archetypes for v1 (pistol, spread, charge/heavy, shield) |
| **Weapon spawning** | Weapons materialize at your sides to be grabbed | Holster zones at the player's hips; grab to equip |
| **Rounds & ammo** | Limited ammo per weapon, swap constantly | Per-weapon ammo + cooldowns drive the swap rhythm |
| **Arena duel** | Two pads facing each other | One player pad + one AI pad, fixed distance |

---

## 3. Technology stack

- **IWSDK (`@iwsdk/core`)** — ECS runtime (elics) + WebXR session + Three.js render loop.
- **Three.js** — geometry, PBR materials, post-processing (provided/managed by IWSDK).
- **`@iwsdk/xr-input`** — controller/hand input, `StatefulGamepad` edge-triggered buttons,
  grip/ray spaces.
- **TypeScript + Vite** — scaffolded by `npm create @iwsdk@latest`, hot-reload, XR emulation
  in a desktop browser (no headset needed to iterate).
- **Glassmorphism** — `MeshPhysicalMaterial` with `transmission`, `roughness`, `thickness`,
  `ior`, plus an HDRI environment map for believable refraction; optional bloom post-pass
  for neon glow.

> ⚠️ **API verification step:** IWSDK is young and its exact API surface
> (`createComponent`, `createSystem`, `createTransformEntity`, input adapters) must be
> confirmed against the installed package's types and the bundled MCP/RAG docs before
> coding each system. The plan is structured around ECS concepts that are stable even if
> method names shift.

---

## 4. Architecture (ECS)

ECS data is authoritative; Three.js objects are views synced from `Transform`.

### Components (data)
- `Transform` — position/rotation/scale (IWSDK-provided via `createTransformEntity`).
- `Health` — `{ current, max }` on the player and the AI opponent.
- `Projectile` — `{ velocity, lifetime, elapsed, radius, ownerId }`.
- `Damaging` — `{ damage }`.
- `Weapon` — `{ type, ammo, maxAmmo, cooldown, cooldownRemaining, muzzleOffset }`.
- `Grabbable` — marks weapons that can be picked up from a holster.
- `Holster` — a spawn zone anchored to the player rig (left hip / right hip).
- `Shield` — `{ hp }` deployable that absorbs incoming projectiles.
- `Hitbox` — `{ radius }` (sphere) for cheap collision; attached to player head/torso & AI.
- `AIController` — `{ state, aimError, fireTimer, dodgeTimer }` for the bot opponent.
- `GlassStyle` — tag/params for the glassmorphic material variant (color, glow intensity).

### Systems (behavior, ordered by priority each frame)
1. **InputSystem** — read controllers via `StatefulGamepad`; expose trigger/grip/buttons
   and grip-space poses for both hands.
2. **GrabSystem** — when a grip is pressed near a `Grabbable` in a `Holster`, attach the
   weapon to that hand's grip space; release to drop/return.
3. **WeaponFireSystem** — on trigger press, if `ammo > 0` and `cooldownRemaining <= 0`,
   spawn `Projectile` entities at the muzzle with the weapon's firing pattern.
4. **ProjectileSystem** — integrate position by `velocity * dt`; expire on `lifetime`.
5. **CollisionSystem** — sphere-vs-sphere between projectiles and `Hitbox`/`Shield`
   entities (skip `ownerId`); apply `Damaging`, destroy projectile, spawn hit FX.
6. **AISystem** — drive the opponent: aim at the player's predicted position with
   `aimError`, fire on a timer, and "dodge" by sidestepping its pad / lowering.
7. **PlayerHitboxSystem** — sync the player `Hitbox` to the live headset pose so real body
   movement dodges shots.
8. **WeaponSpawnSystem** — refill empty holsters with new weapons between/within rounds.
9. **GameStateSystem** — round flow, scoring, win/lose, restart.
10. **FXSystem** — projectile trails, impact bursts, screen-flash on damage, audio cues.

---

## 5. The glassmorphic look — concrete recipe

Glassmorphism in 3D ≠ CSS blur. We approximate the same *feeling* with physically-based
glass + environment + bloom:

- **Environment first.** Load a colorful HDRI (gradient/studio) as `scene.environment` via
  `RGBELoader` + `PMREMGenerator`. Glass is only convincing when there's something to
  refract/reflect. Also use it as a soft gradient `background`.
- **Glass material** (`MeshPhysicalMaterial`):
  - `transmission: 1`, `thickness: 0.3–1.0`, `ior: 1.3–1.5`
  - `roughness: 0.05–0.2` (slight frost), `metalness: 0`
  - `clearcoat: 1`, faint `attenuationColor` tint per object
  - thin emissive **rim/inner border** for the "light edge" glassmorphism signature.
- **Neon gradients through glass.** Place soft emissive shapes / gradient-lit panels
  *behind* frosted surfaces so saturated color blooms through.
- **Bloom post-process** for the glow on edges, projectiles, and muzzle flashes.
- **Object styling pass:**
  - Arena pads & boundary = large frosted-glass slabs with glowing edges.
  - Weapons = translucent tinted glass shells with an emissive core.
  - Projectiles = blown-glass orbs (high transmission, emissive center) + refractive trail.
  - UI/HUD = floating frosted panels (IWSDK spatial UI) with blurred translucency.
- **Performance guardrails:** transmission is expensive. Cap the number of true-transmission
  materials on screen; use cheaper fake-glass (`MeshPhysicalMaterial` w/ opacity + fresnel,
  no transmission) for high-count objects like projectiles if FPS drops. Target 72/90 Hz.

---

## 6. Build phases (milestones)

Each phase ends in something runnable in the WebXR emulator and committed.

### Phase 0 — Scaffold & boot _(foundation)_
- `npm create @iwsdk@latest` into the repo; wire up Vite, TS, dev server.
- Confirm an empty XR scene renders in the desktop emulator and on-device.
- Commit the scaffold. **Exit criteria:** "Enter VR" works and shows an empty room.

### Phase 1 — Arena & glass foundation _(look + space)_
- Build the two pads, boundary, and lighting; load HDRI environment.
- Author the reusable glass material(s) + `GlassStyle` component.
- **Exit criteria:** you can stand on your pad in VR and the world reads as glassmorphic.

### Phase 2 — Shooting core _(the feel)_
- `Projectile`, `ProjectileSystem`, a single pistol that fires on trigger.
- Glass-orb projectile visuals + slow tunable speed.
- **Exit criteria:** point a controller, pull trigger, watch a glass orb drift out slowly.

### Phase 3 — Targets, collision & dodging _(the loop)_
- `Hitbox`, `CollisionSystem`, `Health`; a static dummy that takes damage and shatters.
- Player hitbox synced to headset pose → leaning/ducking avoids return fire (test with a
  scripted shooter).
- **Exit criteria:** you can destroy a target and physically dodge an incoming shot.

### Phase 4 — Weapons & holsters _(variety)_
- `Holster` zones at the hips, `Grabbable` + `GrabSystem`, `WeaponSpawnSystem`.
- Implement 3–4 weapon archetypes (pistol, spread/shotgun, charge/heavy, shield deploy).
- Per-weapon ammo, cooldown, and firing patterns.
- **Exit criteria:** grab a weapon from your hip, fire it, run it dry, grab another.

### Phase 5 — AI opponent _(the duel)_
- `AIController` + `AISystem`: aim with error, fire on cadence, dodge on its pad.
- Round flow, scoring, win/lose, restart in `GameStateSystem`.
- **Exit criteria:** a full winnable/losable 1v1 round against the bot.

### Phase 6 — Juice & polish _(ship quality)_
- FX (trails, impact shatter, muzzle flash, bloom), spatial SFX, haptics on fire/hit.
- Glassmorphic HUD: health, ammo, round/score on floating frosted panels.
- Performance pass (transmission budget, draw calls, 72/90 Hz target).
- **Exit criteria:** feels like a polished glass-themed Blaston duel.

### Stretch goals
- Hand-tracking support (grab/fire with pinch gestures).
- Networked PvP (Section 9).
- More weapons (homing, mines, ricochet), multiple arenas, difficulty levels.

---

## 7. Proposed repository structure

```
glasston/
├─ index.html
├─ vite.config.ts
├─ package.json
├─ public/
│  ├─ hdri/            # environment maps for glass refraction
│  ├─ audio/           # SFX (fire, impact, ambient)
│  └─ models/          # any GLTF weapon shells
├─ src/
│  ├─ main.ts          # world bootstrap, register systems, start XR
│  ├─ components/      # Health, Projectile, Weapon, Holster, AIController, ...
│  ├─ systems/         # input, grab, fire, projectile, collision, ai, gamestate, fx
│  ├─ materials/       # glassmorphic material factory + presets
│  ├─ weapons/         # weapon archetype definitions (data-driven)
│  ├─ arena/           # pad/boundary/environment setup
│  └─ ui/              # spatial HUD panels
├─ PLAN.md             # this file
└─ README.md
```

---

## 8. Key risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| IWSDK API differs from researched docs | Rework of every system | Verify against installed types/MCP docs in Phase 0 before building |
| Transmission glass is too expensive on Quest | Low FPS, nausea | Glass budget; fake-glass fallback for projectiles; profile early |
| Dodge feel doesn't land | Game isn't fun | Tune projectile speed/size early (Phase 2–3) on real hardware |
| Grab/holster ergonomics awkward | Frustrating core action | Generous grab radii; test in emulator + headset each iteration |
| Networking complexity (if attempted) | Schedule blowup | Keep PvP a stretch goal; AI opponent proves the loop first |
| Scope creep on weapon count | Never ships | Hard-cap v1 at 3–4 weapons |

---

## 9. Networked PvP (stretch — deferred)

True Blaston is 1v1 online. If pursued after v1:
- Authoritative-ish peer or lightweight relay (WebRTC datachannel or WebSocket server).
- Sync: weapon fire events + projectile spawns (deterministic from seed+velocity) rather
  than per-frame projectile positions; sync headset/hand poses for the opponent avatar.
- Lag compensation on hit detection (shots are slow, which helps a lot).
- Render the remote player as a glassmorphic avatar (head + two hands).

This is intentionally out of v1 scope to keep the project shippable.

---

## 10. Immediate next steps

1. **Phase 0:** scaffold the IWSDK project into this repo and get an empty XR scene booting
   in the emulator.
2. Lock the IWSDK API specifics by reading the installed package types + bundled docs.
3. Build the glass material factory and the arena (Phase 1) to establish the look.
4. Iterate phase-by-phase, committing a runnable build at each milestone.

---

*This plan favors a vertical-slice approach: get a slow glass projectile you can dodge as
early as possible (Phases 2–3), because that single interaction is what makes Blaston —
and therefore Glasston — feel good. Everything else decorates that core.*

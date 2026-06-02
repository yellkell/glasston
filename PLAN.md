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
| **Dual wielding** | A weapon in each hand, fired independently | Both grip spaces can hold a weapon; trigger per hand |
| **Weapon spawning** | Weapons materialize at **fixed spots around your platform** | Pedestals with glowing hex tops spaced around the octagon rim — **never directly front or behind**; grab to equip, return to swap |
| **Ammo readout** | Each weapon shows a **numeric ammo count** | Floating glass number badge on each weapon (the "2"/"7" in refs) |
| **Rounds & ammo** | Limited ammo per weapon, swap constantly | Per-weapon ammo + cooldowns drive the swap rhythm |
| **Constrained dodge box** | You stay inside a small octagonal play space | Model the exact octagon (Section 4a); shots are dodged, not walked away from |
| **Arena duel** | Two players facing each other across a barrier | Player octagon + AI octagon, fixed distance, curved front barrier |

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

## 4a. Arena & play-space layout (from reference)

The player stands inside a **constrained octagonal play space** — this is the dodge box,
and its small size is *the point*: you can't run from shots, only weave your body. Exact
footprint from the reference diagram:

```
        0.75 m  (top edge)
      ┌───────────┐
   0.65│           │0.65   (diagonal corners)
  ┌────┘           └────┐
  │                     │
1.5│      OCTAGON        │   ← 1.5 m deep (left edge span)
  │   (player footprint) │
  └────┐           ┌────┘
   0.6 │           │ 0.6   (lower diagonals / side ≈ 0.6 m)
      └───────────┘
        1.72 m  (overall width)
```

- **Overall:** ~**1.72 m wide × 1.5 m deep** octagon. Top straight edge 0.75 m, upper
  diagonals 0.65 m, side/lower segments ~0.6 m.
- Build it as a flat octagon prism (the lit floor pad) + a low **curved front rail/barrier**
  the player leans over, matching the screenshot.
- **Weapon pedestals** sit at **predetermined slots spaced around the octagon's perimeter**
  (on the side and diagonal edges) — **never directly in front of or behind** the player.
  This forces you to reach out and turn to your sides to grab/swap weapons, which is part of
  the body-movement skill. Each pedestal has a **glowing hex top** where a weapon
  materializes. Plan ~4–6 fixed slots (e.g. front-left, front-right, mid-left, mid-right,
  and possibly the two rear-diagonals), and the `WeaponSpawnSystem` cycles weapons through
  them. The straight-ahead and dead-behind edges stay clear so they never block your aim
  lane or sit out of reach.
- The **AI opponent** stands on an identical octagon facing the player across a gap
  (tune distance for projectile travel time — start ~4–6 m centre-to-centre).
- **HUD anchors:** health bar + round timer float at the **top corners** of the arena
  (per refs), as glass panels.

### Scene graph anchoring
- A root **`XROrigin` rig** positions the player octagon at world origin; the headset/hands
  live under it. Pedestals, rail, and HUD anchors are children of the rig so they stay put
  relative to the player regardless of recenters.
- The opponent octagon + its props are a separate subtree facing back toward the player.

---

## 4. Architecture (ECS)

ECS data is authoritative; Three.js objects are views synced from `Transform`.

### Components (data)
- `Transform` — position/rotation/scale (IWSDK-provided via `createTransformEntity`).
- `Health` — `{ current, max }` on the player and the AI opponent.
- `Projectile` — `{ velocity, lifetime, elapsed, radius, ownerId }`.
- `Damaging` — `{ damage }`.
- `Weapon` — `{ type, ammo, maxAmmo, cooldown, cooldownRemaining, muzzleOffset }`.
- `AmmoBadge` — link to a floating glass number that renders the weapon's current ammo.
- `Grabbable` — marks weapons that can be picked up from a pedestal.
- `Pedestal` — a front-rail spawn slot (left/right) with a glowing hex top; holds one weapon.
- `HeldBy` — `{ hand }` set when a weapon is attached to a grip space (left/right), enabling
  independent dual-wield firing.
- `Shield` — `{ hp }` deployable that absorbs incoming projectiles.
- `Hitbox` — `{ radius }` (sphere) for cheap collision; attached to player head/torso & AI.
- `AIController` — `{ state, aimError, fireTimer, dodgeTimer }` for the bot opponent.
- `GlassStyle` — tag/params for the glass/neon material variant (tint, glow intensity).

### Systems (behavior, ordered by priority each frame)
1. **InputSystem** — read controllers via `StatefulGamepad`; expose trigger/grip/buttons
   and grip-space poses for both hands.
2. **GrabSystem** — when a grip is pressed near a `Grabbable` on a `Pedestal` (or a held
   weapon), attach/detach it to that hand's grip space and set `HeldBy`; releasing over a
   pedestal returns it. Supports a weapon in each hand.
3. **WeaponFireSystem** — per held weapon, on that hand's trigger press, if `ammo > 0` and
   `cooldownRemaining <= 0`, spawn `Projectile`(s) at the muzzle with the weapon's firing
   pattern; decrement ammo and refresh its `AmmoBadge`.
4. **ProjectileSystem** — integrate position by `velocity * dt`; expire on `lifetime`.
5. **CollisionSystem** — sphere-vs-sphere between projectiles and `Hitbox`/`Shield`
   entities (skip `ownerId`); apply `Damaging`, destroy projectile, spawn hit FX.
6. **AISystem** — drive the opponent: aim at the player's predicted position with
   `aimError`, fire on a timer, and "dodge" by sidestepping its pad / lowering.
7. **PlayerHitboxSystem** — sync the player `Hitbox` to the live headset pose so real body
   movement dodges shots.
8. **WeaponSpawnSystem** — materialize a new weapon on a `Pedestal` (with a glass/hex
   spawn FX) whenever its slot is empty, between/within rounds.
9. **GameStateSystem** — round flow, scoring, win/lose, restart.
10. **FXSystem** — projectile trails, impact bursts, screen-flash on damage, audio cues.

---

## 5. The glassmorphic look — concrete recipe

**Direction:** blend our frosted-glass glassmorphism with the reference's **neon-cyberpunk
arena** — a dark room, vivid magenta/cyan rim light, spotlight cones, glowing edges and
banners — but render the surfaces (pads, rail, pedestals, weapons, HUD) as translucent
frosted glass with light borders, so colored light blooms *through* glass rather than off
flat plastic. Dark environment + saturated emissive accents is the unifying mood.

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
  - Octagon floor pad + curved front rail = large frosted-glass slabs with glowing neon edges.
  - Weapon pedestals = glass plinths with an emissive **hex top** and a spawn-glow.
  - Weapons = translucent tinted glass shells with an emissive core + floating ammo number.
  - Projectiles = blown-glass orbs (high transmission, emissive center) + refractive trail.
  - UI/HUD = floating frosted panels (IWSDK spatial UI) with blurred translucency.
  - Mood = dark arena, magenta/cyan rim light, spotlight cones, glowing banners (per refs).
- **Performance guardrails:** transmission is expensive. Cap the number of true-transmission
  materials on screen; use cheaper fake-glass (`MeshPhysicalMaterial` w/ opacity + fresnel,
  no transmission) for high-count objects like projectiles if FPS drops. Target 72/90 Hz.

---

## 6. Build phases (milestones)

Each phase ends in something runnable in the WebXR emulator and committed.

### Phase 0 — Scaffold & boot _(foundation)_ — ✅ DONE
- ~~`npm create @iwsdk@latest`~~ — the scaffolder pulls templates from jsdelivr, which
  this environment's network policy blocks (403). Wired the project up **manually** instead
  against the published `@iwsdk/core@0.4.2` + `three@0.184.0` from the npm registry (which
  is reachable), plus `@iwsdk/vite-plugin-dev` for the desktop XR emulator.
- Vite + TS + `World.create()` boot with an immersive-vr session offer.
- **Verified:** `npm run typecheck` clean, `vite build` succeeds (495 modules), dev server
  serves & transforms `main.ts` with no errors. (On-device "Enter VR" needs a real headset
  to confirm visually — not possible in this headless CI environment.)

### Phase 1 — Arena & glass foundation _(look + space)_ — 🚧 IN PROGRESS
- ✅ Octagon play space (exact dims, Section 4a) as an extruded glass slab, curved front
  rail, opponent octagon across the gap, dark neon lighting (magenta/cyan spotlights).
- ✅ Reusable glass material factory (`src/materials/glass.ts`): frosted transmission glass,
  a cheap fake-glass fallback, and neon edge outlines.
- ✅ Weapon pedestals placed around the rim (never directly front/back) as glowing hex-top
  placeholders.
- ⏳ Remaining: HDRI/room environment map for richer refraction; `GlassStyle` ECS component
  once materials are data-driven; tune the dark-vs-default-lighting balance.
- **Exit criteria:** you can stand in your octagon in VR and the world reads as
  glassmorphic-neon.

### Phase 2 — Shooting core _(the feel)_
- `Projectile`, `ProjectileSystem`, a single pistol that fires on trigger.
- Glass-orb projectile visuals + slow tunable speed.
- **Exit criteria:** point a controller, pull trigger, watch a glass orb drift out slowly.

### Phase 3 — Targets, collision & dodging _(the loop)_
- `Hitbox`, `CollisionSystem`, `Health`; a static dummy that takes damage and shatters.
- Player hitbox synced to headset pose → leaning/ducking avoids return fire (test with a
  scripted shooter).
- **Exit criteria:** you can destroy a target and physically dodge an incoming shot.

### Phase 4 — Weapons, pedestals & dual-wield _(variety)_
- `Pedestal` slots around the rim, `Grabbable` + `GrabSystem` (per-hand), `HeldBy`,
  `WeaponSpawnSystem`, `AmmoBadge`.
- Implement 3–4 weapon archetypes (pistol, spread/shotgun, charge/heavy, shield deploy).
- Per-weapon ammo, cooldown, and firing patterns; a weapon in each hand fires independently.
- **Exit criteria:** grab a weapon off a pedestal in each hand, fire both, run them dry,
  swap for freshly spawned ones.

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

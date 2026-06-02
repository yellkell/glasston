# Glasston

A **glassmorphic WebXR clone of [Blaston](https://www.blastongame.com/)** — a slow-motion
VR dueling shooter where you stand on a small platform, pull weapons off pedestals around
you, and dodge slow glowing projectiles with your body. Built on the **Immersive Web SDK
(IWSDK)** + Three.js, with a frosted-glass / neon-cyberpunk aesthetic.

See [`PLAN.md`](./PLAN.md) for the full design and phased build plan.

## Status

- ✅ **Phase 0 — Scaffold & boot:** IWSDK World + WebXR (immersive-vr) session, Vite/TS,
  in-browser XR emulator for desktop dev.
- ✅ **Phase 1 — Arena & glass foundation:** octagonal play space (exact Blaston
  dimensions), curved front rail, opponent platform, dark neon lighting + glassmorphic
  material factory.
- ✅ **Phase 2 — Shooting core:** slow glass-orb projectiles fired from the controllers.
- ✅ **Phase 3 — Targets, collision & dodging:** team-aware collision, a destructible
  glass dummy, and a **head-driven IK body** so leaning/ducking your real body dodges shots.
- ✅ **Phase 4 — Weapons, pedestals & dual-wield:** grab weapons (Pistol / Spread / Heavy)
  off the rim pedestals — one per hand — with ammo, cooldowns, and auto-respawn.
- ✅ **Phase 5 — The duel:** an AI opponent that strafes, dodges and shoots, plus full
  round/score/win-lose flow and a world-space HUD.
- 🚧 **Next — Phase 6:** juice & polish (FX, spatial audio, glassmorphic HUD, perf).

## Quick start

```bash
npm install
npm run dev      # open the printed URL
```

- **On a headset** (e.g. Quest browser): you'll get an *Enter VR* offer.
- **On desktop**: IWSDK's dev plugin injects a WebXR emulator — fly the scene with
  WASD + mouse, no headset required.

```bash
npm run build      # type-check + production build to dist/
npm run typecheck  # types only
```

## Project layout

```
src/
  main.ts            # boot the World + build the arena
  config.ts          # play-space dimensions, pedestal slots, neon palette
  materials/glass.ts # glassmorphic material factory (+ cheap fallback, neon edges)
  arena/             # octagon geometry + arena builder
```

> **Note on scaffolding:** the usual `npm create @iwsdk@latest` pulls templates from a
> CDN that this environment's network policy blocks. The project is therefore wired up
> manually against the published `@iwsdk/core` package — same SDK, just hand-assembled.

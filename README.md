# Blasto

A **playful WebXR passthrough ball-battle**. Stand in your real room, grab toy
blasters off the pedestals around you, and lob **slow ping-pong balls** at a
cute cat opponent — then dodge theirs with your whole body. Soft, friendly and
easy to read: white, blue, pink and purple. Built on the **Immersive Web SDK
(IWSDK)** + Three.js.

> Pivoted from the earlier glassmorphic "Glasston" prototype — same dueling
> mechanics (slow projectiles, body dodging, weapon pedestals, AI opponent),
> reskinned into a cheerful, passthrough-first toy battle. Optional environments
> can be layered in later (see [yellkell/vrenv](https://github.com/yellkell/vrenv)).

See [`PLAN.md`](./PLAN.md) for the original phased build plan.

## How it plays

- **Passthrough first** — the game runs in an immersive-AR session, so the arena
  floats in your real room. No environment art required to start.
- A glowing **octagon ring** marks your dodge zone (the exact Blaston play-space
  dimensions); a low rail sits across the front to lean over.
- Grab a blaster off a **pedestal** (one per hand) — *Popper*, *Scatter* or
  *Lobber* — each firing slow, dodge-able ping-pong balls.
- A **cat duelist** across the room strafes, dodges and lobs balls back. First to
  win enough rounds takes the match.

## Quick start

```bash
npm install
npm run dev      # open the printed URL
```

- **On a headset** (e.g. Quest browser): you'll get an *Enter AR* offer and the
  arena appears in your room via passthrough.
- **On desktop**: IWSDK's dev plugin injects a WebXR emulator — fly the scene with
  WASD + mouse, no headset required.

```bash
npm run build      # type-check + production build to dist/
npm run typecheck  # types only
```

## Project layout

```
src/
  main.ts              # boot the World (immersive-AR passthrough) + build the arena
  config.ts            # play-space dimensions, pedestal slots, pastel palette
  materials/glass.ts   # glossy toy-plastic material factory (+ soft edges)
  arena/               # octagon boundary ring + arena builder (passthrough-friendly)
  combat/              # cat opponent, combatant setup, ping-pong ball spawner
  weapons/             # blaster archetypes + pedestals
  systems/             # ECS systems (projectiles, collision, AI, grab, HUD, FX)
  hud/                 # world-space pastel HUD
```

> **Note on scaffolding:** the usual `npm create @iwsdk@latest` pulls templates from a
> CDN that this environment's network policy blocks. The project is therefore wired up
> manually against the published `@iwsdk/core` package — same SDK, just hand-assembled.

/**
 * Glasston — entry point.
 *
 * Phase 0: boot an IWSDK World with a WebXR (immersive-vr) session offer.
 * Phase 1: build the glassmorphic-neon arena (octagon play space, rail,
 *          weapon pedestals, opponent platform).
 *
 * Run `npm run dev` and open the page: on a headset you'll get an "Enter VR"
 * offer; on desktop the IWSDK dev plugin provides a WebXR emulator (WASD + mouse).
 */

import { SessionMode, World } from '@iwsdk/core';
import { buildArena } from './arena/arena.js';
import { setupCombatants } from './combat/setup.js';
import { setupPedestals } from './weapons/setup.js';
import { ProjectileSystem } from './systems/ProjectileSystem.js';
import { GrabSystem } from './systems/GrabSystem.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { WeaponSpawnSystem } from './systems/WeaponSpawnSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { ScriptedShooterSystem } from './systems/ScriptedShooterSystem.js';
import { PlayerBodySystem } from './systems/PlayerBodySystem.js';

const container = document.getElementById('scene-container') as HTMLDivElement;

World.create(container, {
  // Offer an immersive-VR session as soon as the page is interacted with.
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: 'always',
  },
  // Blaston is a stationary dodge game: enable grabbing (weapons), keep
  // locomotion off (you stay on your pad), keep spatial UI on (HUD later).
  features: {
    grabbing: true,
    locomotion: false,
    spatialUI: true,
  },
  render: {
    defaultLighting: true, // gives glass an environment to refract; tuned dark in arena
    camera: { position: [0, 1.6, 0] },
  },
}).then((world) => {
  buildArena(world);
  setupCombatants(world);
  setupPedestals(world);

  // Phase 3b — solve the head-driven IK body first so hitboxes are current.
  world.registerSystem(PlayerBodySystem);
  // Phase 4 — keep pedestals stocked, handle grabbing, drive held weapons.
  world.registerSystem(WeaponSpawnSystem);
  world.registerSystem(GrabSystem);
  world.registerSystem(WeaponSystem);
  // Phase 2/3 — placeholder opponent fire + projectile motion + collision (last).
  world.registerSystem(ScriptedShooterSystem);
  world.registerSystem(ProjectileSystem);
  world.registerSystem(CollisionSystem);

  // eslint-disable-next-line no-console
  console.info('[Glasston] World ready — Phase 4 weapons, pedestals & dual-wield online.');
});

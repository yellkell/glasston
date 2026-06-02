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
import { setupEnvironment } from './arena/environment.js';
import { setupCombatants } from './combat/setup.js';
import { setupPedestals } from './weapons/setup.js';
import { FXSystem } from './systems/FXSystem.js';
import { ProjectileSystem } from './systems/ProjectileSystem.js';
import { GrabSystem } from './systems/GrabSystem.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { WeaponSpawnSystem } from './systems/WeaponSpawnSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { AISystem } from './systems/AISystem.js';
import { GameStateSystem } from './systems/GameStateSystem.js';
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
    // We supply our own dark-neon IBL + dome (see setupEnvironment), so the
    // default bright gradient is off.
    defaultLighting: false,
    camera: { position: [0, 1.6, 0] },
  },
}).then((world) => {
  setupEnvironment(world);
  buildArena(world);
  setupCombatants(world);
  setupPedestals(world);

  // Phase 3b — solve the head-driven IK body first so hitboxes are current.
  world.registerSystem(PlayerBodySystem);
  // Phase 4 — keep pedestals stocked, handle grabbing, drive held weapons.
  world.registerSystem(WeaponSpawnSystem);
  world.registerSystem(GrabSystem);
  world.registerSystem(WeaponSystem);
  // Phase 5 — AI opponent drives the duel; GameState runs rounds/scoring/HUD.
  world.registerSystem(AISystem);
  // Projectile motion then collision (collision last so it sees final positions).
  world.registerSystem(ProjectileSystem);
  world.registerSystem(CollisionSystem);
  world.registerSystem(GameStateSystem);
  // Phase 6 — animate transient FX and the ambient emissive pulse.
  world.registerSystem(FXSystem);

  // eslint-disable-next-line no-console
  console.info('[Glasston] World ready — Phase 6 styling, FX & glass polish online.');
});

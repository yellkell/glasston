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
import { ProjectileSystem } from './systems/ProjectileSystem.js';
import { WeaponFireSystem } from './systems/WeaponFireSystem.js';

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

  // Phase 2 — shooting core: pull a trigger to fire a slow glass orb from
  // either hand; ProjectileSystem moves and expires them.
  world.registerSystem(WeaponFireSystem);
  world.registerSystem(ProjectileSystem);

  // eslint-disable-next-line no-console
  console.info('[Glasston] World ready — Phase 2 shooting core online.');
});

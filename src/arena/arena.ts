/**
 * Builds the static arena: two octagonal platforms facing each other across a
 * gap, a curved glass front rail, and the dark neon lighting mood from the
 * reference screenshots. Weapon pedestals are spawned separately as entities
 * (see weapons/setup) since they carry gameplay state.
 *
 * These are plain Three.js objects parented under `world.scene` — static
 * set-dressing. Dynamic, interactive objects become ECS entities.
 */

import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  SpotLight,
  TorusGeometry,
  type Object3D,
} from 'three';
import type { World } from '@iwsdk/core';
import { ARENA_GAP, OCTAGON_HALF_WIDTH, OCTAGON_VERTICES, PALETTE } from '../config.js';
import { makeGlass, withNeonEdges } from '../materials/glass.js';
import { octagonSlab } from './octagon.js';

/** One octagonal platform: floor slab + curved front rail. */
function makePlatform(neon: number): Group {
  const platform = new Group();

  const slabGeo = octagonSlab(OCTAGON_VERTICES, 0.1);
  const slab = new Mesh(slabGeo, makeGlass({ color: PALETTE.glassTint, roughness: 0.18, thickness: 0.8 }));
  withNeonEdges(slab as Mesh & { geometry: typeof slabGeo }, neon);
  platform.add(slab);

  // Curved front rail the player leans over (a partial torus arc across the front).
  const railGeo = new TorusGeometry(OCTAGON_HALF_WIDTH * 0.95, 0.035, 16, 48, Math.PI);
  const rail = new Mesh(
    railGeo,
    new MeshStandardMaterial({ color: new Color(neon), emissive: new Color(neon), emissiveIntensity: 2 }),
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0, 0.95, -0.45);
  platform.add(rail);

  return platform;
}

export function buildArena(world: World): Object3D {
  const scene = world.scene;
  scene.background = new Color(PALETTE.background);

  const arena = new Group();
  arena.name = 'arena';

  // Player platform at the origin (where the XR rig stands).
  const playerPlatform = makePlatform(PALETTE.cyan);
  arena.add(playerPlatform);

  // Opponent platform across the gap, facing back toward the player.
  const opponentPlatform = makePlatform(PALETTE.magenta);
  opponentPlatform.position.set(0, 0, -ARENA_GAP);
  opponentPlatform.rotation.y = Math.PI;
  arena.add(opponentPlatform);

  // --- Neon lighting mood (dark room, magenta/cyan rim, spotlight cones) ---
  const cyanSpot = new SpotLight(PALETTE.cyan, 40, 12, Math.PI / 6, 0.4, 1.2);
  cyanSpot.position.set(-2, 4, 1);
  cyanSpot.target.position.set(0, 1, 0);
  arena.add(cyanSpot, cyanSpot.target);

  const magentaSpot = new SpotLight(PALETTE.magenta, 40, 16, Math.PI / 6, 0.4, 1.2);
  magentaSpot.position.set(2, 4, -ARENA_GAP - 1);
  magentaSpot.target.position.set(0, 1, -ARENA_GAP);
  arena.add(magentaSpot, magentaSpot.target);

  // Soft fill so glass has colour to refract even in the dark.
  arena.add(new PointLight(PALETTE.violet, 6, 14));

  scene.add(arena);
  return arena;
}

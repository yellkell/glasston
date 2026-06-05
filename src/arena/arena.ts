/**
 * Builds the static arena for passthrough Blasto. Because the player's real
 * room is the backdrop, we keep set-dressing minimal and floor-level:
 *  - a soft glowing octagon ring marking YOUR dodge zone on the real floor,
 *  - a matching octagon ring across the room for the cat opponent,
 *  - gentle, friendly fill light (no dark-room spotlights).
 *
 * Weapon pedestals are spawned separately as entities (see weapons/setup).
 *
 * These are plain Three.js objects parented under `world.scene` — static
 * set-dressing. Dynamic, interactive objects become ECS entities.
 */

import {
  BufferGeometry,
  Color,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  PointLight,
  Vector3,
  type Object3D,
} from 'three';
import type { World } from '@iwsdk/core';
import { ARENA_GAP, OCTAGON_VERTICES, PALETTE } from '../config.js';
import { createTitleBanner } from './banner.js';

/** A soft glowing outline of the octagon play space, laid flat on the floor. */
function makeOctagonRing(color: number): Line {
  const pts = OCTAGON_VERTICES.map(([x, z]) => new Vector3(x, 0.01, z));
  pts.push(pts[0].clone()); // close the loop
  const geo = new BufferGeometry().setFromPoints(pts);
  const ring = new Line(geo, new LineBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.85 }));
  ring.name = 'octagon-ring';
  return ring;
}

export function buildArena(world: World): Object3D {
  const scene = world.scene;

  const arena = new Group();
  arena.name = 'arena';

  // Your dodge zone marked on the real floor (BLASTO teal).
  arena.add(makeOctagonRing(PALETTE.teal));

  // The cat opponent's octagonal platform across the room — same shape as ours.
  const oppRing = makeOctagonRing(PALETTE.pink);
  oppRing.position.set(0, 0, -ARENA_GAP);
  oppRing.name = 'opponent-platform';
  arena.add(oppRing);

  // "Play BLASTO!" signage hung high behind the opponent.
  createTitleBanner(scene);

  // --- Friendly, even lighting (passthrough rooms are usually well lit) ---
  // Cool sky / warm pink bounce keeps the toy surfaces reading nicely.
  arena.add(new HemisphereLight(0xdfefff, 0xffd9ec, 1.4));
  // A soft purple key so the cat and blasters have a little form to them.
  const key = new PointLight(PALETTE.purple, 8, 16);
  key.position.set(0, 3, -ARENA_GAP / 2);
  arena.add(key);

  scene.add(arena);
  return arena;
}
